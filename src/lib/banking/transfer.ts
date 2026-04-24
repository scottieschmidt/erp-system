export type TransferAccount = {
  id: string;
  name: string;
  availableBalance: number;
  currentBalance: number;
};

export type TransferRequest = {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  memo?: string;
};

export type TransferLedgerStatus = "matched";

export type TransferLedgerDirection = "debit" | "credit" | "fee";

export type TransferLedgerEntry = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: TransferLedgerStatus;
  suggestedMatch: string;
};

export type TransferResult<TAccount extends TransferAccount> = {
  transferId: string;
  postedDate: string;
  amount: number;
  fee: number;
  updatedAccounts: TAccount[];
  ledgerEntries: TransferLedgerEntry[];
};

export interface TransferFeePolicy {
  calculateFee(amount: number): number;
}

export type TransferEngineDependencies = {
  feePolicy: TransferFeePolicy;
  now: () => Date;
  createTransferId: () => string;
};

export class TransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransferError";
  }
}

export abstract class AbstractTransferEngine<TAccount extends TransferAccount> {
  protected readonly feePolicy: TransferFeePolicy;
  private readonly now: () => Date;
  private readonly createTransferId: () => string;

  constructor(dependencies: TransferEngineDependencies) {
    this.feePolicy = dependencies.feePolicy;
    this.now = dependencies.now;
    this.createTransferId = dependencies.createTransferId;
  }

  transfer(accounts: readonly TAccount[], request: TransferRequest): TransferResult<TAccount> {
    const source = accounts.find((account) => account.id === request.fromAccountId);
    const destination = accounts.find((account) => account.id === request.toAccountId);
    const amountInCents = this.toCents(request.amount);
    const feeInCents = this.toCents(this.feePolicy.calculateFee(request.amount));

    if (!source || !destination) {
      throw new TransferError("Both source and destination accounts must exist.");
    }

    if (request.fromAccountId === request.toAccountId) {
      throw new TransferError("Choose two different accounts for an internal transfer.");
    }

    if (!Number.isFinite(request.amount) || amountInCents <= 0) {
      throw new TransferError("Transfer amount must be greater than zero.");
    }

    if (feeInCents < 0) {
      throw new TransferError("Transfer fee cannot be negative.");
    }

    const totalDebitInCents = amountInCents + feeInCents;
    const sourceAvailableInCents = this.toCents(source.availableBalance);

    if (sourceAvailableInCents < totalDebitInCents) {
      throw new TransferError("Insufficient available balance for this sandbox transfer.");
    }

    const transferId = this.createTransferId();
    const postedDate = this.toLedgerDate(this.now());
    const transferAmount = this.fromCents(amountInCents);
    const feeAmount = this.fromCents(feeInCents);
    const updatedAccounts = accounts.map((account) => {
      if (account.id === source.id) {
        return {
          ...account,
          availableBalance: this.fromCents(this.toCents(account.availableBalance) - totalDebitInCents),
          currentBalance: this.fromCents(this.toCents(account.currentBalance) - totalDebitInCents),
        };
      }

      if (account.id === destination.id) {
        return {
          ...account,
          availableBalance: this.fromCents(this.toCents(account.availableBalance) + amountInCents),
          currentBalance: this.fromCents(this.toCents(account.currentBalance) + amountInCents),
        };
      }

      return { ...account };
    });

    const ledgerEntries: TransferLedgerEntry[] = [
      {
        id: `${transferId}-debit`,
        accountId: source.id,
        date: postedDate,
        description: this.createLedgerDescription("debit", source, destination, request.memo),
        category: "Internal Transfer",
        amount: -transferAmount,
        status: "matched",
        suggestedMatch: `Linked transfer to ${destination.name}`,
      },
      {
        id: `${transferId}-credit`,
        accountId: destination.id,
        date: postedDate,
        description: this.createLedgerDescription("credit", source, destination, request.memo),
        category: "Internal Transfer",
        amount: transferAmount,
        status: "matched",
        suggestedMatch: `Linked transfer from ${source.name}`,
      },
    ];

    if (feeInCents > 0) {
      ledgerEntries.push({
        id: `${transferId}-fee`,
        accountId: source.id,
        date: postedDate,
        description: this.createLedgerDescription("fee", source, destination, request.memo),
        category: "Transfer Fee",
        amount: -feeAmount,
        status: "matched",
        suggestedMatch: "Applied by transfer fee policy",
      });
    }

    return {
      transferId,
      postedDate,
      amount: transferAmount,
      fee: feeAmount,
      updatedAccounts,
      ledgerEntries,
    };
  }

  protected abstract createLedgerDescription(
    direction: TransferLedgerDirection,
    source: TAccount,
    destination: TAccount,
    memo?: string,
  ): string;

  private toLedgerDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private toCents(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromCents(cents: number): number {
    return cents / 100;
  }
}

export class ZeroFeeTransferPolicy implements TransferFeePolicy {
  calculateFee(): number {
    return 0;
  }
}

export class SandboxTransferEngine<TAccount extends TransferAccount> extends AbstractTransferEngine<TAccount> {
  protected createLedgerDescription(
    direction: TransferLedgerDirection,
    source: TAccount,
    destination: TAccount,
    memo?: string,
  ): string {
    const note = memo ? ` • ${memo}` : "";

    if (direction === "debit") {
      return `Transfer to ${destination.name}${note}`;
    }

    if (direction === "credit") {
      return `Transfer from ${source.name}${note}`;
    }

    return `Transfer fee${note}`;
  }
}
