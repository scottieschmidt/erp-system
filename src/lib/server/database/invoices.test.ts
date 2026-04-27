import { describe, expect, it, vi } from "vitest";

import {
  getDatabaseErrorReason,
  insertInvoiceWithInvoiceIdFallback,
} from "#/lib/server/database/invoices";

type InsertChain = {
  values: (payload: unknown) => {
    returning: () => Promise<Array<Record<string, unknown>>>;
  };
};

describe("getDatabaseErrorReason", () => {
  it("collects nested and structured messages without duplicates", () => {
    const cause = {
      detail: "invoice_id cannot be null",
      hint: "Ensure identity/default",
    };
    const root = new Error("Insert failed", { cause });
    const reason = getDatabaseErrorReason(root);

    expect(reason).toContain("Insert failed");
    expect(reason).toContain("invoice_id cannot be null");
    expect(reason).toContain("Ensure identity/default");
  });

  it("returns fallback message for empty unknown input", () => {
    expect(getDatabaseErrorReason({})).toBe("Unknown database error");
  });
});

describe("insertInvoiceWithInvoiceIdFallback", () => {
  it("returns inserted row on primary insert success", async () => {
    const inserted = { invoice_id: 101, amount: "12.00" };
    const returning = vi.fn().mockResolvedValue([inserted]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values } as InsertChain);
    const db = { insert } as any;

    const result = await insertInvoiceWithInvoiceIdFallback(db, {
      amount: "12.00",
    } as any);

    expect(result).toEqual(inserted);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({ amount: "12.00" });
  });

  it("retries with manual invoice_id when first insert fails for missing default", async () => {
    const retryRow = { invoice_id: 77, amount: "100.00" };
    const returning = vi
      .fn()
      .mockRejectedValueOnce(
        new Error("null value in column invoice_id violates not-null constraint"),
      )
      .mockResolvedValueOnce([retryRow]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values } as InsertChain);
    const from = vi.fn().mockResolvedValue([{ invoice_id: 77 }]);
    const select = vi.fn().mockReturnValue({ from });
    const db = { insert, select } as any;

    const result = await insertInvoiceWithInvoiceIdFallback(db, {
      amount: "100.00",
    } as any);

    expect(result).toEqual(retryRow);
    expect(select).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenNthCalledWith(1, { amount: "100.00" });
    expect(values).toHaveBeenNthCalledWith(2, { amount: "100.00", invoice_id: 77 });
  });

  it("rethrows non-invoice-id failures without retrying", async () => {
    const boom = new Error("connection reset by peer");
    const returning = vi.fn().mockRejectedValue(boom);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values } as InsertChain);
    const select = vi.fn();
    const db = { insert, select } as any;

    await expect(
      insertInvoiceWithInvoiceIdFallback(db, {
        amount: "20.00",
      } as any),
    ).rejects.toThrow("connection reset by peer");
    expect(select).not.toHaveBeenCalled();
  });
});
