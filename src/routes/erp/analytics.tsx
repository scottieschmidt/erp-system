import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";
import { ExpensesChart } from "#/components/charts/expenses-chart";
import { BUSINESS_TIME_ZONE, REJECTED_NOTE_PREFIX } from "#/lib/voucher";

type AnalyticsData = {
  invoiceAllocations: {
    vendorLabel: string;
    accountLabel: string;
    amount: number;
  }[];
  totalSpend: number;
  voucherCount: number;
};

const getAnalyticsData = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const payments = await context.db
      .select({
        payment_id: t.payment.payment_id,
        payment_date: t.payment.payment_date,
        total_amount: t.payment.total_amount,
        account_id: t.payment.account_id,
      })
      .from(t.payment)
      .where(
        and(
          eq(t.payment.user_id, context.auth.profile.user_id),
          sql`${t.payment.payment_date} <= (now() at time zone ${BUSINESS_TIME_ZONE})::date`,
          sql`coalesce(${t.payment.description}, '') not like ${`${REJECTED_NOTE_PREFIX}%`}`,
        ),
      )
      .orderBy(desc(t.payment.payment_date));

    const paymentInvoices = await context.db
      .select({
        payment_id: t.payment_invoice.payment_id,
        invoice_id: t.payment_invoice.invoice_id,
        amount_paid: t.payment_invoice.amount_paid,
      })
      .from(t.payment_invoice)
      .innerJoin(t.payment, eq(t.payment_invoice.payment_id, t.payment.payment_id))
      .where(
        and(
          eq(t.payment.user_id, context.auth.profile.user_id),
          sql`${t.payment.payment_date} <= (now() at time zone ${BUSINESS_TIME_ZONE})::date`,
          sql`coalesce(${t.payment.description}, '') not like ${`${REJECTED_NOTE_PREFIX}%`}`,
        ),
      );

    const invoices = await context.db
      .select({
        invoice_id: t.invoices.invoice_id,
        vendor_name: t.vendor.vendor_name,
        account_name: t.gl_accounts.account_name,
      })
      .from(t.invoices)
      .leftJoin(t.vendor, eq(t.invoices.vendor_id, t.vendor.vendor_id))
      .leftJoin(t.gl_accounts, eq(t.invoices.account_id, t.gl_accounts.account_id))
      .where(eq(t.invoices.user_id, context.auth.profile.user_id));

    const invoiceVendorMap = new Map(
      invoices.map((invoice) => [Number(invoice.invoice_id), invoice.vendor_name ?? "Unassigned vendor"]),
    );
    const invoiceAccountMap = new Map(
      invoices.map((invoice) => [Number(invoice.invoice_id), invoice.account_name ?? "Unassigned account"]),
    );

    const invoiceAllocations: AnalyticsData["invoiceAllocations"] = [];
    paymentInvoices.forEach((row) => {
      const vendorName = invoiceVendorMap.get(Number(row.invoice_id)) ?? "Unassigned vendor";
      const amountPaid = Number(row.amount_paid);

      const accountName = invoiceAccountMap.get(Number(row.invoice_id)) ?? "Unassigned account";
      invoiceAllocations.push({
        vendorLabel: vendorName,
        accountLabel: accountName,
        amount: amountPaid,
      });
    });

    return {
      invoiceAllocations,
      totalSpend: payments.reduce((sum, payment) => sum + Number(payment.total_amount), 0),
      voucherCount: payments.length,
    } satisfies AnalyticsData;
  });

export const Route = createFileRoute("/erp/analytics")({
  component: AnalyticsPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => getAnalyticsData(),
});

function AnalyticsPage() {
  const data = Route.useLoaderData() as AnalyticsData;
  const [rangeMode, setRangeMode] = useState<"5" | "all">("5");
  const [vendorSearchText, setVendorSearchText] = useState("");
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [vendorDropdownOpen, setVendorDropdownOpen] = useState(false);
  const vendorDropdownRef = useRef<HTMLDivElement | null>(null);
  const visibleCount = rangeMode === "all" ? Number.MAX_SAFE_INTEGER : 5;

  const allVendorLabels = useMemo(() => {
    const labelSet = new Set<string>();
    data.invoiceAllocations.forEach((allocation) => {
      labelSet.add(allocation.vendorLabel);
    });
    return Array.from(labelSet).sort((a, b) => a.localeCompare(b));
  }, [data.invoiceAllocations]);

  const filteredVendorOptions = useMemo(() => {
    const search = vendorSearchText.trim().toLowerCase();
    if (!search) {
      return allVendorLabels;
    }
    return allVendorLabels.filter((label) => label.toLowerCase().includes(search));
  }, [allVendorLabels, vendorSearchText]);

  const selectedVendorSet = useMemo(() => new Set(selectedVendors), [selectedVendors]);

  const filteredAllocations = useMemo(() => {
    if (selectedVendors.length === 0) {
      return data.invoiceAllocations;
    }
    return data.invoiceAllocations.filter((allocation) => selectedVendorSet.has(allocation.vendorLabel));
  }, [data.invoiceAllocations, selectedVendorSet, selectedVendors.length]);

  const vendorSortedPoints = useMemo(() => {
    const totals = new Map<string, number>();
    filteredAllocations.forEach((allocation) => {
      totals.set(
        allocation.vendorLabel,
        (totals.get(allocation.vendorLabel) ?? 0) + allocation.amount,
      );
    });
    return Array.from(totals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAllocations]);

  const accountSortedPoints = useMemo(() => {
    const totals = new Map<string, number>();
    filteredAllocations.forEach((allocation) => {
      totals.set(
        allocation.accountLabel,
        (totals.get(allocation.accountLabel) ?? 0) + allocation.amount,
      );
    });
    return Array.from(totals.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredAllocations]);

  const vendorPoints = useMemo(
    () => vendorSortedPoints.slice(0, visibleCount),
    [vendorSortedPoints, visibleCount],
  );
  const accountPoints = useMemo(
    () => accountSortedPoints.slice(0, visibleCount),
    [accountSortedPoints, visibleCount],
  );

  const vendorTitle = rangeMode === "all" ? "All Vendors by Spend" : "Top 5 Vendors by Spend";
  const accountTitle =
    selectedVendors.length > 0
      ? rangeMode === "all"
        ? "All Selected Account Names by Spend"
        : "Top 5 Selected Account Names by Spend"
      : rangeMode === "all"
        ? "All Account Names by Spend"
        : "Top 5 Account Names by Spend";

  const toggleVendor = (label: string) => {
    setSelectedVendors((prev) =>
      prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label],
    );
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!vendorDropdownRef.current) return;
      if (!vendorDropdownRef.current.contains(event.target as Node)) {
        setVendorDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, []);

  return (
    <DashboardLayout title="Analytics">
      <section className="space-y-5">
        <div className="relative z-40 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-white/15 px-3 py-1 text-xs tracking-[0.1em] text-slate-300">
                ERP ANALYTICS
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Voucher spend visualized</h2>
              <p className="mt-1 text-sm text-slate-400">
                Compare payment volume by vendor and accounting code without crowding the main dashboard.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Total spend" value={`$${data.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} />
              <MetricCard label="Voucher count" value={data.voucherCount.toLocaleString()} />
            </div>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-100">Vendor filter</div>
                <p className="mt-1 text-sm text-slate-400">
                  Choose top 5 or all, then search and select one or more vendors.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRangeMode("5")}
                  className={
                    rangeMode === "5"
                      ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-xs font-semibold text-cyan-100"
                      : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                  }
                >
                  Top 5
                </button>
                <button
                  type="button"
                  onClick={() => setRangeMode("all")}
                  className={
                    rangeMode === "all"
                      ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-4 py-2 text-xs font-semibold text-cyan-100"
                      : "rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                  }
                >
                  All
                </button>
                <div ref={vendorDropdownRef} className="relative z-50 min-w-[260px] flex-1">
                  <button
                    type="button"
                    onClick={() => setVendorDropdownOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-white/20"
                  >
                    <span className="truncate">
                      {selectedVendors.length === 0
                        ? "Search vendor"
                        : `${selectedVendors.length} vendor(s) selected`}
                    </span>
                    <span className="text-slate-400">{vendorDropdownOpen ? "▲" : "▼"}</span>
                  </button>

                  {vendorDropdownOpen ? (
                    <div className="absolute z-30 mt-2 w-full rounded-xl border border-white/15 bg-slate-950 p-3 shadow-2xl">
                      <input
                        type="text"
                        value={vendorSearchText}
                        onChange={(event) => setVendorSearchText(event.target.value)}
                        placeholder="Search vendor..."
                        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/40"
                      />

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedVendors(allVendorLabels)}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedVendors([])}
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20"
                        >
                          Clear
                        </button>
                      </div>

                      <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-slate-950/40 p-2">
                        {filteredVendorOptions.length === 0 ? (
                          <p className="px-2 py-2 text-sm text-slate-400">No vendor found.</p>
                        ) : (
                          <ul className="space-y-1">
                            {filteredVendorOptions.map((label) => (
                              <li key={label}>
                                <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm text-slate-200 transition hover:bg-white/5">
                                  <input
                                    type="checkbox"
                                    checked={selectedVendorSet.has(label)}
                                    onChange={() => toggleVendor(label)}
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900"
                                  />
                                  <span className="truncate">{label}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {selectedVendors.length === 0
                ? rangeMode === "all"
                  ? "Showing all vendors."
                  : "Showing top 5 vendors."
                : `Showing ${Math.min(vendorPoints.length, selectedVendors.length)} selected vendor(s) in current range.`}
            </p>
          </div>
        </div>

        <div className="relative z-0 grid gap-4 xl:grid-cols-2">
          <ExpensesChart
            title={vendorTitle}
            description="Voucher allocations rolled up to the vendor tied to each invoice."
            emptyMessage="Create vouchers tied to invoices with vendors to populate this view."
            points={vendorPoints}
          />
          <ExpensesChart
            title={accountTitle}
            description="Voucher allocations grouped by invoice account names."
            emptyMessage="Create vouchers with account codes to populate this view."
            points={accountPoints}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard(props: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-100">{props.value}</div>
    </div>
  );
}
