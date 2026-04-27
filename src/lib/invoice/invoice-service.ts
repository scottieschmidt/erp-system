import {
  type InvoiceLineItemInput,
} from "#/lib/invoice/invoice-types";

export type InvoiceTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

export class InvoiceService {
  calculateTotals(lineItems: InvoiceLineItemInput[]): InvoiceTotals {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const tax = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.price * (item.tax_rate / 100),
      0,
    );

    const total = subtotal + tax;

    return {
      subtotal: this.roundCurrency(subtotal),
      tax: this.roundCurrency(tax),
      total: this.roundCurrency(total),
    };
  }

  getLineItemErrors(item: InvoiceLineItemInput): string[] {
    const errors: string[] = [];

    if (!item.description.trim()) {
      errors.push("Description is required.");
    }

    if (item.quantity <= 0) {
      errors.push("Quantity must be greater than 0.");
    }

    if (item.price < 0) {
      errors.push("Price cannot be negative.");
    }

    if (item.tax_rate < 0 || item.tax_rate > 100) {
      errors.push("Tax rate must be between 0 and 100.");
    }

    return errors;
  }

  validateLineItems(lineItems: InvoiceLineItemInput[]): string[] {
    if (!lineItems.length) {
      return ["At least one line item is required."];
    }

    return lineItems.flatMap((item, index) =>
      this.getLineItemErrors(item).map((message) => `Line item ${index + 1}: ${message}`),
    );
  }

  private roundCurrency(value: number): number {
    return Number(value.toFixed(2));
  }
}
