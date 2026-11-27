import { describe, expect, it } from "vitest";
import { formatAmount, formatDisplayDate, formatPercent, signedAmount } from "./format";

describe("formatAmount", () => {
  it("formats amounts without decimals and with separators", () => {
    expect(formatAmount(1234567.8)).toBe("1,234,568");
  });
});

describe("signedAmount", () => {
  it("signs amounts by type", () => {
    expect(signedAmount(1500, "Income")).toBe("+1,500");
    expect(signedAmount(1500, "Expense")).toBe("-1,500");
  });
});

describe("formatDisplayDate", () => {
  it("formats dates as dd MMM", () => {
    expect(formatDisplayDate("2026-10-05")).toBe("05 Oct");
  });
});

describe("formatPercent", () => {
  it("formats percentages with one decimal", () => {
    expect(formatPercent(0.12345)).toBe("12.3%");
  });
});
