import { describe, expect, it } from "vitest";

import { formatDate } from "#/lib/utils";

describe("formatDate", () => {
  it("returns YYYY-MM-DD for single-digit month/day", () => {
    expect(formatDate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("returns YYYY-MM-DD for double-digit month/day", () => {
    expect(formatDate(new Date(2026, 10, 23))).toBe("2026-11-23");
  });
});
