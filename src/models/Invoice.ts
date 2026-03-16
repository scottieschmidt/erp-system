export class Invoice {
  constructor(
    public invoice_id: number,
    public user_id: number,
    public account_id: number,
    public vendor_id: number,
    public total_amount: number,
    public voucher_date: Date,
    public created_date: Date,
  ) {}

  getTotal(): number {
    return this.total_amount;
  }
}
