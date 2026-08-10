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

- **Sign in for a development token** as a clerk or a viewer. The role that gates the
  UI is read from the token's own `roles` claim rather than the response that carried
  it — the endpoint accepts `CLERK` but mints `WAREHOUSE_CLERK`, and only the second
  one authorises a post.
- **Look up a purchase order by id.** The API exposes no list or search route, so this
  is a lookup, not a browse. Each line shows what was ordered, what has already
  arrived, what is still expected, and how many more units the 110% over-receipt rule
  will accept right now.
- **Record a delivery line by line** — quantity, damaged count, put-away location. As
  the clerk types, every line shows what actually becomes stock: damaged units count
  as received, because they did arrive, but they never reach inventory. That split is
  the rule people get wrong, so it carries the most visual weight on the screen.
- **Read-only when an order can't take a delivery.** A closed or cancelled PO says
  which it is instead of offering a form the server would reject.
- **Confirm what was recorded** by receipt id, and watch stock and locations follow.

## How it's built

- **React 19 + TypeScript on Vite**, strict mode, no state library and no router —
  five panels with no list routes to link between.
- **One network module** ([`src/api/client.ts`](src/api/client.ts)) owns everything the
  rest of the app shouldn't repeat: the base URL, attaching the bearer token, deciding
  what counts as failure, and turning the API's RFC 7807 `ProblemDetail` bodies into a
  typed `ApiError`.
- **A cold start is explained, not endured.** The API sleeps on free hosting, so the first
  request after an idle spell can take the better part of a minute. Requests abort at 90s,
  and anything still running after 3s puts a message on the sign-in panel — otherwise the
  button just spins and the demo reads as broken.
- **Only the newest response may write.** Two refreshes race, and the slower one settling
  last would overwrite fresher rows with stale ones — silently, since both succeeded.
  [`useLatestRequest`](src/hooks/useLatestRequest.ts) hands out a ticket per request and
  every panel checks it before touching state.
- **Auth lives in one directory.** [`src/auth/`](src/auth) acquires the token, decodes
  its claims, stores it, hands it to the client, and clears it — on sign-out and on any
  `401`. No component ever receives a token, so swapping the development endpoint for a
  real identity provider touches this directory and nothing else. It is a shared-secret
  HS256 token, so it lives in `sessionStorage` and dies with the tab.
- **Errors are translated, never dumped.** Field errors render on the input that caused
  them — including `damagedWithinReceived`, which is named after a Bean Validation
  getter and matches no field on the form. Everything else becomes a sentence: a
  business conflict is passed through verbatim, because the server writes those for
  people, a `429` carries the wait the API asks for, and a `500` never surfaces what
  actually broke.
- **Receipt form state is derived, not synchronised.** Loading a different PO resets the
  line inputs during render rather than in an effect, so the form never paints a frame
  of the previous order's numbers.
- **Colour carries exactly one meaning.** Green, amber and red are reserved for stock
  disposition; interaction colour sits outside that range so a focus ring can never be
  read as a signal.
- **Built for a dock, not a desk.** 44px targets, visible keyboard focus, no motion,
  every control named, and quantity fields that ignore the scroll wheel — a mis-scroll
  over a focused number input silently changes what gets received, and the server
  cannot tell that from a real count.

## Configuration

| Variable | When | What it does |
|---|---|---|
| `VITE_API_TARGET` | dev | Origin the dev server proxies `/api` to. The proxy also strips the browser's `Origin` header: the API's CORS allowlist holds production origins only, so a forwarded one is rejected. Removing it makes the request genuinely same-origin, which is the point of proxying. |
| `VITE_API_BASE_URL` | production | Absolute origin of the deployed API. **The build fails in CI if this is empty** — an empty value would aim every request at the hosting origin, which serves no API. |

Copy [`.env.example`](.env.example) to `.env.local` for local development.

The API rate-limits per client IP — token minting most strictly, then writes, then reads —
and answers a refusal with `429`, a `Retry-After`, and a `ProblemDetail` whose `detail`
names the wait in seconds. That message is what the UI shows.

## Tests

Vitest on jsdom, run from the repo root:

```bash
pnpm --filter warehouse test
```

25 tests over three areas:

- **The request-ordering guard**, including the race it exists for — a slow response
  settling after a newer one must not overwrite it.
- **The inventory panel** — loading, empty stock, and surfacing a failure rather than
  stale rows.
- **The receipt quantity rules**, which is where the domain actually lives: damaged units
  subtracted from what reaches stock, the 110% cap refused, an over-shipment *inside* the
  cap warned about but still allowed, and `damagedWithinReceived` landing on the damaged
  input rather than on no input at all.

The last group is checked by mutation, not just by passing: deleting the damaged split or
the field-error alias fails exactly those tests and nothing else.
Remove the guard and exactly that test fails.

Vitest strips types rather than checking them, so `pnpm --filter warehouse build` is still
what catches a type error in a test file.

## Run it

From the monorepo root:

```bash
pnpm install
```

```bash
pnpm --filter warehouse dev
```

Then open <http://localhost:5176/warehouse/> (override the port with `PORT`).

The API has to be running on `http://localhost:8080` under its `dev` profile — that
profile is what exposes the token endpoint:

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

## License

Released under the **ISC License** — see [`LICENSE`](LICENSE).

---

<div align="center">

Built by **David Guijosa** ·
[zntsns.com](https://www.zntsns.com) ·
[davidgin641@gmail.com](mailto:davidgin641@gmail.com)

</div>
