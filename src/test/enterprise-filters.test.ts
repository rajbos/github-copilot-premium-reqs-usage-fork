import { beforeEach, describe, expect, it } from "vitest";
import { COPILOT_PLANS, filterDataByMonth, getUniqueUsersExceedingQuota, parseCSV } from "@/lib/utils";
import {
  EMPTY_LISTS, PROFILE_KEY, exportUsernameCSV, filterUserViews, listsKey,
  parseUsernameCSV, readProfiles, readUserLists, summarizeUsage,
} from "@/lib/enterprise-filters";

const csv = `"date","username","model","quantity","total_monthly_quota","aic_quantity"
"2026-06-01","Alice","gpt-4","120","100","20"
"2026-06-02","Bob","gpt-4","40","100","10"
"2026-06-03","Charlie","gpt-4","30","100","5"
"2026-07-01","Alice","gpt-4","4","100","2"
"2026-07-02","Bob","gpt-4","200","100","50"`;
const rows = parseCSV(csv);

beforeEach(() => localStorage.clear());

describe("enterprise cohorts and exclusions", () => {
  it("exclusions win over cohort, search, baseline and comparison", () => {
    const lists = { cohort: ["alice", "BOB", "missing"], excluded: ["bob"] };
    const { baseline, cohort, display } = filterUserViews(filterDataByMonth(rows, "2026-06"), lists, null);
    expect(baseline.map(row => row.user)).toEqual(["Alice", "Charlie"]);
    expect(cohort.map(row => row.user)).toEqual(["Alice"]);
    expect(display).toEqual(cohort);
    expect(summarizeUsage(baseline)).toEqual({ requests: 150, aic: 25, users: 2 });
    expect(summarizeUsage(cohort)).toEqual({ requests: 120, aic: 20, users: 1 });
    expect(filterUserViews(rows, lists, "Bob").display).toEqual([]);
    expect(filterUserViews(rows, lists, "Charlie").display.map(row => row.user)).toEqual(["Charlie"]);
    expect(filterUserViews(rows, { ...lists, cohort: [] }, null).display).toEqual(
      filterUserViews(rows, { ...lists, cohort: [] }, null).baseline,
    );
  });

  it("recomputes month and plan calculations from the selected view", () => {
    const lists = { cohort: ["alice"], excluded: ["bob"] };
    const june = filterUserViews(filterDataByMonth(rows, "2026-06"), lists, null);
    const july = filterUserViews(filterDataByMonth(rows, "2026-07"), lists, null);
    expect(summarizeUsage(june.display).requests).toBe(120);
    expect(summarizeUsage(july.display).requests).toBe(4);
    expect(getUniqueUsersExceedingQuota(june.display, COPILOT_PLANS.INDIVIDUAL)).toBe(1);
    expect(getUniqueUsersExceedingQuota(june.display, COPILOT_PLANS.ENTERPRISE)).toBe(0);
    expect(getUniqueUsersExceedingQuota(july.display, COPILOT_PLANS.INDIVIDUAL)).toBe(0);
    expect(july.baseline.every(row => row.user !== "Bob")).toBe(true);
  });

  it("isolates profile keys and rehydrates only the explicitly selected profile", () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify([
      { id: "enterprise-a", name: "Enterprise A" },
      { id: "enterprise-b", name: "Enterprise B" },
    ]));
    localStorage.setItem(listsKey("enterprise-a"), JSON.stringify({ cohort: ["Alice"], excluded: ["Bob"] }));
    localStorage.setItem(listsKey("enterprise-b"), JSON.stringify({ cohort: ["Charlie"], excluded: [] }));
    expect(readProfiles(localStorage)).toHaveLength(2);
    expect(readUserLists(localStorage, "enterprise-a")).toEqual({ cohort: ["alice"], excluded: ["bob"] });
    expect(readUserLists(localStorage, "enterprise-b")).toEqual({ cohort: ["charlie"], excluded: [] });
    expect(readUserLists(localStorage, "new-enterprise")).toEqual(EMPTY_LISTS);
    expect(filterUserViews(rows, readUserLists(localStorage, "enterprise-b"), null).display
      .every(row => row.user === "Charlie")).toBe(true);
  });

  it("reports corrupted saved profiles and lists instead of applying them", () => {
    localStorage.setItem(PROFILE_KEY, "{broken");
    expect(() => readProfiles(localStorage)).toThrow();
    localStorage.setItem(listsKey("enterprise-a"), '{"cohort":["alice"],"excluded":"bob"}');
    expect(() => readUserLists(localStorage, "enterprise-a")).toThrow(/invalid/);
  });
});

describe("username CSV", () => {
  it("roundtrips quoted, duplicate, case-insensitive usernames and BOM", () => {
    const input = '\uFEFFusername\r\n"Alice"\r\n"alice"\r\n"Bob"\r\n';
    expect(parseUsernameCSV(input)).toEqual(["alice", "bob"]);
    expect(parseUsernameCSV(exportUsernameCSV(parseUsernameCSV(input)))).toEqual(["alice", "bob"]);
    expect(parseUsernameCSV("username\n")).toEqual([]);
  });

  it.each([
    ["", /empty/],
    ["user\nalice", /username/],
    ["username,role\nalice,admin", /username/],
    ["username\n", null],
    ["username\nalice,bob", /row 2/],
    ['username\n"alice', /unclosed/],
    ['username\n"alice"x', /quote/],
    ["username\n\n", /row 2/],
  ])("validates malformed CSV %j", (input, error) => {
    if (error) expect(() => parseUsernameCSV(input)).toThrow(error);
    else expect(parseUsernameCSV(input)).toEqual([]);
  });
});
