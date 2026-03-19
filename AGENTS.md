# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a TanStack Start (React 19) ERP/finance application that uses Drizzle ORM with Supabase-hosted PostgreSQL, and is designed to deploy on Cloudflare Workers. The dev server runs on port 3000.

### Running the dev server

```bash
npm run dev
```

See `package.json` for all available scripts (`dev`, `build`, `test`, `fmt`, `preview`, `deploy`).

### Key caveats

- **Supabase not required for basic dev**: The login page has a demo fallback (`demo@erp.com` / `password123`) and the dashboard uses localStorage when Supabase is unavailable. Server-side routes that write to the database (e.g. `/erp/insert-user`, `/erp/new-user`, `/invoice/new`) require a reachable `DATABASE_URL`.
- **Vitest has a pre-existing startup error**: `npm run test` fails with a `ReferenceError: module is not defined` in `tiny-warning` due to CJS/ESM incompatibility in the Cloudflare workerd-based Vite SSR environment. This is not caused by agent changes.
- **Pre-existing TypeScript errors**: `npx tsc --noEmit` reports errors in `src/routes/erp/new-user.tsx`, `src/routes/erp/new-user1.tsx`, `src/routes/erp/register.tsx`, and `src/routes/index.tsx`. These are pre-existing.
- **Environment variables**: Copy `.env.example` to `.env` for the `DATABASE_URL`. Client-side Supabase features need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
- **File-based routing**: TanStack Router auto-generates `src/routeTree.gen.ts` when you add/remove files in `src/routes/`. The dev server handles this automatically.
- **Formatter**: `npm run fmt` runs `oxfmt` (not ESLint/Prettier).
