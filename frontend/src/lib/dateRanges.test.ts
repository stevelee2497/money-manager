import { describe, expect, it } from "vitest";
import { DATE_RANGE, mergeDateRanges, resolveDateRange } from "./dateRanges";

const TODAY = new Date(2026, 9, 10);
const NO_CUSTOM = { from: null, to: null };

describe("resolveDateRange", () => {
  it("resolves this month, last month and this year", () => {
    expect(resolveDateRange(DATE_RANGE.thisMonth, TODAY)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(resolveDateRange(DATE_RANGE.lastMonth, TODAY)).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolveDateRange(DATE_RANGE.lastThreeMonths, TODAY)).toEqual({ from: "2026-08-01", to: "2026-10-31" });
    expect(resolveDateRange(DATE_RANGE.thisYear, TODAY)).toEqual({ from: "2026-01-01", to: "2026-12-31" });
  });

  it("is unbounded for All", () => {
    expect(resolveDateRange(DATE_RANGE.all, TODAY)).toEqual(NO_CUSTOM);
  });
});

describe("mergeDateRanges", () => {
  it("merges several ranges into the covering span", () => {
    expect(mergeDateRanges([DATE_RANGE.thisMonth, DATE_RANGE.lastMonth], NO_CUSTOM, TODAY)).toEqual({ from: "2026-09-01", to: "2026-10-31" });
  });

  it("stays unbounded when any selected range is unbounded", () => {
    expect(mergeDateRanges([DATE_RANGE.thisMonth, DATE_RANGE.all], NO_CUSTOM, TODAY)).toEqual(NO_CUSTOM);
  });

  it("uses the custom range for Custom", () => {
    expect(mergeDateRanges([DATE_RANGE.custom], { from: "2026-02-01", to: "2026-02-28" }, TODAY)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  });

  it("is unbounded with nothing selected", () => {
    expect(mergeDateRanges([], NO_CUSTOM, TODAY)).toEqual(NO_CUSTOM);
  });
});
