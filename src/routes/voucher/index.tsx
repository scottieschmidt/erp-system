import { Link, createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { desc, eq } from "drizzle-orm";

import { DashboardLayout } from "#/components/layout/dashboard";
import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import { t } from "#/lib/server/database";

type VoucherPreviewRow = {
  payment_id: number;
  voucher_number: string;
  payment_date: string;
  pay_type: string;
  total_amount: string;
  invoice_count: number;
};

const listVouchersPreviewFn = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const [vouchers, voucherInvoices] = await Promise.all([
      context.db
        .select({
          payment_id: t.payment.payment_id,
          voucher_number: t.payment.voucher_number,
          payment_date: t.payment.payment_date,
          pay_type: t.payment.pay_type,
          total_amount: t.payment.total_amount,
        })
        .from(t.payment)
        .where(eq(t.payment.user_id, context.auth.profile.user_id))
        .orderBy(desc(t.payment.payment_id)),
      context.db
        .select({
          payment_id: t.payment_invoice.payment_id,
          invoice_id: t.payment_invoice.invoice_id,
        })
        .from(t.payment_invoice)
        .innerJoin(t.payment, eq(t.payment_invoice.payment_id, t.payment.payment_id))
        .where(eq(t.payment.user_id, context.auth.profile.user_id)),
    ]);

    const invoiceCountByPaymentId = new Map<number, number>();
    voucherInvoices.forEach((row) => {
      const paymentId = Number(row.payment_id);
      invoiceCountByPaymentId.set(paymentId, (invoiceCountByPaymentId.get(paymentId) ?? 0) + 1);
    });

    return vouchers.map(
      (voucher): VoucherPreviewRow => ({
        payment_id: Number(voucher.payment_id),
        voucher_number: voucher.voucher_number,
        payment_date: voucher.payment_date,
        pay_type: voucher.pay_type,
        total_amount: String(voucher.total_amount),
        invoice_count: invoiceCountByPaymentId.get(Number(voucher.payment_id)) ?? 0,
      }),
    );
  });

export const Route = createFileRoute("/voucher/")({
  component: VoucherPreviewPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listVouchersPreviewFn(),
});

function VoucherPreviewPage() {
  const vouchers = Route.useLoaderData();

  return (
    <DashboardLayout title="Voucher Preview">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-300">
            Preview all vouchers before creating or searching new payment records.
          </p>
          <Link
            to="/voucher/new"
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/25"
          >
            + New Voucher
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Voucher #
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Payment Date
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Pay Type
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Invoices
                </th>
                <th className="border-b border-white/10 px-3 py-2 text-left font-semibold">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                    No vouchers yet. Click New Voucher to create one.
                  </td>
                </tr>
              ) : (
                vouchers.map((voucher) => {
                  const payTypeText = String(voucher.pay_type ?? "")
                    .split("_")
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(" ");

                  return (
                    <tr key={voucher.payment_id} className="hover:bg-white/5">
                      <td className="border-b border-white/5 px-3 py-2 font-semibold">
                        {voucher.voucher_number}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">{voucher.payment_date}</td>
                      <td className="border-b border-white/5 px-3 py-2">{payTypeText || "—"}</td>
                      <td className="border-b border-white/5 px-3 py-2">{voucher.invoice_count}</td>
                      <td className="border-b border-white/5 px-3 py-2">
                        ${Number(voucher.total_amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardLayout>
  );
}
