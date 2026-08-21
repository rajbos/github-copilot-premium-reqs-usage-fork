import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/utils'

const BASE_HEADERS = '"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"'
const BASE_ROW = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited"'

describe('AIC field parsing', () => {
  it('should parse records without AIC fields without error', () => {
    const csv = `${BASE_HEADERS}\n${BASE_ROW}`
    const result = parseCSV(csv)
    expect(result).toHaveLength(1)
    expect(result[0].aicQuantity).toBeUndefined()
    expect(result[0].aicGrossAmount).toBeUndefined()
  })

  it('should not include AIC keys in records when columns are absent', () => {
    const csv = `${BASE_HEADERS}\n${BASE_ROW}`
    const result = parseCSV(csv)
    expect('aicQuantity' in result[0]).toBe(false)
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

  it('should omit AIC fields when cells are empty', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","",""'
    const result = parseCSV(`${headers}\n${row}`)
    expect('aicQuantity' in result[0]).toBe(false)
    expect('aicGrossAmount' in result[0]).toBe(false)
  })

  it('should omit AIC fields when cells contain non-numeric values', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","abc","$bad"'
    const result = parseCSV(`${headers}\n${row}`)
    expect('aicQuantity' in result[0]).toBe(false)
    expect('aicGrossAmount' in result[0]).toBe(false)
  })

  it('should parse zero values correctly', () => {
    const headers = `${BASE_HEADERS},"aic_quantity","aic_gross_amount"`
    const row = '"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited","0","0"'
    const result = parseCSV(`${headers}\n${row}`)
    expect(result[0].aicQuantity).toBe(0)
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
    expect('aicQuantity' in result[1]).toBe(false)
  })
})

