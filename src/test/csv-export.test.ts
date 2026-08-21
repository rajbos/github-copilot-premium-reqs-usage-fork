import { describe, it, expect } from 'vitest'
import {
  splitCsvByMonth,
  getFileIdentifier,
  buildExportFileName,
  getExportFilesForUploadedCsv,
  FALLBACK_FILE_PREFIX,
} from '@/lib/csv-export'

describe('csv-export', () => {
  describe('getFileIdentifier', () => {
    it('uses organization column when present', () => {
      const csv = `"date","username","organization","cost_center_name"
"2026-06-01","user1","my-org","cc-1"`
      expect(getFileIdentifier(csv)).toBe('my-org')
    })

    it('falls back to cost_center_name when organization is empty', () => {
      const csv = `"date","username","organization","cost_center_name"
"2026-06-01","user1","","cc-1"`
      expect(getFileIdentifier(csv)).toBe('cc-1')
    })

    it('falls back to generic prefix when neither organization nor cost_center_name exist', () => {
      const csv = `"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"
"2024-01-01T00:00:00Z","user1","gpt-4","1.5","false","100"`
      expect(getFileIdentifier(csv)).toBe(FALLBACK_FILE_PREFIX)
    })

    it('falls back to generic prefix when both columns are empty', () => {
      const csv = `"date","username","organization","cost_center_name"
"2026-06-01","user1","",""`
      expect(getFileIdentifier(csv)).toBe(FALLBACK_FILE_PREFIX)
    })
  })

  describe('splitCsvByMonth', () => {
    it('splits rows into groups by month, preserving header', () => {
      const csv = `"date","username","organization"
"2026-06-01","user1","my-org"
"2026-06-15","user2","my-org"
"2026-07-01","user3","my-org"`
      const parts = splitCsvByMonth(csv)
      expect(parts).toHaveLength(2)
      expect(parts[0].month).toBe('202606')
      expect(parts[0].content).toContain('"date","username","organization"')
      expect(parts[0].content.split('\n')).toHaveLength(3) // header + 2 rows
      expect(parts[1].month).toBe('202607')
      expect(parts[1].content.split('\n')).toHaveLength(2) // header + 1 row
    })

    it('returns a single part when all rows are in the same month', () => {
      const csv = `"Timestamp","User","Model","Requests Used","Exceeds Monthly Quota","Total Monthly Quota"
"2024-01-01T00:00:00Z","user1","gpt-4","1.5","false","100"
"2024-01-15T00:00:00Z","user2","gpt-4","2","false","100"`
      const parts = splitCsvByMonth(csv)
      expect(parts).toHaveLength(1)
      expect(parts[0].month).toBe('202401')
    })

    it('returns empty array when there is no date-like column', () => {
      const csv = `"foo","bar"
"1","2"`
      expect(splitCsvByMonth(csv)).toEqual([])
    })

    it('returns empty array for header-only CSV', () => {
      const csv = `"date","username"`
      expect(splitCsvByMonth(csv)).toEqual([])
    })

    it('skips rows with unparsable dates', () => {
      const csv = `"date","username"
"not-a-date","user1"
"2026-06-01","user2"`
      const parts = splitCsvByMonth(csv)
      expect(parts).toHaveLength(1)
      expect(parts[0].content.split('\n')).toHaveLength(2) // header + 1 valid row
    })
  })

  describe('buildExportFileName', () => {
    it('builds a sanitized file name', () => {
      expect(buildExportFileName('my-org', '202606')).toBe('my-org-202606.csv')
    })

    it('sanitizes special characters in the identifier', () => {
      expect(buildExportFileName('My Org / Team!', '202606')).toBe('My-Org-Team-202606.csv')
    })

    it('falls back when identifier sanitizes to empty', () => {
      expect(buildExportFileName('***', '202606')).toBe(`${FALLBACK_FILE_PREFIX}-202606.csv`)
    })
  })

  describe('getExportFilesForUploadedCsv', () => {
    it('produces one file per month with sensible names', () => {
      const csv = `"date","username","organization"
"2026-06-01","user1","liantisit-common"
"2026-07-05","user2","liantisit-common"`
      const files = getExportFilesForUploadedCsv(csv)
      expect(files).toHaveLength(2)
      expect(files.map(f => f.fileName)).toEqual([
        'liantisit-common-202606.csv',
        'liantisit-common-202607.csv',
      ])
    })

    it('produces empty list for CSVs without a date column', () => {
      const csv = `"foo","bar"
"1","2"`
      expect(getExportFilesForUploadedCsv(csv)).toEqual([])
    })
  })
})
