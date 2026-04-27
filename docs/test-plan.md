# Core Production Test Plan (Layered Architecture)

This project is TypeScript/Vitest rather than Spring/Java. The table below maps core production classes/modules into equivalent layered architecture testing.

| Layer (Spring-style analogue) | Core production class/module | Test file | Test style | Substantial requirement covered | Trivial/mock replacements |
| --- | --- | --- | --- | --- | --- |
| Domain/Application Service | `SandboxTransferEngine` (`src/lib/banking/transfer.ts`) | `src/lib/banking/transfer.test.ts` | Unit + black-box behavior | Correct transfer math, fee behavior, ledger entries, and guard-rail failures | Flat fee policy mock (`FlatFeePolicy`) and deterministic id/time providers |
| Domain Utility | `voucher` functions (`src/lib/voucher.ts`) | `src/lib/voucher.test.ts` | Unit + black-box behavior | Status derivation (`rejected/pending/processed`) from date/description inputs, pay type formatting, rejected note formatting | Date-dependent behavior controlled via fixed input values |
| Domain Utility | `CounterSet` (`src/lib/counter.ts`) | `src/lib/counter.test.ts` | Unit | Reference-count retention/release semantics and membership behavior | N/A (pure in-memory class) |
| Domain Utility | `formatDate` (`src/lib/utils.ts`) | `src/lib/utils.test.ts` | Unit | Date serialization in strict `YYYY-MM-DD` format | N/A |
| Validation Layer | Schemas (`src/lib/validation.ts`) | `src/lib/validation.test.ts` | Unit + black-box behavior | Numeric/integer parsing, money precision limits, and password policy enforcement | N/A (`valibot` parser used directly) |
| Data Access Support | Invoice DB helpers (`src/lib/server/database/invoices.ts`) | `src/lib/server/database/invoices.test.ts` | Unit | Error reason extraction and insert fallback when `invoice_id` default is missing | Mock Drizzle-like DB object and insert/select chains |
| Data/Repository Logic | Payment status sync SQL wrapper (`src/lib/server/database/invoice-payment-status.ts`) | `src/lib/server/database/invoice-payment-status.test.ts` | Unit | Ensure payment-date reconciliation executes exactly once with provided DB executor | Mock SQL executor (`execute`) |

## Notes

- These tests focus on substantial requirements and keep integration plumbing mocked/stubbed where needed.
- The suite intentionally emphasizes deterministic unit behavior for business logic and data-layer orchestration without requiring a live database.
