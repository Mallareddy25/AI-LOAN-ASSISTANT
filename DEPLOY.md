# Deploying

The app ships as **one** service: Express serves `client/dist` and `/api` from a
single origin, so there is no frontend host, no CORS, and no `VITE_API_URL` to
configure. The database is external — a free MySQL 8 instance on Aiven.

```
Render (web service, free)  ──TLS──▶  Aiven  (MySQL 8, free, 1 GB)
   or                               serves /api + SPA from one origin
Vercel (serverless, free)
```

**Either way you still need the Aiven database** — neither Render nor Vercel
provides MySQL. Section 1 is the same for both; only section 2 differs.


Total cost: **$0**. No card is required on either service.

> **Before you start — the free tiers have real limits.** Render's free web
> service sleeps after 15 minutes without traffic and needs roughly 30–60 s to
> wake, so the first visitor after a break waits. Aiven powers off an unused
> database. That is fine for a demo or a submission, and wrong for anything with
> real users. Railway Hobby ($5/month) has neither problem if that matters later.

---

## 1. Create the MySQL database on Aiven

1. Sign in at <https://console.aiven.io> with GitHub or Google.
2. **Create service → MySQL → Free plan.** Choose the region closest to you
   (the console is usually right — pick something in Asia if it is offered).
3. While the service builds, open the **Service URIs** tab. Copy the URI
   matching `mysql://`. It looks like:

   ```
   mysql://avnadmin:<password>@<host>:<port>/defaultdb?sslmode=require
   ```

   You need five values, which you can also read individually from the
   **Connection settings** panel:

   | `server/.env` variable | Where it comes from |
   |---|---|
   | `DATABASE_HOST` | host in the URI |
   | `DATABASE_PORT` | port in the URI (Aiven's own port, not 3306) |
   | `DATABASE_USER` | `avnadmin` |
   | `DATABASE_PASSWORD` | the password in the URI |
   | `DATABASE_NAME` | `defaultdb` (or the database you created) |

4. The URI already carries `?sslmode=require` — that is why `DATABASE_SSL=true`
   is set in `render.yaml`. The certificate check stays off unless you paste the
   CA into `DATABASE_SSL_CA`.

Keep the password handy. You will paste it into Render, not into the repository.

---

## 2. Create the compute service

### 2a. Render (long-running container)

**Option A — blueprint (one click).** In the Render dashboard choose
**New → Blueprint**, select `Mallareddy25/AI-LOAN-ASSISTANT`, and Render reads
`render.yaml`. It will prompt for the five database values, `CLIENT_URL`, and the
three seed-admin values.

**Option B — manual.** **New → Web Service → connect the repo**, then:

| Field | Value |
|---|---|
| Environment | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Plan | Free |

### 2b. Vercel (serverless)

Vercel does not run a long-lived process, so the app is deployed through
`api/index.js` — an entry point that exports the Express app directly instead of
calling `app.listen()`. `vercel.json` disables framework detection (so Vercel does
not mistake this for a static Vite site), builds the client, and includes
`client/dist` in the function bundle.

From the CLI, without connecting the GitHub repo:

```bash
npm i -g vercel
vercel login
vercel env add DATABASE_HOST production      # repeat for each variable below
vercel env add DATABASE_PORT production
vercel env add DATABASE_USER production
vercel env add DATABASE_PASSWORD production
vercel env add DATABASE_NAME production
vercel env add DATABASE_SSL production
vercel env add JWT_SECRET production
vercel env add JWT_REFRESH_SECRET production
vercel env add CLIENT_URL production
vercel env add SEED_ADMIN_EMAIL production
vercel env add SEED_ADMIN_PASSWORD production
vercel env add SEED_ADMIN_NAME production
vercel deploy --prod
```

Or **New Project → Import** the repository in the dashboard; `vercel.json` is
picked up automatically and the same variables are requested as environment
variables.

Two things differ from a long-running host:

- **No boot preflight.** `bootstrap()` never runs, so the schema check does not
  happen at startup. `GET /api/health` performs the same check live and reports
  `missingTables`, which is why section 3 is not optional.
- **Connections do not outlive an instance.** The MySQL pool is created per
  warm instance rather than once per process. Fine at this scale, but the free
  tier's connection limit is worth knowing about if usage grows.

Set `DATABASE_SSL=true` here too — Aiven requires TLS on Vercel exactly as it
does on Render.

Add the environment variables from the table above, plus:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | **generate** — `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a **different** random 48-byte hex string |
| `DATABASE_SSL` | `true` |
| `OPENAI_API_KEY` | leave empty — the assistant runs on the offline knowledge base |
| `CLIENT_URL` | your Render URL, once it exists (step 3) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` | a real admin account. **Do not reuse the demo values in a public deployment.** |

`JWT_SECRET` and `JWT_REFRESH_SECRET` have no development fallback on purpose —
the server refuses to boot in production without them, which is what stops a
default secret from ever reaching the internet.

The first build takes a few minutes: it installs both workspaces and builds the
React client into `client/dist`.

---

## 3. Apply the schema

The database is empty on first boot, so `/api/health` will report
`schemaReady: false` until the tables exist. Run the migration **from your
machine**, straight against Aiven over TLS:

```bash
# in a terminal, with the Aiven values exported
export DATABASE_HOST='<host>' DATABASE_PORT='<port>' \
       DATABASE_USER='avnadmin' DATABASE_PASSWORD='<password>' \
       DATABASE_NAME='defaultdb' DATABASE_SSL=true

npm run db:migrate   # createDatabase → schema.sql (idempotent)
npm run db:seed      # knowledge base, demo account, admin account
```

`db:migrate` is safe to re-run — every statement in `database/schema.sql` is
`IF NOT EXISTS`. `db:seed` replaces knowledge-base content, so re-running it is
fine before a demo and destructive to any edits you made in the admin panel.

If Aiven is asleep, the first connection wakes it; a 10 s `connectTimeout` is
plenty, but re-run the command if it fails once.

---

## 4. Verify

```bash
curl https://<your-app>.onrender.com/api/health
```

`status: "ok"`, `database.status: "up"`, and `missingTables: []` mean the deploy
is sound. Then open the app, sign in with the admin account, and ask the chatbot
something — the reply should be tagged `offline_knowledge`.

> Cold starts are the usual first-impression problem: a request to a sleeping
> free instance can sit for up to a minute before the app answers.

---

## 5. Updating a deployed app

Render redeploys automatically on every push to `main`. If you change
`database/schema.sql`, re-run `npm run db:migrate` — the deploy alone will not
touch the database.

---

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| Boot fails with `FATAL: environment variable JWT_SECRET is required` | Generate both secrets and add them to the service. |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DATABASE_USER`/`DATABASE_PASSWORD`, or the Aiven user is bound to a different host pattern. Copy the URI again. |
| `ER_NOT_SUPPORTED_AUTH_MODE` | Set `DATABASE_SSL=true`. Aiven's MySQL 8 requires TLS. |
| `Can't connect to local MySQL server through socket` | `DATABASE_HOST` is unset or wrong, or Aiven is asleep — re-run the command. |
| `missingTables` is not empty in `/api/health` | The schema was never applied. Run `npm run db:migrate` from step 3. |
| `getaddrinfo ENOTFOUND` in browser | `CLIENT_URL` does not match the deployed URL — the CORS allowlist rejects the browser. |
| First request after a break hangs for a minute | Free-instance cold start, not a bug. |
