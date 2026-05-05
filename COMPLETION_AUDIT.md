# PhenoAgent Completion Audit

Audit date: 2026-05-05

Objective: read `AGENTS.md`, implement PhenoAgent through the specified full-stack app, and publish a Netlify page that includes a demo.

## Current Status

- Demo frontend: complete and deployed at `/demo`.
- Local app implementation: complete for the specified frontend, Convex functions, and thin Express server.
- Convex production functions and auth keys: deployed to `https://nautical-seahorse-122.convex.cloud`.
- Hosted API: deployed on Netlify Functions under `https://phenoagent-demo.netlify.app/api/*`.
- Full live production operation: blocked by external AI/provider credentials and Garmin approval.

Live demo:

- Production site: https://phenoagent-demo.netlify.app
- Latest verified deploy: https://69f9c7e2fc98b13a39c8d428--phenoagent-demo.netlify.app
- Netlify site: `phenoagent-demo`

## Verification Evidence

- `npm run typecheck` passed at repo root.
- `npm run build` passed at repo root.
- `npm run verify` passed at repo root and covers the local build gates plus deployed demo checks.
- `npm run verify` now includes Express runtime smoke checks: `/health` returns OK, `/api/pheno/chat` rejects missing bearer tokens with 401, Garmin auth remains explicitly 501 until approval, and authenticated WHOOP/Oura auth starts return explicit 501 responses while credentials are absent.
- Express `/api/pheno/chat` authenticates first and then applies `express-rate-limit` at 20 requests/minute keyed by the verified Convex token, satisfying the per-user rate-limit requirement.
- `npm run verify` checks hosted WHOOP/Oura GET and POST auth routes return explicit 501 responses while provider credentials are absent.
- Hosted WHOOP/Oura auth supports spec-compatible `GET /api/integrations/*/auth` plus frontend-friendly `POST /api/integrations/*/auth`; the React app uses POST so it can include the Convex bearer token and then navigate to the returned provider URL.
- The local Express WHOOP/Oura callback flow also uses Convex-backed OAuth state via `integrations:createOAuthState` and `integrations:completeOAuthIntegration`; the previous in-memory bearer-token state helper was removed.
- `CONVEX_DEPLOYMENT=prod:nautical-seahorse-122 npx convex deploy --typecheck try --message "PhenoAgent implementation deploy"` succeeded.
- `npx @convex-dev/auth --prod --web-server-url https://phenoagent-demo.netlify.app --skip-git-check` succeeded.
- `npm run verify` checks production Convex auth discovery and JWKS endpoints at `https://nautical-seahorse-122.convex.site`.
- `npm run verify:auth` created a disposable password account, confirmed `auth:isAuthenticated`, and ran an authenticated `pheno:getReadinessScore` query.
- `npm run verify:data` created a disposable password account, wrote health records across all core Convex modules, read them back, and ran readiness/daily brief functions.
- `npm run verify:api` created a disposable password account, called the hosted Netlify `/api/pheno/chat` SSE route with a bearer token, and confirmed the exchange persisted to Convex.
- `npm run verify:oauth` created a disposable password account, created an OAuth state, completed an integration with fake provider tokens, and confirmed replay protection.
- `npm run verify:production-ready` checks Convex production, Netlify production, and local deploy/provider credential presence without printing secret values; it currently fails because external credentials and Render deploy access are absent.
- `.github/workflows/ci.yml` provides GitHub-backed typecheck, build, and dependency audit validation once this implementation is published to the confirmed GitHub repo/branch.
- Production Convex `SITE_URL` is set to `https://phenoagent-demo.netlify.app`; the dev Convex deployment remains pointed at `http://localhost:5173` for local development.
- `CONVEX_DEPLOYMENT=prod:nautical-seahorse-122 npx convex deploy --typecheck try --message "Fix Convex Auth user IDs for health data writes"` succeeded after changing `convex/lib.ts` to use `getAuthUserId`.
- `CONVEX_DEPLOYMENT=prod:nautical-seahorse-122 npx convex deploy --typecheck try --message "Add OAuth state storage for hosted integrations"` succeeded.
- `CONVEX_DEPLOYMENT=prod:nautical-seahorse-122 npx convex deploy --typecheck try --message "Store OAuth user IDs instead of bearer tokens"` succeeded.
- `CONVEX_DEPLOYMENT=prod:nautical-seahorse-122 npx convex deploy --typecheck try --message "Add Convex pdf-parse extraction"` succeeded.
- `npx netlify deploy --prod` succeeded with functions deploy `69f9c7e2fc98b13a39c8d428`.
- `npx convex dev --once` passed and generated Convex function types.
- `npm audit --audit-level=moderate` passed at repo root, `client/`, and `server/`.
- Live route checks returned HTTP 200 for:
  - `/`
  - `/demo`
  - `/dashboard`
  - `/sleep`
  - `/nutrition`
  - `/training`
  - `/bloodwork`
  - `/supplements`
  - `/journal`
  - `/pheno`
  - `/integrations`
  - `/settings`
  - `/login`
- Live HTML references `/assets/index.js`.
- The deployed `/assets/index.js` hash matches the local `client/dist` asset hash.
- Production Vite asset names are now deterministic (`assets/index.js`, `assets/index.css`) so deploy verification can compare the live bundle to the current local build without hash-name churn.
- Metric values count up on mount where the displayed value begins with a number, and the Pheno sidebar slides in from the right.
- `client/.env.production` pins the public production Convex/API URLs so normal local production builds and verifier builds emit the same deployable bundle.
- The shipped JS bundle does not contain `localhost:4000` or `127.0.0.1:3210`.
- Netlify has `VITE_CONVEX_URL`, `VITE_API_BASE_URL`, `CONVEX_URL`, and `CLIENT_ORIGIN` configured for `phenoagent-demo`.
- Netlify has `WHOOP_REDIRECT_URI` and `OURA_REDIRECT_URI` configured for the hosted callback URLs.
- Current shell and Netlify environment checks still do not provide `ANTHROPIC_API_KEY`, WHOOP client credentials, Oura client credentials, Garmin credentials, or a Render API token.

## Prompt-to-Artifact Checklist

| Requirement | Artifact or Evidence | Status |
|---|---|---|
| Read and follow `AGENTS.md` | Implementation follows the AGENTS-specified repo structure and modules | Complete |
| React 18 + Vite frontend | `client/package.json`, `client/src/App.tsx`, `client/src/main.tsx` | Complete |
| Tailwind CSS styling | `client/tailwind.config.js`, `client/src/index.css` | Complete |
| shadcn-style composable UI components | `client/src/components/ui/Button.tsx`, `client/src/components/ui/Card.tsx` | Complete with local lightweight components |
| Convex backend/database | `convex/schema.ts`, generated Convex files, production deploy `nautical-seahorse-122` | Complete |
| Convex Auth email/password, optional Google | `convex/auth.ts`, `convex/auth.config.ts`, `client/src/pages/Login.tsx`, production `SITE_URL`/`JWKS`/`JWT_PRIVATE_KEY` | Complete for password auth; Google requires OAuth env |
| Convex production auth endpoint readiness | `/.well-known/openid-configuration` and `/.well-known/jwks.json` return HTTP 200 | Complete |
| Production password sign-up and authenticated Convex query | `scripts/auth-smoke.mjs`, `npm run verify:auth` | Complete |
| Production health data writes and reads | `scripts/data-smoke.mjs`, `npm run verify:data` | Complete |
| OAuth state completion and replay protection | `scripts/oauth-state-smoke.mjs`, `npm run verify:oauth` | Complete |
| Protected app routes | `client/src/components/layout/AuthGate.tsx` | Complete; public demo is available at `/demo` |
| Convex Storage uploads | `convex/files.ts`, `client/src/pages/Bloodwork.tsx` | Complete locally |
| Thin Express server only for OAuth and Claude SSE | `server/src/index.ts`, `server/src/routes/pheno.ts`, `server/src/routes/integrations/*` | Complete locally |
| Express runtime behavior | `scripts/verify.sh` smoke checks for health, protected Pheno auth, Garmin 501, and authenticated WHOOP/Oura credential 501 responses | Complete locally; Pheno chat is rate-limited after auth at 20 requests/minute per Convex token |
| Hosted API surface | `netlify/functions/api.mjs`, Netlify deploy `69f9c7e2fc98b13a39c8d428`, `npm run verify:api` | Complete for health, Pheno SSE path, and credential-ready WHOOP/Oura routing; uses Netlify env access with local fallback; AI/provider secrets still required for live Claude/OAuth |
| Claude model `claude-sonnet-4-20250514` | `server/src/services/anthropic.ts`, `convex/pheno.ts`, `convex/bloodwork.ts`, `convex/nutrition.ts` | Complete; live calls require `ANTHROPIC_API_KEY` |
| Charts with Recharts | `client/src/components/charts/*`, page usage | Complete |
| Netlify frontend hosting | `netlify.toml`, linked `phenoagent-demo`, verified live URL | Complete for public demo and live Convex client |
| GitHub-backed validation | `.github/workflows/ci.yml` | CI workflow is present locally; publishing/connecting it to the existing public GitHub repo requires confirmation because the remote currently contains an older `backend`/`frontend` layout |
| Repeatable verification | `scripts/verify.sh`, `npm run verify` | Complete |
| Production credential readiness check | `scripts/production-readiness.mjs`, `npm run verify:production-ready` | Complete; currently reports the missing credentials that block full live production operation |
| Render backend hosting | `render.yaml`; local env check for `RENDER_API_KEY`/`RENDER_TOKEN` | Config present; Netlify Functions now hosts the required API path for this demo; Render deploy remains blocked without Render deployment access |
| Dashboard cards and live queries | `client/src/pages/Dashboard.tsx`, Convex dashboard query refs | Complete; Sleep card includes a 7-day sparkline |
| Sleep module | `convex/sleep.ts`, `client/src/pages/Sleep.tsx`, `npm run verify:data` | Complete; page includes HRV chart, sleep-stage chart, manual entry, and sortable sessions table |
| Nutrition module and AI macro scan | `convex/nutrition.ts`, `client/src/pages/Nutrition.tsx`, `npm run verify:data` | Manual nutrition complete with selected-date meal timeline and circular macro rings; AI scan fills the meal form for review before save; live AI scan requires `ANTHROPIC_API_KEY` |
| Training module | `convex/training.ts`, `client/src/pages/Training.tsx`, `npm run verify:data` | Complete; page uses `api.training.getPersonalRecords`, includes dynamic set logger, per-exercise Epley 1RM trend chart, and PRs table |
| Bloodwork manual entry and PDF parse | `convex/bloodwork.ts`, `convex/bloodworkPdf.ts`, `client/src/pages/Bloodwork.tsx`, `npm run verify:data` | Manual bloodwork complete with grouped category sections, range bars, and trend indicators; PDF upload path uses Convex Storage plus an internal Convex Node action with `pdf-parse`; Claude biomarker extraction still requires `ANTHROPIC_API_KEY` |
| Supplements module | `convex/supplements.ts`, `client/src/pages/Supplements.tsx`, `npm run verify:data` | Complete; page uses `api.supplements.getActive`, supports add and toggle, and separates active stack from paused items |
| Journal module | `convex/journal.ts`, `client/src/pages/Journal.tsx`, `npm run verify:data` | Complete; page renders a full month calendar with mood-coded entries |
| Pheno snapshot, daily brief, SSE chat | `convex/pheno.ts`, `server/src/routes/pheno.ts`, `netlify/functions/api.mjs`, `client/src/hooks/useDailyBrief.ts`, `client/src/hooks/usePhenoChat.ts`, `npm run verify:data`, `npm run verify:api` | Hosted SSE route complete; client reads persisted `api.pheno.getChatHistory`; live Claude output requires `ANTHROPIC_API_KEY` |
| WHOOP OAuth and sync | `server/src/routes/integrations/whoop.ts`, `netlify/functions/api.mjs`, `convex/integrations.ts`, `oauthStates` table, `npm run verify:oauth` | Implemented and credential-ready; hosted API and Express support auth start, OAuth state stores user IDs, rejects replay, and does not store bearer tokens; live validation blocked by OAuth credentials |
| Oura OAuth and sync | `server/src/routes/integrations/oura.ts`, `netlify/functions/api.mjs`, `convex/integrations.ts`, `oauthStates` table, `npm run verify:oauth` | Implemented and credential-ready; hosted API and Express support auth start, OAuth state stores user IDs, rejects replay, and does not store bearer tokens; live validation blocked by OAuth credentials |
| Garmin support | `server/src/routes/integrations/garmin.ts` | Explicitly blocked until Garmin Health API approval |
| Apple Health CSV import | `convex/integrations.ts` | Complete locally |
| Mobile layout and polish | `client/src/components/layout/Topbar.tsx`, responsive page grids | Complete |
| No client-exposed secrets | Bundle checked for local server URLs; env secrets are server-side only | Complete for deployed demo |

## Remaining Blockers

These are required for full live production operation but cannot be completed without external accounts, secrets, or approvals:

- Set Convex `ANTHROPIC_API_KEY` for AI macro scan, daily brief, and PDF biomarker extraction.
- Set Google OAuth credentials if Google login is desired.
- Set hosted API `ANTHROPIC_API_KEY` for live Claude SSE output and Convex AI actions.
- Configure provider OAuth client IDs/secrets for WHOOP and Oura.
- Validate PDF biomarker extraction, WHOOP sync, and Oura sync with real credentials/test accounts.
- Obtain Garmin Health API approval before enabling Garmin OAuth.
- Provide Render deployment access if the separate AGENTS-specified Express host must be live on Render in addition to the already-live Netlify Functions API.
- Confirm whether to replace or branch from the existing public GitHub repo `adad44/PhenoAgent`, which currently contains an older `backend`/`frontend` layout, before enabling GitHub-based Netlify CI/CD from this implementation.

## Completion Decision

Do not mark the full AGENTS objective complete yet. The implemented demo and local code pass validation, but live connected production operation remains blocked by missing external service setup and credentials.
