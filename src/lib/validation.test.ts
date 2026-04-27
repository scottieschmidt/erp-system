import { describe, expect, it } from "vitest";
import * as v from "valibot";

import { IntStrSchema, MoneySchema, NumStrSchema, PasswordSchema } from "#/lib/validation";

describe("validation schemas", () => {
  describe("IntStrSchema", () => {
    it("parses integer string into number", () => {
      expect(v.parse(IntStrSchema, "42")).toBe(42);
    });

    it("rejects decimal strings", () => {
      const result = v.safeParse(IntStrSchema, "12.5");
      expect(result.success).toBe(false);
    });
  });

  describe("NumStrSchema", () => {
    it("parses decimal strings into number", () => {
      expect(v.parse(NumStrSchema, "12.5")).toBe(12.5);
    });

    it("rejects empty input", () => {
      const result = v.safeParse(NumStrSchema, "");
      expect(result.success).toBe(false);
    });
  });

  describe("MoneySchema", () => {
    it("accepts values with up to two decimal places", () => {
      expect(v.parse(MoneySchema, "100.25")).toBe("100.25");
      expect(v.parse(MoneySchema, "100")).toBe("100");
    });

    it("rejects values with more than two decimal places", () => {
      const result = v.safeParse(MoneySchema, "100.123");
      expect(result.success).toBe(false);
    });
  });

  describe("PasswordSchema", () => {
    it("accepts passwords meeting complexity constraints", () => {
      expect(v.parse(PasswordSchema, "Abcdefg1")).toBe("Abcdefg1");
    });

    it("rejects password missing uppercase letter", () => {
      const result = v.safeParse(PasswordSchema, "abcdefg1");
      expect(result.success).toBe(false);
    });
  });
});
