import { describe, expect, it, vi } from "vitest";

import { syncInvoicePaidStatusByPaymentDate } from "#/lib/server/database/invoice-payment-status";

describe("syncInvoicePaidStatusByPaymentDate", () => {
  it("executes one update statement with the given user id", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const db = { execute };

    await syncInvoicePaidStatusByPaymentDate(db, 77);

    expect(execute).toHaveBeenCalledTimes(1);
    const [queryArg] = execute.mock.calls[0];
    expect(queryArg).toBeDefined();
  });
});
