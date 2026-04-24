import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";

import { DashboardLayout } from "#/components/layout/dashboard";
import { redirectIfSignedOut } from "#/lib/auth";
import {
  SandboxTransferEngine,
  TransferError,
  type TransferRequest,
  ZeroFeeTransferPolicy,
} from "#/lib/banking/transfer";

type SandboxAccount = {
  id: string;
  institution: string;
  name: string;
  subtype: string;
  mask: string;
  availableBalance: number;
  currentBalance: number;
};

type SandboxTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: "matched" | "review" | "unmatched";
  suggestedMatch?: string;
};

type TransferNotice = {
  kind: "success" | "error";
  message: string;
};

const SANDBOX_ACCOUNTS: SandboxAccount[] = [
  {
    id: "acct-demo-checking",
    institution: "Plaid Sandbox",
    name: "Demo Operating Checking",
    subtype: "Checking",
    mask: "1024",
    availableBalance: 48215.22,
    currentBalance: 49103.88,
  },
  {
    id: "acct-demo-payroll",
    institution: "Plaid Sandbox",
    name: "Demo Payroll Reserve",
    subtype: "Savings",
    mask: "8871",
    availableBalance: 126500,
    currentBalance: 126500,
  },
];

const SANDBOX_TRANSACTIONS: SandboxTransaction[] = [
  {
    id: "txn-001",
    accountId: "acct-demo-checking",
    date: "2026-04-24",
    description: "ACME Office Supply Co",
    category: "Office Supplies",
    amount: -842.17,
    status: "matched",
    suggestedMatch: "Matched to Voucher VCH-1408",
  },
  {
    id: "txn-002",
    accountId: "acct-demo-checking",
    date: "2026-04-23",
    description: "Cloudflare",
    category: "Software",
    amount: -219.0,
    status: "review",
    suggestedMatch: "Possible match to recurring hosting expense",
  },
  {
    id: "txn-003",
    accountId: "acct-demo-checking",
    date: "2026-04-22",
    description: "Client ACH Deposit",
    category: "Receipts",
    amount: 6400,
    status: "unmatched",
    suggestedMatch: "Review against open invoices",
  },
  {
    id: "txn-004",
    accountId: "acct-demo-payroll",
    date: "2026-04-21",
    description: "Payroll Funding Transfer",
    category: "Internal Transfer",
    amount: -12000,
    status: "matched",
    suggestedMatch: "Matched to payroll reserve transfer",
  },
  {
    id: "txn-005",
    accountId: "acct-demo-checking",
    date: "2026-04-20",
    description: "Utilities Payment",
    category: "Utilities",
    amount: -486.42,
    status: "review",
    suggestedMatch: "Suggested match to monthly utilities ledger entry",
  },
];

export const Route = createFileRoute("/erp/banking")({
  component: BankingPage,
  beforeLoad: async ({ context }) => {
    await redirectIfSignedOut(context);
  },
});

function BankingPage() {
  const [accounts, setAccounts] = useState<SandboxAccount[]>(SANDBOX_ACCOUNTS);
  const [transactions, setTransactions] = useState<SandboxTransaction[]>(SANDBOX_TRANSACTIONS);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(SANDBOX_ACCOUNTS[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | SandboxTransaction["status"]>("all");
  const [transferFromAccountId, setTransferFromAccountId] = useState<string>(SANDBOX_ACCOUNTS[0]?.id ?? "");
  const [transferToAccountId, setTransferToAccountId] = useState<string>(
    SANDBOX_ACCOUNTS[1]?.id ?? SANDBOX_ACCOUNTS[0]?.id ?? "",
  );
  const [transferAmount, setTransferAmount] = useState<string>("100");
  const [transferMemo, setTransferMemo] = useState<string>("");
  const [transferNotice, setTransferNotice] = useState<TransferNotice | null>(null);

  const transferEngine = useMemo(() => {
    let nextTransferId = SANDBOX_TRANSACTIONS.length + 1;

    return new SandboxTransferEngine<SandboxAccount>({
      feePolicy: new ZeroFeeTransferPolicy(),
      now: () => new Date(),
      createTransferId: () => `txn-${String(nextTransferId++).padStart(3, "0")}`,
    });
  }, []);

  const selectedAccount =
    accounts.find((account) => account.id === selectedAccountId) ?? accounts[0];

  const visibleTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (transaction.accountId !== selectedAccount?.id) return false;
        if (statusFilter === "all") return true;
        return transaction.status === statusFilter;
      }),
    [selectedAccount?.id, statusFilter, transactions],
  );

  const summary = useMemo(() => {
    const allChecking = accounts.reduce(
      (sum, account) => sum + account.currentBalance,
      0,
    );
    const unmatchedCount = transactions.filter(
      (transaction) => transaction.status === "unmatched",
    ).length;
    const reviewCount = transactions.filter(
      (transaction) => transaction.status === "review",
    ).length;

    return { allChecking, unmatchedCount, reviewCount };
  }, [accounts, transactions]);

  const canSubmitTransfer =
    accounts.length > 1 &&
    transferFromAccountId.length > 0 &&
    transferToAccountId.length > 0 &&
    transferFromAccountId !== transferToAccountId &&
    Number(transferAmount) > 0;

  function handleTransferSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const request: TransferRequest = {
      fromAccountId: transferFromAccountId,
      toAccountId: transferToAccountId,
      amount: Number(transferAmount),
      memo: transferMemo.trim() || undefined,
    };

    try {
      const result = transferEngine.transfer(accounts, request);
      const transferEntries: SandboxTransaction[] = result.ledgerEntries.map((entry) => ({ ...entry }));

      setAccounts(result.updatedAccounts);
      setTransactions((current) => [...transferEntries, ...current]);
      setStatusFilter("all");
      setSelectedAccountId(request.fromAccountId);
      setTransferAmount("");
      setTransferMemo("");
      setTransferNotice({
        kind: "success",
        message: `Transferred $${result.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} from ${transferFromAccountId} to ${transferToAccountId}.`,
      });
    } catch (error) {
      const message =
        error instanceof TransferError
          ? error.message
          : "Unable to complete the sandbox transfer.";
      setTransferNotice({ kind: "error", message });
    }
  }

  return (
    <DashboardLayout title="Banking">
      <section className="space-y-5">
        <div className="rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/12 via-slate-950/50 to-slate-900/80 p-6 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="inline-flex rounded-full border border-cyan-300/30 px-3 py-1 text-xs tracking-[0.14em] text-cyan-100">
                TEST MODE ONLY
              </div>
              <h2 className="mt-3 text-2xl font-semibold">Sandbox banking workspace</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Explore linked accounts, balances, transactions, and reconciliation suggestions
                using demo-only sandbox data. No real bank connection is active here.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Provider</div>
              <div className="mt-2 text-lg font-semibold text-slate-100">Plaid Sandbox</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total cash position"
            value={`$${summary.allChecking.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          />
          <MetricCard label="Needs review" value={summary.reviewCount.toString()} />
          <MetricCard label="Unmatched items" value={summary.unmatchedCount.toString()} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
              <h3 className="text-lg font-semibold">Connected demo accounts</h3>
              <p className="mt-1 text-sm text-slate-400">
                Mocked balances designed for sandbox-only banking flows.
              </p>

              <div className="mt-4 space-y-3">
                {accounts.map((account) => {
                  const active = account.id === selectedAccount?.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setSelectedAccountId(account.id)}
                      className={
                        active
                          ? "w-full rounded-2xl border border-cyan-300/40 bg-cyan-400/10 p-4 text-left"
                          : "w-full rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left transition hover:border-white/20 hover:bg-slate-900/60"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-100">{account.name}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                            {account.institution} • {account.subtype} • ****{account.mask}
                          </div>
                        </div>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300">
                          Demo
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <AccountStat label="Available" value={account.availableBalance} />
                        <AccountStat label="Current" value={account.currentBalance} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
              <h3 className="text-lg font-semibold">Sandbox transfer</h3>
              <p className="mt-1 text-sm text-slate-400">
                Move fake money between demo accounts using constructor, interface, and abstract-class
                transfer logic.
              </p>

              <form className="mt-4 space-y-3" onSubmit={handleTransferSubmit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm">
                    <span className="text-slate-300">From account</span>
                    <select
                      value={transferFromAccountId}
                      onChange={(event) => setTransferFromAccountId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      {accounts.map((account) => (
                        <option key={`from-${account.id}`} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <span className="text-slate-300">To account</span>
                    <select
                      value={transferToAccountId}
                      onChange={(event) => setTransferToAccountId(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 focus:border-cyan-400 focus:outline-none"
                    >
                      {accounts.map((account) => (
                        <option key={`to-${account.id}`} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[0.6fr_1.4fr]">
                  <label className="text-sm">
                    <span className="text-slate-300">Amount</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={transferAmount}
                      onChange={(event) => setTransferAmount(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      placeholder="0.00"
                    />
                  </label>

                  <label className="text-sm">
                    <span className="text-slate-300">Memo (optional)</span>
                    <input
                      type="text"
                      value={transferMemo}
                      onChange={(event) => setTransferMemo(event.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                      placeholder="Payroll allocation"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!canSubmitTransfer}
                  className="rounded-xl border border-cyan-300/40 bg-cyan-400/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Execute fake transfer
                </button>
              </form>

              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                  transferNotice?.kind === "error"
                    ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
                    : transferNotice?.kind === "success"
                      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 bg-slate-950/40 text-slate-400"
                }`}
              >
                {transferNotice?.message ?? "Sandbox only: this does not move real funds."}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
              <h3 className="text-lg font-semibold">Next phase</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Swap mock accounts for Plaid sandbox Link.</li>
                <li>Persist linked accounts and imported transactions.</li>
                <li>Turn reconciliation suggestions into real invoice and voucher matches.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Transaction review</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Reconciliation-style sandbox feed for {selectedAccount?.name}.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "matched", "review", "unmatched"] as const).map((filter) => {
                  const active = statusFilter === filter;
                  const label =
                    filter === "all"
                      ? "All"
                      : filter === "matched"
                        ? "Matched"
                        : filter === "review"
                          ? "Needs Review"
                          : "Unmatched";

                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setStatusFilter(filter)}
                      className={
                        active
                          ? "rounded-full border border-cyan-300/40 bg-cyan-400/15 px-3 py-1.5 text-xs font-semibold text-cyan-100"
                          : "rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {visibleTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-100">
                        {transaction.description}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                        {transaction.date} • {transaction.category}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={
                          transaction.amount >= 0
                            ? "text-sm font-semibold text-emerald-300"
                            : "text-sm font-semibold text-rose-300"
                        }
                      >
                        {transaction.amount >= 0 ? "+" : "-"}$
                        {Math.abs(transaction.amount).toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <StatusPill status={transaction.status} />
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
                    {transaction.suggestedMatch ?? "No suggestion yet."}
                  </div>
                </div>
              ))}

              {visibleTransactions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/30 p-6 text-center text-sm text-slate-400">
                  No sandbox transactions match this filter.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </DashboardLayout>
  );
}

function MetricCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.55)] backdrop-blur">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-500">{props.label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-100">{props.value}</div>
    </div>
  );
}

function AccountStat(props: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-100">
        ${props.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </div>
    </div>
  );
}

function StatusPill(props: { status: SandboxTransaction["status"] }) {
  const classes =
    props.status === "matched"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : props.status === "review"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : "border-rose-500/30 bg-rose-500/10 text-rose-200";

  const label =
    props.status === "matched"
      ? "Matched"
      : props.status === "review"
        ? "Needs review"
        : "Unmatched";

  return (
    <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}>
      {label}
    </span>
  );
}
