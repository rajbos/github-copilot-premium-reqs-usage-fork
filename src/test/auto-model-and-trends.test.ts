import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  getAutoModelUsageData,
  getUserWeeklyModelCounts,
  getUserTrendData,
  getDistinctMonths,
  isAutoModel,
} from '@/lib/utils'

const NEW_HEADERS = '"date","username","product","sku","model","quantity","unit_type","applied_cost_per_quantity","gross_amount","discount_amount","net_amount","total_monthly_quota","organization","repository","cost_center_name"'

function row(date: string, user: string, model: string, qty: string) {
  return `"${date}","${user}","copilot","copilot_ai_credit","${model}","${qty}","ai-credits","0.01","0.1","0","0.1","300","","",""`
}

describe('isAutoModel', () => {
  it('detects Auto: prefix case-insensitively', () => {
    expect(isAutoModel('Auto: Claude Haiku 4.5')).toBe(true)
    expect(isAutoModel('auto: GPT-4.1')).toBe(true)
    expect(isAutoModel('GPT-4.1')).toBe(false)
  })
})

describe('getAutoModelUsageData', () => {
  it('returns empty summary for no data', () => {
    const result = getAutoModelUsageData([])
    expect(result.hasAutoData).toBe(false)
    expect(result.daily).toEqual([])
  })

  it('splits auto vs specific requests per day with percentages', () => {
    const csv = `${NEW_HEADERS}\n${[
      row('2026-06-01', 'alice', 'Auto: Claude Haiku 4.5', '3'),
      row('2026-06-01', 'bob', 'GPT-4.1', '1'),
      row('2026-06-02', 'alice', 'GPT-4.1', '4'),
    ].join('\n')}`
    const result = getAutoModelUsageData(parseCSV(csv))

    expect(result.hasAutoData).toBe(true)
    expect(result.totalAuto).toBe(3)
    expect(result.totalSpecific).toBe(5)
    expect(result.autoPct).toBeCloseTo(37.5)

    expect(result.daily).toHaveLength(2)
    expect(result.daily[0].date).toBe('2026-06-01')
    expect(result.daily[0].autoPct).toBeCloseTo(75)
    expect(result.daily[1].autoPct).toBe(0)
    expect(result.daily[1].specificPct).toBe(100)
  })

  it('reports hasAutoData false when no Auto models present', () => {
    const csv = `${NEW_HEADERS}\n${row('2026-06-01', 'alice', 'GPT-4.1', '2')}`
    expect(getAutoModelUsageData(parseCSV(csv)).hasAutoData).toBe(false)
  })
})

describe('getUserWeeklyModelCounts', () => {
  it('counts distinct models per user per ISO week', () => {
    const csv = `${NEW_HEADERS}\n${[
      row('2026-06-01', 'alice', 'GPT-4.1', '1'), // Mon, W23
      row('2026-06-03', 'alice', 'Claude Sonnet 4', '1'), // same week
      row('2026-06-03', 'alice', 'GPT-4.1', '1'), // duplicate model, same week
      row('2026-06-08', 'alice', 'GPT-4.1', '1'), // next week W24
      row('2026-06-01', 'bob', 'GPT-4.1', '1'),
    ].join('\n')}`
    const result = getUserWeeklyModelCounts(parseCSV(csv))

    expect(result.weeks).toEqual(['2026-W23', '2026-W24'])
    expect(result.counts.get('alice')!.get('2026-W23')).toBe(2)
    expect(result.counts.get('alice')!.get('2026-W24')).toBe(1)
    expect(result.counts.get('bob')!.get('2026-W23')).toBe(1)
    expect(result.counts.get('bob')!.get('2026-W24')).toBeUndefined()
    expect(result.weekLabels['2026-W23']).toBeTruthy()
  })
})

describe('getUserTrendData', () => {
  const csv = `${NEW_HEADERS}\n${[
    row('2026-06-01', 'alice', 'GPT-4.1', '10'),
    row('2026-06-01', 'bob', 'GPT-4.1', '4'),
    row('2026-06-01', 'bob', 'Claude Sonnet 4', '2'),
    row('2026-06-08', 'alice', 'Auto: GPT-4.1', '20'),
  ].join('\n')}`
  const data = parseCSV(csv)

  it('returns weekly series for a single user', () => {
    const result = getUserTrendData(data, ['alice'])
    expect(result).toHaveLength(2)
    expect(result[0].weekKey).toBe('2026-W23')
    expect(result[0].requestsPerUser).toBe(10)
    expect(result[0].uniqueModelsPerUser).toBe(1)
    expect(result[0].activeUsers).toBe(1)
    expect(result[1].requestsPerUser).toBe(20)
  })

  it('averages across a cohort per week', () => {
    const result = getUserTrendData(data, ['alice', 'bob'])
    const w23 = result.find(p => p.weekKey === '2026-W23')!
    expect(w23.activeUsers).toBe(2)
    expect(w23.requestsPerUser).toBeCloseTo((10 + 6) / 2)
    expect(w23.uniqueModelsPerUser).toBeCloseTo((1 + 2) / 2)

    const w24 = result.find(p => p.weekKey === '2026-W24')!
    expect(w24.activeUsers).toBe(1)
    expect(w24.requestsPerUser).toBe(20)
  })

  it('returns empty for empty user list', () => {
    expect(getUserTrendData(data, [])).toEqual([])
  })
})

describe('getDistinctMonths', () => {
  it('returns sorted distinct months', () => {
    const csv = `${NEW_HEADERS}\n${[
      row('2026-06-01', 'alice', 'GPT-4.1', '1'),
      row('2026-05-15', 'alice', 'GPT-4.1', '1'),
      row('2026-06-20', 'bob', 'GPT-4.1', '1'),
    ].join('\n')}`
    expect(getDistinctMonths(parseCSV(csv))).toEqual(['2026-05', '2026-06'])
  })
})
