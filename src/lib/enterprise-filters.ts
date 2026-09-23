import type { CopilotUsageData } from "./utils";

export interface EnterpriseProfile {
  id: string;
  name: string;
}

export interface UserLists {
  cohort: string[];
  excluded: string[];
}

export const EMPTY_LISTS: UserLists = { cohort: [], excluded: [] };
export const PROFILE_KEY = "copilot-enterprise-profiles-v1";
export const listsKey = (id: string) => `copilot-enterprise-lists-v1:${id}`;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function uniqueUsernames(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeUsername).filter(Boolean))).sort();
}

export function readProfiles(storage: Storage): EnterpriseProfile[] {
  const stored = storage.getItem(PROFILE_KEY);
  if (stored === null) return [];
  const value: unknown = JSON.parse(stored);
  if (!Array.isArray(value) || !value.every(profile =>
    profile && typeof profile === "object" &&
    typeof profile.id === "string" && profile.id.length > 0 &&
    typeof profile.name === "string" && profile.name.trim().length > 0
  ) || new Set(value.map(profile => profile.id)).size !== value.length) {
    throw new Error("Saved enterprise profiles are invalid. Clear the damaged profiles to start again.");
  }
  return value as EnterpriseProfile[];
}

export function readUserLists(storage: Storage, id: string): UserLists {
  const stored = storage.getItem(listsKey(id));
  if (stored === null) return EMPTY_LISTS;
  const value: unknown = JSON.parse(stored);
  if (!value || typeof value !== "object" ||
    !("cohort" in value) || !("excluded" in value) ||
    !Array.isArray(value.cohort) || !Array.isArray(value.excluded) ||
    ![...value.cohort, ...value.excluded].every(user => typeof user === "string" && user.trim().length > 0)) {
    throw new Error("Saved user lists are invalid. Reset this enterprise's lists before editing.");
  }
  return {
    cohort: uniqueUsernames(value.cohort),
    excluded: uniqueUsernames(value.excluded),
  };
}

export function filterUserViews(
  rows: CopilotUsageData[],
  lists: UserLists,
  selectedUser: string | null,
): { baseline: CopilotUsageData[]; cohort: CopilotUsageData[]; display: CopilotUsageData[] } {
  const excluded = new Set(lists.excluded.map(normalizeUsername));
  const selected = new Set(lists.cohort.map(normalizeUsername));
  const baseline = rows.filter(row => !excluded.has(normalizeUsername(row.user)));
  const cohort = baseline.filter(row => selected.has(normalizeUsername(row.user)));
  const display = selectedUser
    ? baseline.filter(row => normalizeUsername(row.user) === normalizeUsername(selectedUser))
    : selected.size ? cohort : baseline;
  return { baseline, cohort, display };
}

export function summarizeUsage(rows: CopilotUsageData[]) {
  return {
    requests: rows.reduce((sum, row) => sum + row.requestsUsed, 0),
    aic: rows.reduce((sum, row) => sum + (row.aicQuantity ?? 0), 0),
    users: new Set(rows.map(row => normalizeUsername(row.user))).size,
  };
}

// CSV exports are deliberately a single username column; billing CSVs have a different schema.
export function parseUsernameCSV(csv: string): string[] {
  const text = csv.replace(/^\uFEFF/, "");
  if (!text.trim() || text.includes("\0")) throw new Error("Username CSV is empty or binary.");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      }
      else field += char;
    } else if (char === '"') {
      if (field || closed) throw new Error(`Invalid quote on CSV row ${rows.length + 1}.`);
      quoted = true;
    } else if (char === ",") {
      row.push(field.trim());
      field = "";
      closed = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
      closed = false;
    } else {
      if (closed) throw new Error(`Unexpected text after quote on CSV row ${rows.length + 1}.`);
      field += char;
    }
  }
  if (quoted) throw new Error("Username CSV has an unclosed quoted field.");
  if (field || row.length || closed) rows.push([...row, field.trim()]);
  if (rows[0]?.length !== 1 || rows[0][0].toLowerCase() !== "username") {
    throw new Error('Username CSV must start with a single "username" column.');
  }
  for (const [index, columns] of rows.slice(1).entries()) {
    if (columns.length !== 1 || !columns[0] || /[\r\n]/.test(columns[0])) {
      throw new Error(`Invalid username on CSV row ${index + 2}; expected one nonempty username.`);
    }
  }
  return uniqueUsernames(rows.slice(1).map(columns => columns[0]));
}

export function exportUsernameCSV(users: string[]): string {
  return `username\r\n${uniqueUsernames(users).map(user => `"${user.replace(/"/g, '""')}"\r\n`).join("")}`;
}
