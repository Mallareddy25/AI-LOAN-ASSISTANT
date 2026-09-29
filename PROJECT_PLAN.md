# PROJECT PLAN — AI Loan Information Assistant

**Project Code:** 4SU24CS045
**Type:** Full-stack AI-powered educational web application
**Status:** All 14 phases complete and verified. 75 automated tests (7 suites) plus 75 browser end-to-end checks (17 route + 29 flow + 29 responsive), 4 orb checks and 5 WebGL lifecycle checks pass against both the dev server and the production build.

---

## 1. Project Objective

Build a production-quality, AI-powered web application that helps students and general
users understand loans — terminology, eligibility concepts, required documents, EMI and
repayment — in plain language, without requiring prior financial knowledge.

### Non-negotiable product rules

| Rule | Implementation |
|------|----------------|
| Never guarantee loan approval | System prompt rule + server-side output guardrail + UI disclaimer |
| Never impersonate a bank/lender | System prompt rule; AI identity is "educational assistant" |
| Never request OTP / password / PIN / CVV | Input-side blocklist + prompt rule + output guardrail |
| Never invent lender-specific interest rates | Knowledge base contains **no** rates; AI is instructed to defer to lenders |
| API key must never reach the browser | Key read only in `server/config` → `services/aiService` |
| Works without an API key | Deterministic offline knowledge-base fallback engine |
| Educational only | Disclaimer component rendered on landing, chat, calculator, documents, about |

---

## 2. Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React 18 + Vite + Tailwind CSS  (client/)                   │
│  Router · AuthContext · ThemeContext · ToastContext          │
│  axios API layer (VITE_API_URL only — no secrets)            │
└───────────────────────────┬──────────────────────────────────┘
                            │  HTTPS / JSON / Bearer JWT
┌───────────────────────────▼──────────────────────────────────┐
│  Express 4 (server/)                                         │
│  helmet · cors · rate-limit · morgan · express.json          │
│  routes → controllers → models → mysql2/promise (parameterized)│
│  middleware: authenticate · authorize(admin) · validate · err │
│  services: aiService · tokenService · promptBuilder          │
└───────────────┬──────────────────────────┬───────────────────┘
                │                          │
        ┌───────▼────────┐        ┌────────▼──────────────────┐
        │  MySQL 8       │        │  OpenAI Chat Completions  │
        │  8 tables      │        │  (OPENAI_API_KEY, server  │
        │  FKs + indexes │        │   side only)              │
        └────────────────┘        └───────────────────────────┘
```

### Data flow for AI chat

```
React ChatInput
  → POST /api/chat  { message, conversationId? }
  → rateLimit → authenticate (optional guest) → validate
  → aiService.generateReply()
        ├─ OPENAI_API_KEY present  → OpenAI API (system prompt + KB context + history)
        └─ OPENAI_API_KEY missing  → offline retrieval engine over MySQL knowledge base
  → outputGuardrails.sanitize()
  → persist user message + assistant message
  → { reply, followUps, conversationId, meta: { source } }
  → MessageBubble (markdown rendered)
```

---

## 3. Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18, Vite 5, JavaScript (JSX) |
| Styling | Tailwind CSS 3, CSS custom properties for theming |
| Icons | lucide-react |
| Animation | framer-motion |
| Charts | recharts |
| Markdown | react-markdown + remark-gfm |
| Routing | react-router-dom 6 |
| HTTP | axios |
| Backend | Node.js 20, Express 4 |
| Database | MySQL 8, `mysql2/promise` connection pool |
| Auth | `bcryptjs` (12 rounds) + `jsonwebtoken` (access + refresh) |
| Validation | `zod` (single source of truth, shared with tests) |
| Security | helmet, cors allowlist, express-rate-limit, parameterized SQL |
| Logging | morgan + custom structured logger (redacts secrets) |
| AI | `openai` SDK v4, model `gpt-4o-mini` (configurable) |
| Tests | vitest + supertest |
| Tooling | npm workspaces, ESLint, Prettier |

---

## 4. Repository Layout

```
loan-information-assistant/
├── client/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .eslintrc.cjs
│   └── src/
│       ├── main.jsx  App.jsx  index.css
│       ├── components/
│       │   ├── common/      Button Card Input Select Badge Modal
│       │   │                Skeleton Spinner EmptyState ErrorState
│       │   │                ConfirmDialog Toast Tabs Accordion
│       │   │                Disclaimer SectionHeader PageHeader
│       │   │                SearchInput SegmentedControl StatChip
│       │   ├── layout/      Navbar Footer AppShell AuthLayout
│       │   │                AdminLayout ProtectedRoute
│       │   ├── landing/     Hero Features HowItWorks LoanTypes
│       │   │                FaqSection DisclaimerBand CtaBand
│       │   ├── chat/        ChatWindow MessageBubble ChatComposer
│       │   │                ConversationSidebar TypingIndicator
│       │   │                SuggestionChips EmptyChat
│       │   ├── calculator/  EmiCalculator EmiSummary AmortizationTable
│       │   │                BreakdownChart PrepaymentSimulator
│       │   └── admin/       AdminStatCard DataTable UsersPanel
│       │                    TermsPanel DocumentsPanel EligibilityPanel
│       │                    FaqsPanel InsightsPanel
│       ├── context/     AuthContext ThemeContext ToastContext
│       ├── hooks/       useAuth useTheme useToast useApi useDebounce
│       │                useLocalStorage useConversations useAdmin
│       ├── layouts/     RootLayout DashboardLayout
│       ├── pages/       Landing Login Register Chat ChatHistory Terms
│       │                TermDetail Eligibility Documents Repayment
│       │                Calculator LoanTypes LoanTypeDetail Compare
│       │                Profile About NotFound
│       │                admin/AdminDashboard AdminUsers AdminTerms
│       │                AdminDocuments AdminEligibility AdminFaqs
│       │                AdminInsights AdminSettings
│       ├── services/    api authService chatService loanService
│       │                termService documentService eligibilityService
│       │                calculatorService faqService adminService
│       └── utils/       cn formatters validation constants
├── server/
│   ├── app.js  server.js
│   ├── config/       env.js db.js logger.js openai.js
│   ├── controllers/  authController chatController loanController
│   │                termController documentController
│   │                eligibilityController calculatorController
│   │                faqController adminController healthController
│   ├── middleware/   authenticate.js authorize.js validate.js
│   │                errorHandler.js notFound.js rateLimiters.js
│   │                requestLogger.js
│   ├── models/       userModel conversationModel messageModel
│   │                loanTypeModel termModel documentModel
│   │                eligibilityModel faqModel statsModel
│   ├── routes/       index authRoutes chatRoutes loanRoutes
│   │                termRoutes documentRoutes eligibilityRoutes
│   │                calculatorRoutes faqRoutes adminRoutes healthRoutes
│   ├── services/     aiService.js promptService.js knowledgeService.js
│   │                offlineEngine.js guardrailService.js
│   │                tokenService.js
│   ├── prompts/      systemPrompt.js
│   ├── utils/        ApiError.js asyncHandler.js pagination.js
│   │                sanitize.js sql.js
│   ├── tests/        auth.test.js chat.test.js calculator.test.js
│   │                loans.test.js terms.test.js admin.test.js
│   │                db.test.js unit.test.js setup.js
│   └── package.json
├── database/
│   ├── schema.sql
│   └── seed.sql
├── .env.example  .gitignore  .editorconfig
├── package.json  README.md  PROJECT_PLAN.md
```

---

## 5. Database Design (MySQL)

```
users ──1:N──> conversations ──1:N──> messages
                                            │
users (user_id) ────────────────────────────┘  (optional FK for admin/user messages)

loan_types ──1:N──> loan_terms        (loan_term_relations: M:N between loan_types and terms)
                 ──1:N──> documents    (document_loan_types: M:N)
                 ──1:N──> eligibility_factors
loan_types ──1:N──> faqs
```

| Table | Purpose | Key indexes |
|-------|---------|-------------|
| `users` | accounts, `role` ENUM('USER','ADMIN') | UNIQUE(email) |
| `conversations` | chat sessions per user | INDEX(user_id, updated_at) |
| `messages` | user/assistant turns, tokens, latency | INDEX(conversation_id, created_at) |
| `loan_types` | 6 loan categories with educational content | UNIQUE(slug) |
| `loan_terms` | glossary: definition, detail, example, related | FULLTEXT(term, definition, explanation) |
| `documents` | document checklist with categories | INDEX(category) |
| `eligibility_factors` | educational eligibility factors | INDEX(category) |
| `faqs` | landing + in-app FAQ | INDEX(category) |
| `loan_type_terms` | M:N bridge | FK indexes |
| `loan_type_documents` | M:N bridge | FK indexes |

All tables use `utf8mb4_unicode_ci`, `TIMESTAMP`/`DATETIME` with defaults, FKs with
`ON DELETE CASCADE`, and snake_case columns mapped to camelCase in the model layer.

---

## 6. API Surface

### Public
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/health` | Liveness + subsystem status (db, ai configured) |
| POST | `/api/auth/register` | Create account, returns tokens |
| POST | `/api/auth/login` | Verify credentials, returns tokens |
| GET | `/api/auth/me` | Current user (requires token) |
| PATCH | `/api/auth/me` | Update name |
| POST | `/api/auth/change-password` | Change password |
| POST | `/api/auth/refresh` | Rotate access token |
| POST | `/api/auth/logout` | Client-side token purge acknowledgement |
| GET | `/api/loans` · `/api/loans/:idOrSlug` | Loan type catalogue |
| GET | `/api/terms` · `/api/terms/:idOrSlug` | Glossary with search/filter/pagination |
| GET | `/api/documents` | Document checklist with filters |
| GET | `/api/eligibility` | Eligibility factors + estimator metadata |
| POST | `/api/eligibility/estimate` | **Educational** estimate (not an approval decision) |
| GET | `/api/faqs` | FAQs |
| GET | `/api/calculator/emi` | EMI + amortization schedule |
| POST | `/api/chat` | AI answer (guest allowed, rate-limited) |
| GET | `/api/chat/suggestions` | Starter prompts by category |

### Authenticated
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/chat/conversations` | List user's conversations |
| GET | `/api/chat/conversations/:id` | Conversation + messages |
| PATCH | `/api/chat/conversations/:id` | Rename |
| DELETE | `/api/chat/conversations/:id` | Delete |

### Admin (`ADMIN` role)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/stats` | Dashboard aggregates + most asked topics |
| GET/PATCH/DELETE | `/api/admin/users[/:id]` | Manage users, promote/demote |
| GET/POST/PUT/DELETE | `/api/admin/terms[/:id]` | Glossary CRUD |
| GET/POST/PUT/DELETE | `/api/admin/loans[/:id]` | Loan types CRUD |
| GET/POST/PUT/DELETE | `/api/admin/documents[/:id]` | Documents CRUD |
| GET/POST/PUT/DELETE | `/api/admin/eligibility[/:id]` | Eligibility factors CRUD |
| GET/POST/PUT/DELETE | `/api/admin/faqs[/:id]` | FAQ CRUD |

---

## 7. Execution Phases

### PHASE 1 — Project setup + architecture
- npm workspaces root, `client/`, `server/`
- Vite + Tailwind + ESLint/Prettier config
- `.env.example`, `.gitignore`, `.editorconfig`
- Folder scaffolding

**Exit criteria:** `npm install` succeeds in both workspaces; `npm run dev` boots both.

### PHASE 2 — Database + seed data
- `database/schema.sql` — 12 tables, FKs, indexes. `CREATE TABLE IF NOT EXISTS`, no drops
- `database/reset.sql` — the destructive drops, reached only via `npm run db:reset`
- `database/seed.sql` — 6 loan types, 26 terms, 23 documents, 11 eligibility
  factors, 12 FAQs (verified row counts)
- `npm run db:setup` script (create → migrate → seed)

**Exit criteria:** schema imports cleanly; seed row counts verified.

### PHASE 3 — Backend + authentication
- config layer with fail-fast env validation
- mysql2 pool + health probe
- zod validation middleware
- bcrypt hashing (cost 12), JWT access (2h) + refresh (7d)
- `authenticate` / `authorize('ADMIN')` middleware
- global error handler (no stack traces in production)

**Exit criteria:** register → login → `/me` round-trip works; 401/403/409 correct.

### PHASE 4 — AI chatbot
- `prompts/systemPrompt.js` with all safety rules
- `services/aiService.js` — OpenAI SDK, retries, timeout, token budget
- `services/knowledgeService.js` — retrieve relevant KB context per question
- `services/offlineEngine.js` — deterministic fallback when no API key
- `services/guardrailService.js` — output sanitization (credential requests,
  approval guarantees), follow-up suggestion generation
- conversation + message persistence

**Exit criteria:** chat works with and without a key; guardrails tested.

### PHASE 5 — Knowledge + calculator APIs
- CRUD-read models for loans/terms/documents/eligibility/faqs
- EMI engine (shared with client for instant feedback) + amortization schedule
- Educational eligibility estimator with explicit non-approval labelling

**Exit criteria:** verified against known EMI fixtures.

### PHASE 6 — Frontend foundation
- Theme (dark/light) with CSS variables, Auth/Toast contexts
- axios layer with token injection, 401 auto-refresh, unified error shape
- AppShell/Navbar/Footer, ProtectedRoute, AdminRoute
- Design system primitives (Button, Card, Input, Modal, Skeleton, …)

**Exit criteria:** navigable shell, dark/light toggle, responsive at 375/768/1280.

### PHASE 7 — Frontend pages
13 route-level screens: Landing (hero / features / how-it-works / loan types /
FAQ / disclaimer), Auth (login + register), Chat, Loans + loan detail, Glossary +
term detail, Eligibility, Documents, Repayment, Calculator, FAQs, Dashboard
(history + stats), Admin, plus a 404. Chat carries a typing indicator, markdown
rendering, suggested prompts, source badges and per-message feedback.

**Exit criteria:** every route renders with loading/empty/error states. Met —
`route-smoke.mjs` asserts 17 route renders with no console or network errors.

### PHASE 8 — Admin dashboard
Stat cards, most-asked-topics insights, CRUD panels with search/filter/
confirm dialogs for users, terms, loans, documents, eligibility, FAQs.

**Exit criteria:** all CRUD operations persist and are visible to public APIs.
Met — create/update/delete verified end to end through the real API for glossary
terms, documents and FAQs, with the generated rows removed afterwards. Slugs are
optional in the UI and generated server-side with numeric collision suffixes
(`-2`, `-3`, …).

### PHASE 9 — Security + validation
- Rate limits (chat 20/15min, auth 10/15min, global 300/15min)
- Helmet, CORS allowlist, body size limit
- Prompt-injection resistance, credential-request blocking
- SQL parameterization audit, secret redaction in logs
- Per-surface Content Security Policy: a locked-down `default-src 'none'` policy
  for JSON endpoints, and a document policy for the SPA that permits its own
  scripts, styles and same-origin XHR
- CORS treats a same-origin request as legitimate, because the production build
  is served by this same process and Vite marks its modulepreload links
  `crossorigin`

**Exit criteria:** security checklist passes. Met — credential requests, OTP
requests, impersonation, prompt injection and fabricated rate claims are all
covered by unit tests and live checks, and the two production-only deployment
bugs above are pinned by `server/tests/productionDeploy.test.mjs`.

### PHASE 10 — Testing + debugging
Vitest (75 tests, 7 suites): EMI maths, guardrails, slug generation, live API,
contracts against MySQL, and the production single-origin deployment. Three
Playwright scripts drive real Chrome against the running app: `route-smoke.mjs`
(17 routes), `flow-test.mjs` (29 functional checks), `responsive-test.mjs`
(29 mobile / reduced-motion / 3D / scroll / theme checks, including WCAG AA
contrast assertions in both themes).

**Exit criteria:** all tests green; production build succeeds. Met — and the
production build is additionally exercised as a real deployment (Express
serving `client/dist` and the API from one origin), which is how the CSP and
CORS defects above were found.

### PHASE 11 — Documentation
`README.md` (overview, features, stack, architecture, structure, prerequisites,
install, MySQL setup, env vars, run commands, API reference, AI configuration,
security notes, troubleshooting, future enhancements), `PROJECT_PLAN.md`.

**Exit criteria:** a fresh clone can be run by following README commands only.

---

## 8. Quality Gates

| Gate | Check | Command |
|------|-------|---------|
| Server boots | No import/syntax errors | `npm --workspace server run dev` |
| Client builds | Vite production build | `npm --workspace client run build` |
| Lint clean | ESLint across workspaces | `npm run lint` |
| Tests pass | Vitest suites | `npm --workspace server test` |
| DB reachable | Pool + query | `GET /api/health` → `database: "up"` |
| Auth works | register/login/me | scripted smoke test |
| Chat works | POST /api/chat | scripted smoke test |
| EMI correct | Fixture comparison | unit tests |
| Chat works in the production build | Single-origin deployment, browser | `npm --workspace server test` |
| 3D stays off non-immersive routes | WebGL chunk is not requested | production network trace |
| Routes render | 17 route smoke test | `node client/scripts/route-smoke.mjs` |
| Flows work | 19 functional checks | `node client/scripts/flow-test.mjs` |
| Responsive + a11y + themes | 29 checks | `node client/scripts/responsive-test.mjs` |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| No OpenAI key available for demo | Offline retrieval engine returns real KB-derived answers; UI shows an explicit "AI not configured" notice |
| Lender rates change | No rates stored; AI instructed to defer to lenders; UI disclaimer |
| Estimator mistaken for approval | Dedicated non-approval banner + API response `disclaimer` field + admin config |
| MySQL not installed locally | README covers install for macOS/Windows/Linux; schema is plain SQL |
| macOS case-insensitive FS breaks MySQL undo tablespaces | Documented in README troubleshooting |

---

## 10. Deliverables Checklist

- [x] `PROJECT_PLAN.md`
- [x] Monorepo scaffolding with npm workspaces
- [x] MySQL schema (11 tables) + comprehensive seed data
- [x] Express API with auth, knowledge, calculator, chat, admin modules
- [x] AI service with system prompt, guardrails, offline fallback
- [x] React app: landing, auth, chat, 6 knowledge modules with detail pages, calculator, dashboard, admin
- [x] Admin dashboard with full CRUD, usage analytics and AI status
- [x] Dark/light theme via a single CSS-variable token layer, with a persisted
      toggle, no first-paint flash, and AA contrast in both themes
- [x] Responsive, accessible, reduced-motion aware
- [x] Shared lazily-loaded 3D scene on immersive routes only
- [x] 75 automated tests (7 suites) + 75 browser end-to-end checks (17 route + 29 flow + 29 responsive) + 4 orb + 5 WebGL
- [x] `README.md` with setup, env reference, architecture notes and troubleshooting
- [x] `server/.env.example` and `client/.env.example` templates
- [x] Verified production deployment (build, single origin, deep links, assets)

## Phase 12 — Hardening and robustness

Findings from re-auditing the finished build rather than adding features.

**Admin form and API disagreed about required fields.** The glossary and
eligibility forms presented `detailedExplanation` and `explanation` as optional,
but the Zod schemas require at least 20 characters. An admin filling in the form
as labelled got a bare 422 with no indication of which field was at fault. Both
fields are now marked required, `<textarea>` and `<select>` carry the `required`
attribute (it was only on `<input>`), `save()` checks required fields before
sending, and any server-side field error is rendered under the field it belongs
to instead of a single message at the top of the dialog. The flow test now creates
a glossary term through the real form, proves the incomplete draft never leaves the
browser, and cleans up after itself.

**The pre-paint theme script was blocked in production.** `index.html` resolved the
stored theme with an inline `<script>`, while the production CSP allows
`script-src 'self'` with no `'unsafe-inline'` and no hashes. Every production page
logged a CSP violation, and anyone who had chosen the dark theme got a light flash
before React mounted — the exact thing the script existed to prevent. It now lives
in `client/public/theme-init.js` and is loaded as a classic, render-blocking script,
so it still runs before the first paint. Two production tests guard it.

**The light theme had a dark pre-paint background.** The inline stylesheet painted
`html` with the dark surface before the stylesheet loaded, so light-theme visitors
saw a dark rectangle on a cold load. The placeholder now follows the theme that
`theme-init.js` has already set.

**The dev client origin leaked into the production policy.** `connect-src` always
included the configured client URL, so a production build allowed XHR to
`localhost:5173`. It is now added only when the client really is a separate origin.

**The login redirect was open.** `?next=` was filtered for a leading `/` and no
`//`, but browsers normalise `\` to `/`, so `?next=/\evil.example` was a
protocol-relative URL in disguise — precisely the advisory open-redirect class that
`react-router-dom` is still flagged for. `safeInternalPath()` in
`client/src/hooks/useAuthRedirect.js` now rejects backslashes and control characters
and accepts only single-slash-prefixed paths, verified by 19 cases plus an
end-to-end sign-in that would leave the site.

**The browser scripts could not run on a fresh clone.** They imported
`playwright-core` by absolute path from a warm npm cache. `playwright-core` is now
a devDependency and the scripts import it by name.

## Phase 13 — Visual layer, measured rather than eyeballed

Two open questions from Phase 12 could not be settled by looking at a screenshot,
because a text-contrast audit never sees decorative pixels and a reviewer who
cannot see the image has to guess. Both were turned into measurements instead.

**The assistant orb in the light theme.** `AIOrb` was the last significant
component with hardcoded `rgba()` colours: the outer bloom, the conic ring and
the core glow were all literals tuned for a dark surface. Alpha blending cuts both
ways, and the same value that reads as a glow on a near-black page washes out over
a near-white one, so these now come from `--orb-*` tokens with per-theme values.

Those tokens are a consistency change, not a legibility fix, and the measurement
says so plainly. `client/scripts/orb-check.mjs` decodes a screenshot of the hero orb
with the browser's own image decoder and compares the core against the surrounding
surface. Reverting the light values and re-measuring moved the bloom from 1.118:1
to 1.129:1 against its background and left the core contrast at 2.45:1 — a change
too small to claim as an improvement. The orb was already legible on the light
theme. The refactor is kept because the orb should follow the same theme layer as
everything else, not because it fixed something.

The asymmetry is inherent and worth recording: the same orb measures 2.45:1 on the
light theme and 8.73:1 on the dark one, because a gold sphere has far less luminance
range available against near-white than against near-black.

**WebGL resource lifecycle.** The shared scene mounts on six routes and unmounts on
the rest, so every navigation cycles the renderer. The open question was whether
geometries, textures and the GL context itself are actually released.
`client/scripts/gl-lifecycle.mjs` mounts and unmounts five times and asserts the
canvas leaves the DOM, the heap stays flat, and Chrome never reports a context
problem. It does not leak: 0.00 MB per cycle, no WebGL warnings, no console errors.
The existing `disposeTextureCache()` on unmount and the `frameloop="never"` switch
when the scene scrolls out of view are doing their job.

**The flow test was passing on leftover data.** Its dashboard assertion wanted
non-zero conversation counts, but it never made the demo user ask anything, so it
only held when earlier runs had left conversations behind — and failed on a clean
database. The test now asks a question as the demo user, then asserts the tiles,
so the check depends on the run rather than on database state. It also deletes
whatever it created at the end, which is why a run now leaves zero rows. The
cleanup initially deleted nothing because it reused the token left in
`localStorage`, which by then belonged to the admin; the member's token is now
captured while that session is live.

Both scripts are wired into `npm run verify`, alongside lint, the unit suite, a
build and the three existing browser suites.

## Phase 14 — Auth boundaries and refresh-token rotation

Two things were wrong with authentication. The second was found only because the
first was fixed and the tests were re-run.

**Admin authorisation was structurally, not incidentally, enforced.** A live probe
sent 19 representative `/api/admin/*` requests as anonymous, as a member and as an
admin: 401, 403 and reach-the-handler respectively. The permanent suite
(`server/tests/authorization.test.mjs`) then added a check that parses
`adminRoutes.js` and fails if any `router.*` call appears above the
`authorize('ADMIN')` line, because an endpoint list that is correct today is
still one careless insertion away from being wrong tomorrow. That check was
mutation-tested: an `router.get('/ungated-probe', ...)` was injected above the
gate, the suite failed naming the line, and the file was restored.

**Refresh tokens were stateless and therefore unenforceable.** The old refresh JWT
carried only `{ sub, type }`. Nothing could tell a first use from a hundredth,
rotating was impossible, and logout was a no-op that returned 200 while the token
stayed perfectly valid — the client simply forgot about it. Each refresh token now
carries a `jti` matching a `refresh_tokens` row, and a replacement is minted only
after a conditional `UPDATE ... WHERE used_at IS NULL` claims the current row.
A replayed token revokes its whole family, on the assumption that two copies of
one credential means one of them is an attacker. Logout revokes the family;
changing a password revokes every session for the account.

The client already collapsed concurrent 401s onto one in-flight refresh, so
rotation did not introduce a logout race in the browser. The server's conditional
update is the backstop for parallel requests. Both tokens still sit in
`localStorage` and travel in the request body, so this is replay detection and
revocation, **not** XSS resistance; httpOnly cookies remain open work.

**The migration was destroying the data it was supposed to preserve.** Applying
`database/schema.sql` to add one table dropped all eleven others first, taking
the seeded knowledge base and both accounts with it. `schema.sql` now uses
`CREATE TABLE IF NOT EXISTS` and contains no `DROP`; the drops moved to
`database/reset.sql`, reachable only through an explicitly named
`npm run db:reset`. Verified by inserting a marker row, re-running
`db:migrate`, and confirming the row survived. The demo account was also
unprovisioned by any script even though the browser suites and this document
depend on it, so `db:seed` now creates it alongside the knowledge base.

## Dependency audit

`npm audit` reports 7 advisories. Assessed individually rather than blanket-patched:

| Package | Severity | Reaches production? | Action |
|---|---|---|---|
| `vitest` | critical | No — test runner, and only when `--ui` listens on a network | left pinned; we never run Vitest UI |
| `vite` | high | No — dev server only; two of its four advisories are Windows-only | left pinned |
| `esbuild`, `vite-node`, `@vitest/mocker` | moderate | No — dev/build toolchain | left pinned |
| `react-router-dom` | moderate | Yes | see below |

The `react-router-dom` advisory covers an open redirect through `<Link>` and
`useNavigate`, which the app did exercise: sign-in honours a `?next=` target.
The library's own guard was already bypassable with a backslash (`/\evil.example`
is a protocol-relative URL once the browser normalises it), so the check was moved
into our code.

`client/src/hooks/useAuthRedirect.js` now accepts a `?next=` value only when it is
a single-slash-prefixed path containing no backslash and no control characters. A
hostile `?next=` is ignored and the user lands on the normal role-based page. This
is checked end to end by a sign-in that presents `?next=/\evil.example` and
asserts the browser stays on localhost.

The remaining advisory has no non-breaking fix — it needs a React Router major
bump — so the application-level guard is the mitigation, and the upgrade is left as
a deliberate follow-up rather than a surprise `--force`.
