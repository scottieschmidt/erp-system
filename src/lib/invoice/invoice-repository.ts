import { type DrizzleClient } from "#/lib/server/database";
import {
  createInvoiceWithItemsForUser as createInvoiceWithItemsForUserDb,
  listInvoiceFormOptions as listInvoiceFormOptionsDb,
} from "#/lib/server/database/invoice-service";
import {
  type InvoiceCreateValues,
  type InvoiceLineItemInput,
} from "#/lib/invoice/invoice-types";

type ListInvoiceFormOptionsResult = Awaited<ReturnType<typeof listInvoiceFormOptionsDb>>;
type CreateInvoiceResult = Awaited<ReturnType<typeof createInvoiceWithItemsForUserDb>>;

export interface InvoiceRepository {
  listFormOptions(): Promise<ListInvoiceFormOptionsResult>;
  createForUser(input: {
    userId: number;
    values: InvoiceCreateValues;
    lineItems: InvoiceLineItemInput[];
    createdDate: string;
  }): Promise<CreateInvoiceResult>;
}

export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: DrizzleClient) {}

  async listFormOptions(): Promise<ListInvoiceFormOptionsResult> {
    return await listInvoiceFormOptionsDb(this.db);
  }

  async createForUser(input: {
    userId: number;
    values: InvoiceCreateValues;
    lineItems: InvoiceLineItemInput[];
    createdDate: string;
  }): Promise<CreateInvoiceResult> {
    return await createInvoiceWithItemsForUserDb(
      this.db,
      input.userId,
      input.values,
      input.lineItems,
      input.createdDate,
    );
  }
}
