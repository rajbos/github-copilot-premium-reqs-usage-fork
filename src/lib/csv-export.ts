/**
 * Utilities for re-exporting uploaded CSV files with sensible file names.
 *
 * Background: the CSV formats supported by this app (see `parseCSV` in `utils.ts`)
 * do NOT contain an "enterprise" column. The only organization-level identifiers
 * available are `organization` (new format) and `cost_center_name` (new format).
 * The legacy format has neither. We therefore pick the best available identifier
 * per file, in this priority order: organization > cost_center_name > a generic
 * fallback prefix ("copilot-usage").
 *
 * Each uploaded file is split into one CSV per calendar month found in its data
 * (using the same date/timestamp column the file already has), preserving the
 * original header and raw row text exactly as uploaded. This keeps the export
 * simple: no re-serialization of parsed values, just filtering of original lines.
 */

/** Splits a raw CSV line into its comma-separated fields, honoring quoted fields. */
function splitCsvLine(line: string): string[] {
  const matches = line.match(/("([^"]*)"|([^,]*))(,|$)/g);
  if (!matches) return [];
  return matches.map(m => {
    let processed = m.endsWith(',') ? m.slice(0, -1) : m;
    processed = processed.replace(/^"(.*)"$/, '$1');
    return processed.trim();
  });
}

const DATE_HEADER_CANDIDATES = ['date', 'timestamp'];
const ORG_HEADER_CANDIDATES = ['organization'];
const COST_CENTER_HEADER_CANDIDATES = ['cost_center_name'];

export const FALLBACK_FILE_PREFIX = 'copilot-usage';

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

export interface CsvMonthPart {
  /** Month in YYYYMM format, e.g. "202506" */
  month: string;
  /** Full CSV content for this month, including the original header row */
  content: string;
}

/**
 * Splits raw CSV content into one part per calendar month present in the data,
 * based on the file's date/timestamp column. The original header and row text
 * are preserved unchanged. Rows with an unparsable date are skipped.
 */
export function splitCsvByMonth(csvContent: string): CsvMonthPart[] {
  const lines = csvContent.split(/\r?\n/);
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  if (nonEmptyLines.length < 2) return [];

  const headerLine = nonEmptyLines[0];
  const headers = splitCsvLine(headerLine);
  const dateIdx = findHeaderIndex(headers, DATE_HEADER_CANDIDATES);
  if (dateIdx === -1) return [];

  const rowsByMonth = new Map<string, string[]>();

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    const fields = splitCsvLine(line);
    const dateStr = fields[dateIdx];
    if (!dateStr) continue;
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) continue;

    const month = `${parsed.getFullYear()}${String(parsed.getMonth() + 1).padStart(2, '0')}`;
    if (!rowsByMonth.has(month)) rowsByMonth.set(month, []);
    rowsByMonth.get(month)!.push(line);
  }

  return Array.from(rowsByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, rows]) => ({
      month,
      content: [headerLine, ...rows].join('\n'),
    }));
}

/**
 * Determines the best available identifier for a CSV file's naming prefix.
 * Priority: organization column value > cost_center_name column value > fallback.
 * Returns the first non-empty value found across data rows for the preferred column.
 */
export function getFileIdentifier(csvContent: string): string {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) return FALLBACK_FILE_PREFIX;

  const headers = splitCsvLine(lines[0]);
  const orgIdx = findHeaderIndex(headers, ORG_HEADER_CANDIDATES);
  const costCenterIdx = findHeaderIndex(headers, COST_CENTER_HEADER_CANDIDATES);

  const firstNonEmptyValue = (idx: number): string | undefined => {
    if (idx === -1) return undefined;
    for (let i = 1; i < lines.length; i++) {
      const fields = splitCsvLine(lines[i]);
      const value = fields[idx]?.trim();
      if (value) return value;
    }
    return undefined;
  };

  return firstNonEmptyValue(orgIdx) ?? firstNonEmptyValue(costCenterIdx) ?? FALLBACK_FILE_PREFIX;
}

/** Sanitizes a string for safe use in a file name. */
function sanitizeForFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || FALLBACK_FILE_PREFIX;
}

export function buildExportFileName(identifier: string, month: string): string {
  return `${sanitizeForFileName(identifier)}-${month}.csv`;
}

export interface ExportedCsvFile {
  fileName: string;
  content: string;
}

/**
 * Given the raw content of one originally uploaded CSV file, produces the list
 * of export files: one per calendar month present in the data, named
 * `<identifier>-YYYYMM.csv`.
 */
export function getExportFilesForUploadedCsv(csvContent: string): ExportedCsvFile[] {
  const identifier = getFileIdentifier(csvContent);
  const monthParts = splitCsvByMonth(csvContent);
  return monthParts.map(part => ({
    fileName: buildExportFileName(identifier, part.month),
    content: part.content,
  }));
}
