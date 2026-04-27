import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatPayType,
  formatRejectedVoucherDescription,
  getTodayDateKey,
  getVoucherStatus,
  isRejectedVoucherDescription,
  normalizeDateKey,
  REJECTED_NOTE_PREFIX,
} from "#/lib/voucher";

describe("voucher helpers", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  describe("normalizeDateKey", () => {
    it("returns a date prefix from an ISO-like string", () => {
      expect(normalizeDateKey(" 2026-04-27T08:30:00.000Z ")).toBe("2026-04-27");
    });

    it("returns null for unsupported input", () => {
      expect(normalizeDateKey({ when: "tomorrow" })).toBeNull();
      expect(normalizeDateKey(undefined)).toBeNull();
      expect(normalizeDateKey("")).toBeNull();
    });
  });

  it("gets today's date key from system time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-27T12:00:00.000Z"));

    expect(getTodayDateKey()).toBe("2026-04-27");
  });

  describe("rejected voucher parsing", () => {
    it("detects rejected note prefix", () => {
      expect(isRejectedVoucherDescription("[REJECTED] failed transfer")).toBe(true);
      expect(isRejectedVoucherDescription("not rejected")).toBe(false);
    });

    it("formats rejected notes with previous description context", () => {
      const nowIso = "2026-04-27T10:00:00.000Z";
      expect(formatRejectedVoucherDescription("old note", nowIso)).toBe(
        `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowIso}. Previous note: old note`,
      );
      expect(formatRejectedVoucherDescription("", nowIso)).toBe(
        `${REJECTED_NOTE_PREFIX} Payment was rejected at ${nowIso}.`,
      );
    });
  });

  describe("getVoucherStatus", () => {
    it("returns rejected when description has rejected prefix", () => {
      expect(
        getVoucherStatus({
          paymentDate: "2026-04-30",
          description: "[REJECTED] ACH failed",
          todayKey: "2026-04-27",
        }),
      ).toBe("rejected");
    });

    it("returns pending for future payment date", () => {
      expect(
        getVoucherStatus({
          paymentDate: "2026-04-30",
          description: "scheduled",
          todayKey: "2026-04-27",
        }),
      ).toBe("pending");
    });

    it("returns processed for past or invalid payment date", () => {
      expect(
        getVoucherStatus({
          paymentDate: "2026-04-01",
          description: "completed",
          todayKey: "2026-04-27",
        }),
      ).toBe("processed");

      expect(
        getVoucherStatus({
          paymentDate: "not-a-date",
          description: "completed",
          todayKey: "2026-04-27",
        }),
      ).toBe("processed");
    });
  });

  describe("formatPayType", () => {
    it("formats snake_case values for UI display", () => {
      expect(formatPayType("credit_card")).toBe("Credit Card");
      expect(formatPayType(42)).toBe("42");
      expect(formatPayType(null)).toBe("");
    });
  });
});
