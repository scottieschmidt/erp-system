import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { useState, type FormEvent } from "react";
import * as v from "valibot";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

export const Route = createFileRoute('/erp/search-voucher')({
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  component: SearchVoucherPage,
})

const SearchVoucherSchema = v.object({
  invoiceId: v.pipe(v.number(), v.integer(), v.minValue(1)),
});

const searchVoucherExists = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(SearchVoucherSchema)
  .handler(async ({ data, context }) => {
    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
      })
      .from(t.invoices)
      .where(
        and(
          eq(t.invoices.user_id, context.auth.profile.user_id),
          eq(t.invoices.invoice_id, data.invoiceId),
        ),
      )
      .limit(1);

    return { found: invoices.length > 0 };
  });

function SearchVoucherPage() {
  const [invoiceId, setInvoiceId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"idle" | "found" | "not_found">("idle");
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult("idle");
    setHasSearched(false);

    const parsedInvoiceId = Number(invoiceId);
    if (!Number.isInteger(parsedInvoiceId) || parsedInvoiceId <= 0) {
      setError("Please enter a valid invoice ID.");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await searchVoucherExists({
        data: { invoiceId: parsedInvoiceId },
      });
      setResult(response.found ? "found" : "not_found");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout title="Search Voucher">
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Search Voucher</h1>

        <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            placeholder="Enter invoice ID"
            value={invoiceId}
            onChange={(e) => setInvoiceId(e.target.value)}
            className="w-64 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900"
          />

          <button
            type="submit"
            disabled={loading || !invoiceId}
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <p className="text-red-400">{error}</p>}

        {!loading && hasSearched && !error && result === "found" && (
          <p className="text-green-400">Found</p>
        )}
        {!loading && hasSearched && !error && result === "not_found" && (
          <p>No found.</p>
        )}
      </div>
    </DashboardLayout>
  );
}