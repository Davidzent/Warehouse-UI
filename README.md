<div align="center">

# Warehouse UI

**The clerk's side of the receiving dock.**

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)

A live demo by [David Guijosa](https://www.zntsns.com) · part of the
[portfolio monorepo](https://github.com/Davidzent/ZNTSNS) · served at `/warehouse/`

</div>

> **This repository is a read-only mirror.** Warehouse UI is developed in the
> [ZNTSNS monorepo](https://github.com/Davidzent/ZNTSNS/tree/main/apps/warehouse) and
> published here automatically on every change. It shares that workspace's ESLint
> and TypeScript configs and builds into its shared `dist/`, so it is not set up to
> install or build on its own — clone the monorepo to run it. Open issues and pull
> requests there.

A React front end for the [Warehouse Receiving API](https://github.com/Davidzent/Warehouse-API)
— a Spring Boot service that models inbound receiving properly: partial deliveries,
over-shipments, damaged units, and concurrent clerks.

This is not a mock. The deployed demo talks to the real API, running on **Render**
against a **Supabase** Postgres database.

---

## What it does

- **Sign in for a dev token** as `WAREHOUSE_CLERK` (may post receipts) or `VIEWER`
  (read only). Role comes back in the token and gates the UI.
- **Pull up a purchase order** and see ordered vs. already-received vs. remaining
  per line, plus the maximum still receivable right now.
- **Record a receipt line by line** — quantity received, damaged count, and
  destination location — with client-side checks before anything is posted.
- **Watch inventory move.** Posting refreshes the running totals and the PO's status.

## How it's built

- **React 19 + TypeScript on Vite**, strict mode, no state library — plain hooks.
- **One network module** ([`src/api/client.ts`](src/api/client.ts)) owns everything
  the rest of the app shouldn't repeat: attaching the bearer token, deciding what
  counts as failure, and turning the API's RFC 7807 `ProblemDetail` bodies into a
  typed `ApiError`. Field-level errors from the server render straight onto the
  matching inputs.
- **Receipt form state is derived, not synchronised.** Loading a different PO resets
  the line inputs during render rather than in an effect, so the form never paints a
  frame of the previous order's numbers.

## Configuration

| Variable | When | What it does |
|---|---|---|
| `VITE_API_TARGET` | dev | Origin the dev server proxies `/api` to. Keeps requests same-origin so the API needs no CORS setup. |
| `VITE_API_BASE_URL` | production | Absolute origin of the deployed API. **The build fails in CI if this is empty** — an empty value would aim every request at the hosting origin, which serves no API. |

Copy [`.env.example`](.env.example) to `.env.local` for local development.

## Run it

From the monorepo root:

```bash
pnpm install
```

```bash
pnpm --filter warehouse dev
```

Then open <http://localhost:5176/warehouse/> (override the port with `PORT`).

---

<div align="center">

Built by **David Guijosa** ·
[zntsns.com](https://www.zntsns.com) ·
[davidgin641@gmail.com](mailto:davidgin641@gmail.com)

</div>
