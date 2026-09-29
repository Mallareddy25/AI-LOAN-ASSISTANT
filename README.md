# AI Loan Information Assistant

A full-stack, AI-powered educational web application that helps students and first-time
borrowers understand loans — terminology, eligibility, required documents, EMI and
repayment — in plain language, without needing any financial background.

**Project code:** 4SU24CS045

> **Educational only.** The assistant explains concepts. It never approves loans, never
> guarantees eligibility, and never invents lender-specific interest rates. Real terms
> always come from the lender.

---

## What it does

| Area | Capability |
|------|-----------|
| Learn | Six knowledge modules — loan types, glossary, eligibility, documents, repayment, FAQs — each with detail pages and shareable slugs |
| Calculate | EMI, total interest, month-by-month amortisation schedule, and prepayment impact |
| Ask | A guarded AI chat that answers from a MySQL knowledge base, works with or without an OpenAI key, and shows its source |
| Track | Optional accounts with saved conversations, resumable chat history, and per-message feedback |
| Admin | Full CRUD over every knowledge collection, user role management, usage analytics, and AI-status reporting |

### Safety behaviour

The assistant is an **educator, never a lender representative**. It will not:

- guarantee or promise loan approval,
- impersonate a bank, lender, or official,
- ask for an OTP, PIN, password, CVV, or uploaded identity documents,
- state a specific lender's current interest rate or fee.

These are enforced in three independent layers: the system prompt, a server-side input
guardrail, and a server-side output guardrail. Blocked requests are refused rather than
answered. Replies are tagged with `riskFlags` and `riskSeverity` so the client can show
a warning when a response touches a sensitive area.

---

## Tech stack

- **Client** — React 18, Vite 5, React Router, Tailwind CSS, Framer Motion, React Three Fiber / three.js, Recharts
- **Server** — Node.js, Express 4, `mysql2`, JWT (access + refresh), bcrypt, Zod, Helmet, CORS, `express-rate-limit`
- **Database** — MySQL 8 (11 tables, seeded)
- **Tests** — Vitest (unit + live API contract), Playwright via system Chrome (browser E2E)

---

## Repository layout

```
loan-information-assistant/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/        # layout, chat, three/, common, landing
│   │   ├── context/           # Auth, Theme, Toast
│   │   ├── hooks/             # data fetching, auth redirect, count-up, media
│   │   ├── pages/             # 13 route-level screens
│   │   ├── services/          # axios API layer
│   │   ├── styles/            # Tailwind entry + global CSS
│   │   └── utils/             # scroll engine, formatting
│   └── scripts/               # route smoke / flow / responsive E2E
├── server/                    # Express API
│   ├── src/
│   │   ├── config/            # env + MySQL pool
│   │   ├── controllers/       # request handlers
│   │   ├── middleware/        # auth, error, validate
│   │   ├── models/            # SQL data access
│   │   ├── routes/            # route tables + Zod schemas
│   │   ├── services/          # ai, guardrails, calculator, offline KB
│   │   └── utils/             # sanitize, asyncHandler
│   ├── scripts/               # createDatabase, migrate, seed
│   └── tests/                 # Vitest suites
└── database/                  # schema.sql (safe to re-run), reset.sql, seed.sql
```

---

## Prerequisites

- Node.js 18+ (developed on 20.x)
- npm 10+
- MySQL 8 running on **port 3307**

## Setup

```bash
# 1. install workspace dependencies
npm install

# 2. create the database, apply the schema, and load seed data
npm run db:setup

# 3. create the server environment file
cp server/.env.example server/.env      # every value has a working default

# 4. start the API and the client together
npm run dev
```

| Service | URL |
|---------|-----|
| Client (Vite) | <http://localhost:5173> |
| API | <http://localhost:5050/api> |
| Health check | <http://localhost:5050/api/health> |

> The API deliberately uses **port 5050** — macOS AirPlay Receiver occupies 5000.

### Seeded logins

| Role | Email | Password |
|------|-------|----------|
| Student | `demo@student.test` | `Test@1234` |
| Admin | `admin@loanassistant.local` | `Admin@12345` |

Admins are redirected to `/admin` after sign-in; everyone else lands on `/dashboard`.

---

## Configuration

All server configuration lives in `server/.env`. The values that usually need changing:

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `5050` | API port |
| `DATABASE_HOST` / `DATABASE_PORT` | `127.0.0.1` / `3307` | MySQL location |
| `DATABASE_USER` / `DATABASE_PASSWORD` | `loan_app` / `loan_app_pw` | Non-root app account |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | dev values | **Change for any real deployment** |
| `OPENAI_API_KEY` | empty | Empty ⇒ offline knowledge-base mode |
| `OPENAI_MODEL` | `gpt-4o-mini` | Used when a key is present |
| `AI_CONTEXT_TURNS` / `AI_KB_CONTEXT_LIMIT` | `6` / `6` | How much history + knowledge is sent to the model |
| `RATE_LIMIT_MAX` | `300` | Requests per `RATE_LIMIT_WINDOW_MS` (15 min) |
| `AUTH_RATE_LIMIT_MAX` | `10` | Login/register attempts per window |
| `CHAT_RATE_LIMIT_MAX` | `20` | Chat messages per window |

### How the client reaches the API

The client calls a **same-origin** `/api` path. Vite proxies that to
`http://localhost:5050` in dev and preview, and in production Express serves both
`client/dist` and `/api` from one origin. That keeps development free of CORS
preflights and leaves no hard-coded host in the bundle. `client/.env` is therefore
optional:

| Variable | Default | Notes |
|----------|---------|-------|
| `VITE_API_URL` | `/api` | Same-origin path; change only for a split deployment |
| `VITE_DEV_API_TARGET` | `http://localhost:5050` | Where the dev/preview proxy forwards |

See `client/.env.example`. **No secret is ever exposed to the browser.**

### Working with and without an OpenAI key

With a key, chat is answered by the model using retrieved MySQL knowledge as context.
Without a key, the server answers from the same knowledge base through a deterministic
offline engine and labels the reply `offline_knowledge`. Every feature — including chat
history, feedback, sources, and guardrails — behaves identically in both modes, so the
application is fully demonstrable offline.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run API + client together |
| `npm run build` | Production build of the client |
| `npm start` | Run the API only (serves `client/dist` if present) |
| `npm test` | Vitest suites (75 tests across 7 files) |
| `npm run lint` | ESLint across client and server, zero-warning gate |
| `npm run db:setup` | Create database + migrate + seed |
| `npm run db:migrate` | Apply the schema. Non-destructive and safe to re-run |
| `npm run db:reset` | **Destructive.** Drop every table, rebuild, reseed |

### Browser end-to-end checks

These use `playwright-core` through your installed Chrome, so no browser download is
needed. `playwright-core` is a devDependency, so the scripts work from a fresh clone
without depending on a global install or a warm npm cache.

```bash
cd client
node scripts/route-smoke.mjs     # 17 routes render clean
node scripts/flow-test.mjs       # 29 end-to-end functional checks
node scripts/responsive-test.mjs # 29 mobile, reduced-motion, 3D, scroll, theme
node scripts/orb-check.mjs       # orb legibility in both themes, measured in pixels
node scripts/gl-lifecycle.mjs    # WebGL resources survive repeated mount cycles
```

From the repository root, `npm run verify` runs lint, the unit suite, a build and
all five browser suites. `npm run verify:ui` and `npm run verify:gl` run the two
visual checks on their own.

The orb and WebGL checks exist because neither can be answered by a text-contrast
audit. `orb-check.mjs` decodes a screenshot with the browser's own image decoder
and compares the core against the surrounding surface, so "is the glow still
visible on a light background" becomes a number. `gl-lifecycle.mjs` mounts and
unmounts the scene five times and watches both the DOM and the JS heap, which is
how a leaked WebGL context shows up before Chrome starts killing the oldest one.

Each script waits out the API rate-limit window automatically before it starts.

---

## Architecture notes

**Two themes, one token layer.** Every colour in the app resolves through CSS
variables that Tailwind reads (`rgb(var(--ink-950) / <alpha-value>)`), so switching
themes is a single `data-theme` attribute on `<html>` — no component knows which
theme is active. The token numbering is semantic rather than literal: `ink` is
always the surface family and `mist` is always the text family, with the light
theme inverting them, which is what lets one `text-mist-50` mean "primary text" in
both. The navbar has a light/dark toggle, the choice is persisted, and an inline
script in `index.html` applies it before first paint so the page never flashes the
wrong theme. Light is the default.

**One shared 3D canvas.** A single R3F scene is mounted by the route shell for immersive
routes (`/`, `/loans`, `/eligibility`, `/documents`, `/repayment`, `/calculator`) and is
absent on text-heavy routes like `/chat` and `/faqs`. It is loaded through a dynamic
import, so the ~810 kB WebGL bundle is only fetched when a user actually reaches an
immersive route. On mobile the scene scales down, and under
`prefers-reduced-motion` the content still renders in full with the heavy motion
disabled.

**Scroll engine.** A single observer tracks story sections, drives the navbar progress
hairline, and re-measures document height as lazy sections mount, so progress stays
proportional instead of saturating at 100%.

**Guardrails.** `server/src/services/guardrailService.js` runs on every chat request: it
refuses credential and OTP requests outright, detects impersonation and prompt
injection, flags personalised-advice questions, and annotates any fabricated or
universal interest-rate claim with a verification note.

**Refresh tokens rotate once and are watched for replay.** The refresh token used to be
a stateless JWT with nothing but a user id, so the same token could be replayed until
it expired and signing out had no server-side effect at all. Every refresh token now
carries a `jti` that matches a row in `refresh_tokens`, and that row is claimed with a
conditional `UPDATE ... WHERE used_at IS NULL` before a replacement is minted. A valid
signature is therefore not enough: the token also has to be unspent and unrevoked.

Replaying a token that was already exchanged means two copies of one credential are in
circulation, so the server assumes theft and revokes the entire *family* — the original
login and every rotation descended from it. That logs out the thief and the legitimate
user alike, which is the point: the session is burned and both parties sign in again.
Signing out revokes the family too, and changing a password revokes every session for
that account, since a password change is usually the response to a suspected compromise.

The client already funnelled concurrent 401s through a single in-flight refresh, so
rotation did not introduce a logout race there; the server's conditional update is the
backstop for parallel requests. Both tokens still live in `localStorage` and travel in
the request body, so this buys replay detection and revocation, **not** XSS resistance —
moving them to httpOnly cookies is a separate change that needs its own CSRF work.

**The schema is not a migration you run by accident.** `database/schema.sql` uses
`CREATE TABLE IF NOT EXISTS` and contains no `DROP`, so `npm run db:migrate` is safe
against a populated database. `database/reset.sql` holds the drops and is reachable only
through `npm run db:reset`, which says so twice before it destroys anything.

---

## Troubleshooting

**`Error: Port 5050 is already in use`**
Another copy of the API is still running. Stop it, or change `PORT` in `server/.env`.

**`ER_ACCESS_DENIED_ERROR` / `Access denied for user`**
MySQL credentials in `server/.env` do not match your server. Re-run `npm run db:setup`,
or point `DATABASE_HOST`/`DATABASE_PORT` at your instance.

**`ECONNREFUSED 127.0.0.1:3307`**
MySQL is not running on port 3307. Start it, or update the `DATABASE_*` values.

**Chat says "offline knowledge base"**
Expected when `OPENAI_API_KEY` is empty. Add the key and restart the API to enable the
model. Check `GET /api/health` → `ai.configured` to confirm.

**`429 Too Many Requests`**
You hit an intentional limit (10 auth / 20 chat per 15 minutes). Wait for
`Retry-After`, or raise `AUTH_RATE_LIMIT_MAX` / `CHAT_RATE_LIMIT_MAX` for local testing.

**`/api/health` reports `schemaReady: false`**
Tables are missing. Run `npm run db:setup`.

**Blank page or failed chunk load in production**
Assets are served from `client/dist`. Rebuild with `npm run build`, then serve it with
`npm start` or `npx vite preview`.

**Browser scripts cannot find Chrome**
They look for your installed Google Chrome. Install Chrome, or set `PLAYWRIGHT_BROWSERS_PATH`
and adjust the import path in `client/scripts/lib/harness.mjs`.

---

## Safety and privacy

- Passwords are hashed with bcrypt; the API never returns password hashes.
- JWT access and refresh tokens are stored separately, and refresh tokens rotate.
- Helmet sets standard security headers; CORS is restricted to the configured client URL.
- The OpenAI key is read only on the server and is never bundled into the client.
- Every request is logged with morgan, and all input is validated with Zod before it
  reaches a model or a controller.
