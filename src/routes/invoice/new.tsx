import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { MustAuthenticate, redirectIfSignedOut } from "#/lib/auth";
import { DatabaseProvider } from "#/lib/provider";
import {
  SESSION_TIMEOUT_RULES,
  useSessionTimeoutTracker,
} from "#/lib/session-timeout";
import { formatDate } from "#/lib/utils";

import { DataSchema, InvoiceForm } from "./-form";

export const Route = createFileRoute("/invoice/new")({
  component: NewInvoicePage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
  loader: () => listFormOptions(),
});

const createInvoice = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .inputValidator(DataSchema)
  .handler(async ({ data, context }) => {
    const { line_items, amount: _amountFromForm, ...invoiceValues } = data;
    const { DrizzleInvoiceRepository } = await import("#/lib/invoice/invoice-repository");
    const { InvoiceApplicationService } = await import("#/lib/invoice/invoice-app-service");
    const repository = new DrizzleInvoiceRepository(context.db);
    const service = new InvoiceApplicationService(repository);

    return await service.createInvoiceForUser({
      userId: context.auth.profile.user_id,
      values: invoiceValues,
      lineItems: line_items,
      createdDate: formatDate(new Date()),
    });
  });

const listFormOptions = createServerFn()
  .middleware([DatabaseProvider, MustAuthenticate])
  .handler(async ({ context }) => {
    const { DrizzleInvoiceRepository } = await import("#/lib/invoice/invoice-repository");
    const { InvoiceApplicationService } = await import("#/lib/invoice/invoice-app-service");
    const repository = new DrizzleInvoiceRepository(context.db);
    const service = new InvoiceApplicationService(repository);
    return await service.listFormOptions();
  });

function NewInvoicePage() {
  const router = useRouter();
  const { accounts, vendors } = Route.useLoaderData();
  const [successMessage, setSuccessMessage] = useState("");
  const { remainingLabel } = useSessionTimeoutTracker({
    rule: SESSION_TIMEOUT_RULES.newInvoice,
  });

  const mutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: async () => {
      setSuccessMessage("Invoice created successfully! Redirecting to invoices…");

      await router.invalidate();
      await router.navigate({
        to: "/invoice",
      });
    },
  });

  return (
    <div className="mx-auto my-8 max-w-5xl rounded-lg border border-gray-300 p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
        <div className="flex items-center gap-2">
          <span className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Session timeout: {remainingLabel}
          </span>
          <button
            onClick={() => router.navigate({ to: "/invoice" })}
            className="rounded bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
          >
            Back to Invoices
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <InvoiceForm
        submitText={mutation.isPending ? "Creating..." : "Create Invoice"}
        errorText={mutation.error?.message}
        onSubmit={async (data) => {
          await mutation.mutateAsync({ data });
        }}
        defaultValues={{
          account_id: accounts?.[0]?.account_id ? String(accounts[0].account_id) : "",
          vendor_id: "",
          invoice_date: formatDate(new Date()),
          amount: "",
        }}
        accounts={accounts?.map((acct) => ({
          id: String(acct.account_id),
          name: acct.account_name,
        }))}
        vendors={vendors?.map((vendor) => ({
          id: String(vendor.vendor_id),
          name: vendor.vendor_name,
        }))}
      />
    </div>
  );
}
