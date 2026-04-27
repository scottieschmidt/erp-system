export type InvoiceLineItemInput = {
  description: string;
  quantity: number;
  price: number;
  tax_rate: number;
};

export type InvoiceCreateValues = {
  account_id: number;
  vendor_id: number | null;
  invoice_date: string;
  amount: string;
};
