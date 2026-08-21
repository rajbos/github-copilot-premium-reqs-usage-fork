import { describe, it, expect } from 'vitest'
import {
  parseCSV,
  getTokenUsageData,
  getModelTokenStats,
  getUserTokenTotals,
  formatTokens,
} from '@/lib/utils'

const TOKEN_HEADERS = '"date","username","product","sku","model","quantity","unit_type","applied_cost_per_quantity","gross_amount","discount_amount","net_amount","total_monthly_quota","organization","repository","cost_center_name","input","output","cache_read","cache_write"'

function row(date: string, user: string, model: string, qty: string, input: string, output: string, cacheRead: string, cacheWrite: string) {
  return `"${date}","${user}","copilot","copilot_ai_credit","${model}","${qty}","ai-credits","0.01","0.1","0","0.1","300","","","","${input}","${output}","${cacheRead}","${cacheWrite}"`
}

const CSV = `${TOKEN_HEADERS}\n${[
  row('2026-06-01', 'alice', 'GPT-4.1', '2', '1000', '200', '3000', '100'),
  row('2026-06-01', 'bob', 'GPT-4.1', '1', '500', '100', '1500', '50'),
  row('2026-06-02', 'alice', 'Claude Sonnet 4', '1', '2000', '400', '0', '0'),
].join('\n')}`

describe('token column parsing', () => {
  it('parses input/output/cache_read/cache_write columns', () => {
    const result = parseCSV(CSV)
    expect(result[0].inputTokens).toBe(1000)
    expect(result[0].outputTokens).toBe(200)
    expect(result[0].cacheReadTokens).toBe(3000)
    expect(result[0].cacheWriteTokens).toBe(100)
  })

  it('omits token fields when columns are absent', () => {
    const csv = '"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"\n"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited"'
    const result = parseCSV(csv)
    expect('inputTokens' in result[0]).toBe(false)
    expect('outputTokens' in result[0]).toBe(false)
  })
})

describe('getTokenUsageData', () => {
  it('returns empty summary when no token fields present', () => {
    const csv = '"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"\n"2025-06-11T05:13:27.8766440Z","alice","gpt-4.1","1","False","Unlimited"'
    expect(getTokenUsageData(parseCSV(csv)).hasTokenData).toBe(false)
  })

  it('aggregates per day and computes cache hit rate', () => {
    const result = getTokenUsageData(parseCSV(CSV))
    expect(result.hasTokenData).toBe(true)
    expect(result.daily).toHaveLength(2)

    const day1 = result.daily[0]
    expect(day1.input).toBe(1500)
    expect(day1.output).toBe(300)
    expect(day1.cacheRead).toBe(4500)
    expect(day1.cacheWrite).toBe(150)
    // 4500 / (1500 + 4500) = 75%
    expect(day1.cacheHitRate).toBeCloseTo(75)

    expect(result.totalInput).toBe(3500)
    expect(result.totalCacheRead).toBe(4500)
    // overall: 4500 / (3500 + 4500) = 56.25%
    expect(result.overallCacheHitRate).toBeCloseTo(56.25)
  })
})

describe('getModelTokenStats', () => {
  it('computes per-model totals, ratio and tokens per request', () => {
    const stats = getModelTokenStats(parseCSV(CSV))
    expect(stats).toHaveLength(2)

    const gpt = stats.find(s => s.model === 'GPT-4.1')!
    expect(gpt.requests).toBe(3)
    expect(gpt.input).toBe(1500)
    expect(gpt.output).toBe(300)
    expect(gpt.outputInputRatio).toBeCloseTo(0.2)
    // (1500+300+4500+150) / 3 = 2150
    expect(gpt.tokensPerRequest).toBeCloseTo(2150)

    const claude = stats.find(s => s.model === 'Claude Sonnet 4')!
    expect(claude.cacheRead).toBe(0)
    expect(claude.outputInputRatio).toBeCloseTo(0.2)
  })
})

describe('getUserTokenTotals', () => {
  it('sums tokens per user', () => {
    const totals = getUserTokenTotals(parseCSV(CSV))
    expect(totals.get('alice')).toEqual({ input: 3000, output: 600, cacheRead: 3000, cacheWrite: 100 })
    expect(totals.get('bob')).toEqual({ input: 500, output: 100, cacheRead: 1500, cacheWrite: 50 })
  })
})

describe('formatTokens', () => {
  it('formats magnitudes', () => {
    expect(formatTokens(500)).toBe('500')
    expect(formatTokens(1500)).toBe('1.5K')
    expect(formatTokens(2_300_000)).toBe('2.3M')
    expect(formatTokens(1_200_000_000)).toBe('1.2B')
  })
})
