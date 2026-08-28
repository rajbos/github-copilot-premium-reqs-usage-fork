import { describe, it, expect } from 'vitest'
import { parseCSV, getModelUsageSummary } from '@/lib/utils'

const BASE_HEADERS = '"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"'
const BASE_ROW = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited"'

describe('AIC field parsing', () => {
  it('should parse records without AIC fields without error', () => {
    const csv = `${BASE_HEADERS}\n${BASE_ROW}`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].aicQuantity).toBe(1)
    expect(result[0].aicGrossAmount).toBeUndefined()
  })

  it('should fall back to requestsUsed when aic_quantity column is absent', () => {
    const csv = `${BASE_HEADERS}\n${BASE_ROW}`
    const result = parseCSV(csv)
    expect(result[0].aicQuantity).toBe(result[0].requestsUsed)
    expect('aicGrossAmount' in result[0]).toBe(false)
  })

  it('should parse aic_quantity and aic_gross_amount when present', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","5","0.0025"'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(5)
    expect(result[0].aicGrossAmount).toBeCloseTo(0.0025)
  })

  it('should be case-insensitive for AIC headers', () => {
    const headers = `${BASE_HEADERS},"AIC_QUANTITY","AIC_GROSS_AMOUNT"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","10","0.005"'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(10)
    expect(result[0].aicGrossAmount).toBeCloseTo(0.005)
  })

  it('should fall back to requestsUsed when aic_quantity cells are empty', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","",""'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(1)
    expect('aicGrossAmount' in result[0]).toBe(false)
  })

  it('should fall back to requestsUsed when aic_quantity cells contain non-numeric values', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","abc","$bad"'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(1)
    expect('aicGrossAmount' in result[0]).toBe(false)
  })

  it('should fall back to requestsUsed when aic_quantity cells are zero (real export shape)', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","0","0"'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(1)
    expect(result[0].aicGrossAmount).toBe(0)
  })

  it('should parse mixed rows where some have AIC data and some do not', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const rows = [
      '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","5","0.0025"',
      '"2025-06-11T06:00:00.0000000Z","bob","gpt-4.1","1","False","Unlimited","",""',
    ]
    const result = parseCSV(`${headers}\n${rows.join('\n')}`)
    expect(result[0].aicQuantity).toBe(5)
    expect(result[1].aicQuantity).toBe(1)
  })
})

describe('Included/overage AIC aggregation', () => {
  const NEW_HEADERS = '"date","username","product","sku","model","quantity","unit_type","applied_cost_per_quantity","gross_amount","discount_amount","net_amount","total_monthly_quota","organization","repository","cost_center_name"'
  const row = (model: string, qty: string, net: string) =>
    `"2025-06-11T05:13:27.8766440Z","alice","Copilot","premium","${model}","${qty}","requests","0.04","0","0","${net}","300","org","",""`

  it('should split AIC into included (net 0) and overage (net > 0) per model', () => {
    const csv = `${NEW_HEADERS}\n${[
      row('gpt-4.1', '10', '0'),
      row('gpt-4.1', '4', '0.16'),
      row('claude-3.5', '2', '0'),
    ].join('\n')}`
    const summary = getModelUsageSummary(parseCSV(csv))
    const gpt = summary.find(s => s.model === 'gpt-4.1')!
    expect(gpt.includedAic).toBe(10)
    expect(gpt.overageAic).toBe(4)
    expect(gpt.aicQuantity).toBe(14)
    const claude = summary.find(s => s.model === 'claude-3.5')!
    expect(claude.includedAic).toBe(2)
    expect(claude.overageAic).toBe(0)
  })

  it('should treat rows without net_amount as included', () => {
    const csv = `${BASE_HEADERS}\n${BASE_ROW}`
    const summary = getModelUsageSummary(parseCSV(csv))
    expect(summary[0].includedAic).toBe(1)
    expect(summary[0].overageAic).toBe(0)
  })

  it('should aggregate non-zero AIC for real exports where aic_quantity is zero-filled', () => {
    const REAL_HEADERS = '"date","username","product","sku","model","quantity","unit_type","applied_cost_per_quantity","gross_amount","discount_amount","net_amount","total_monthly_quota","organization","repository","cost_center_name","aic_quantity","aic_gross_amount"'
    const rows = [
      '"2026-06-01","alice","copilot","copilot_ai_credit","Auto: Claude Haiku 4.5","19.678995","ai-credits","0.01","0.19678995","0.19678995","0","3900","org","","","0","0"',
      '"2026-06-01","alice","copilot","copilot_ai_credit","gpt-4.1","4","ai-credits","0.04","0.16","0","0.16","3900","org","","","0","0"',
    ]
    const summary = getModelUsageSummary(parseCSV(`${REAL_HEADERS}\n${rows.join('\n')}`))
    const auto = summary.find(s => s.model === 'Auto: Claude Haiku 4.5')!
    expect(auto.aicQuantity).toBeCloseTo(19.678995)
    expect(auto.includedAic).toBeCloseTo(19.678995)
    expect(auto.overageAic).toBe(0)
    const gpt = summary.find(s => s.model === 'gpt-4.1')!
    expect(gpt.aicQuantity).toBe(4)
    expect(gpt.includedAic).toBe(0)
    expect(gpt.overageAic).toBe(4)
  })

  it('should parse a CSV prefixed with a UTF-8 BOM', () => {
    const csv = `﻿${BASE_HEADERS}\n${BASE_ROW}`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].aicQuantity).toBe(1)
  })
})

