import { type InvoiceRepository } from "#/lib/invoice/invoice-repository";
import {
  type InvoiceCreateValues,
  type InvoiceLineItemInput,
} from "#/lib/invoice/invoice-types";
import { InvoiceService } from "#/lib/invoice/invoice-service";

export class InvoiceApplicationService {
  constructor(
    private readonly repository: InvoiceRepository,
    private readonly invoiceService = new InvoiceService(),
  ) {}

  async createInvoiceForUser(input: {
    userId: number;
    values: Omit<InvoiceCreateValues, "amount">;
    lineItems: InvoiceLineItemInput[];
    createdDate: string;
  }) {
    const errors = this.invoiceService.validateLineItems(input.lineItems);
    if (errors.length > 0) {
      throw new Error(errors[0]);
    }

    const { total } = this.invoiceService.calculateTotals(input.lineItems);
    if (total <= 0) {
      throw new Error("Invoice total must be greater than 0.");
    }

    return await this.repository.createForUser({
      userId: input.userId,
      values: {
        ...input.values,
        amount: total.toFixed(2),
      },
      lineItems: input.lineItems,
      createdDate: input.createdDate,
    });
  }

  async listFormOptions() {
    return await this.repository.listFormOptions();
  }
}
