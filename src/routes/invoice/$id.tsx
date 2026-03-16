import { createFileRoute, notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabase } from "#/lib/supabase";

export const Route = createFileRoute("/invoice/$id")({
  loader: ({ params }) =>
    fetchInvoice({
      data: { id: Number(params.id) },
    }),
  component: ShowInvoice,
});

const fetchInvoice = createServerFn()
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
    }),
  )
  .handler(async ({ data }) => {
    const response = await supabase
      .from("invoices")
      .select("*")
      .eq("invoice_id", data.id)
      .limit(1)
      .maybeSingle()
      .throwOnError();

    if (!response.data) {
      throw notFound();
    }

    return response.data;
  });

function ShowInvoice() {
  const invoice = Route.useLoaderData();

  return <pre>{JSON.stringify(invoice, null, 2)}</pre>;
}
