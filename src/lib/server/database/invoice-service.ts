import { and, eq, sql } from "drizzle-orm";

import { t, type DrizzleClient } from "#/lib/server/database";
import {
  getDatabaseErrorReason,
  insertInvoiceWithInvoiceIdFallback,
} from "#/lib/server/database/invoices";

type InvoiceValues = {
  account_id: number;
  vendor_id: number | null;
  invoice_date: string;
  amount: string;
};

type LineItemValues = {
  description: string;
  quantity: number;
  price: number;
  tax_rate: number;
};

type InvoiceItemAmountColumn = "price" | "unit_price" | "amount";

async function resolveInvoiceItemAmountColumn(db: any): Promise<InvoiceItemAmountColumn> {
  const result = await db.execute(sql`
    select column_name
    from information_schema.columns
    where table_name = 'invoice_items'
      and column_name in ('price', 'unit_price', 'amount')
  `);
  const rows = (result as any).rows ?? result;
  const names = new Set(
    (rows as Array<{ column_name?: string }>).map((row) => row.column_name).filter(Boolean),
  );

  if (names.has("price")) {
    return "price";
  }

  if (names.has("unit_price")) {
    return "unit_price";
  }

  if (names.has("amount")) {
    return "amount";
  }

  throw new Error(
    "invoice_items is missing an amount column. Expected one of: price, unit_price, amount.",
  );
}

export async function listInvoiceFormOptions(db: DrizzleClient) {
  const [accounts, vendors] = await Promise.all([
    db
      .select({
        account_id: t.gl_accounts.account_id,
        account_name: t.gl_accounts.account_name,
      })
      .from(t.gl_accounts),
    db
      .select({
        vendor_id: t.vendor.vendor_id,
        vendor_name: t.vendor.vendor_name,
      })
      .from(t.vendor),
  ]);

  return { accounts, vendors };
}

export async function createInvoiceWithItemsForUser(
  db: DrizzleClient,
  userId: number,
  values: InvoiceValues,
  lineItems: LineItemValues[],
  createdDate: string,
) {
  const [userExists, accountExists] = await Promise.all([
    db
      .select({ user_id: t.users.user_id })
      .from(t.users)
      .where(eq(t.users.user_id, userId))
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ account_id: t.gl_accounts.account_id })
      .from(t.gl_accounts)
      .where(eq(t.gl_accounts.account_id, values.account_id))
      .limit(1)
      .then((rows) => rows[0]),
  ]);
  const vendorExists =
    values.vendor_id === null
      ? null
      : await db
          .select({ vendor_id: t.vendor.vendor_id })
          .from(t.vendor)
          .where(eq(t.vendor.vendor_id, values.vendor_id))
          .limit(1)
          .then((rows) => rows[0]);

  if (!userExists) {
    throw new Error(
      `Invoice debug: authenticated user_id ${userId} does not exist in users table.`,
    );
  }

  if (!accountExists) {
    throw new Error(
      `Invoice debug: account_id ${values.account_id} was not found in gl_accounts.`,
    );
  }

  if (values.vendor_id !== null && !vendorExists) {
    throw new Error(
      `Invoice debug: vendor_id ${values.vendor_id} was not found in vendor table.`,
    );
  }

  let invoice: { invoice_id: number } | undefined;
  try {
    await db.transaction(async (tx: any) => {
      const amountColumn = await resolveInvoiceItemAmountColumn(tx);

      invoice = await insertInvoiceWithInvoiceIdFallback(tx, {
        ...values,
        user_id: userId,
        created_date: createdDate,
      });

      if (!invoice) {
        throw new Error(
          "Invoice insert failed: no invoice row was returned after insert.",
        );
      }

      for (const item of lineItems) {
        await tx.execute(sql`
          insert into invoice_items (
            invoice_id,
            description,
            quantity,
            ${sql.raw(amountColumn)},
            tax_rate
          )
          values (
            ${invoice!.invoice_id},
            ${item.description},
            ${String(item.quantity)},
            ${String(item.price)},
            ${String(item.tax_rate)}
          )
        `);
      }
    });
  } catch (error) {
    const reason = getDatabaseErrorReason(error);
    throw new Error(
      `Invoice insert failed (user_id=${userId}, account_id=${values.account_id}, vendor_id=${values.vendor_id ?? "null"}, amount=${values.amount}, invoice_date=${values.invoice_date}). ${reason}`,
    );
  }

  if (!invoice) {
    throw new Error(
      "Invoice insert failed: no invoice row was returned after insert.",
    );
  }

  return { invoice_id: invoice.invoice_id };
}

export async function getInvoiceWithItemsForUser(
  db: DrizzleClient,
  userId: number,
  invoiceId: number,
) {
  const invoice = await db
    .select()
    .from(t.invoices)
    .where(
      and(
        eq(t.invoices.user_id, userId),
        eq(t.invoices.invoice_id, invoiceId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!invoice) {
    return null;
  }

  const amountColumn = await resolveInvoiceItemAmountColumn(db);
  const lineItemResult = await db.execute(sql`
    select
      description,
      quantity,
      ${sql.raw(amountColumn)} as price,
      tax_rate
    from invoice_items
    where invoice_id = ${invoice.invoice_id}
  `);
  const line_items = (lineItemResult as any).rows ?? lineItemResult;

  return { invoice, line_items };
}

export async function updateInvoiceWithItemsForUser(
  db: DrizzleClient,
  userId: number,
  invoiceId: number,
  values: InvoiceValues,
  lineItems: LineItemValues[],
) {
  await db.transaction(async (tx: any) => {
    const amountColumn = await resolveInvoiceItemAmountColumn(tx);
    const updatedInvoice = await tx
      .update(t.invoices)
      .set(values)
      .where(
        and(
          eq(t.invoices.user_id, userId),
          eq(t.invoices.invoice_id, invoiceId),
        ),
      )
      .returning({ invoice_id: t.invoices.invoice_id });

    if (!updatedInvoice.length) {
      throw new Error(`Invoice ${invoiceId} was not found for update.`);
    }

    await tx.execute(sql`delete from invoice_items where invoice_id = ${invoiceId}`);

    for (const item of lineItems) {
      await tx.execute(sql`
        insert into invoice_items (
          invoice_id,
          description,
          quantity,
          ${sql.raw(amountColumn)},
          tax_rate
        )
        values (
          ${invoiceId},
          ${item.description},
          ${String(item.quantity)},
          ${String(item.price)},
          ${String(item.tax_rate)}
        )
      `);
    }
  });
}
