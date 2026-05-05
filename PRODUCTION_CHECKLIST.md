# PhenoAgent Production Checklist

The Netlify demo is live at https://phenoagent-demo.netlify.app.

Latest verified production deploy: https://69f9c7e2fc98b13a39c8d428--phenoagent-demo.netlify.app

Current audit status as of 2026-05-05:

- Local TypeScript, Convex function validation, production build, and npm audit gates pass.
- `npm run verify` runs the full local, Convex production auth, Express smoke, hosted integration fallback, and deployed-demo verification suite.
- `npm run verify:auth` validates production password sign-up and an authenticated Convex query.
- `npm run verify:data` validates production Convex writes and reads for sleep, nutrition, training, bloodwork, supplements, journal, integrations, readiness, and daily brief.
- `npm run verify:api` validates the hosted Netlify `/api/pheno/chat` SSE path and Convex persistence.
- `npm run verify:oauth` validates OAuth state completion and replay rejection.
- `npm run verify:production-ready` checks whether the required Convex, Netlify, and local deployment/provider credentials are present without printing secret values.
- Draft PR https://github.com/adad44/PhenoAgent/pull/1 publishes this implementation on `codex/agents-implementation`, and GitHub Actions CI run `25372089574` passed install, typecheck, build, and dependency audit.
- Netlify is linked to `phenoagent-demo` and serves the client bundle with the public `/demo` route.
- Netlify has `VITE_CONVEX_URL`, `VITE_API_BASE_URL`, `CONVEX_URL`, and `CLIENT_ORIGIN` set for the production demo.
- Netlify has `WHOOP_REDIRECT_URI` and `OURA_REDIRECT_URI` set to the live hosted callback URLs.
- Convex production functions and Auth keys are deployed to `https://nautical-seahorse-122.convex.cloud`.
- Convex production `SITE_URL` is set to `https://phenoagent-demo.netlify.app`; local dev `SITE_URL` remains `http://localhost:5173`.
- Bloodwork PDF upload uses Convex Storage and an internal Convex Node action with `pdf-parse`; Claude extraction requires `ANTHROPIC_API_KEY`.
- Netlify Functions host the demo API at `https://phenoagent-demo.netlify.app/api/*`; live Claude and OAuth still require secrets.
- WHOOP/Oura OAuth state is backed by Convex `oauthStates` in both Netlify Functions and the separate Express server, stores user IDs instead of bearer tokens, and is credential-ready.

Complete these items to turn the demo into a fully live connected app.

## Convex

- Production Convex deployment is `https://nautical-seahorse-122.convex.cloud`.
- Set Convex environment variables:
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Convex Auth setup for the production site URL is complete.
- Netlify `VITE_CONVEX_URL` is set to the production Convex URL.

## Hosted API

- Netlify Functions API is deployed from `netlify/functions/api.mjs`.
- `VITE_API_BASE_URL` points to `https://phenoagent-demo.netlify.app`.
- `GET /api/health` returns `{"ok":true,"service":"phenoagent-netlify-api"}`.
- Set hosted API `ANTHROPIC_API_KEY` before expecting live Claude output.
- `render.yaml` is present for the separate Express server, but a Render deploy requires Render account/API access plus the server secret environment variables.

## Provider Integrations

- Create WHOOP OAuth app credentials and set:
  - `WHOOP_CLIENT_ID`
  - `WHOOP_CLIENT_SECRET`
  - `WHOOP_REDIRECT_URI=https://phenoagent-demo.netlify.app/api/integrations/whoop/callback` is already set
- Create Oura OAuth app credentials and set:
  - `OURA_CLIENT_ID`
  - `OURA_CLIENT_SECRET`
  - `OURA_REDIRECT_URI=https://phenoagent-demo.netlify.app/api/integrations/oura/callback` is already set
- Obtain Garmin Health API approval before enabling Garmin OAuth.

## Validation

- Production password auth has been smoke-tested; sign up through `/login` for manual browser QA.
- Manual production writes for sleep, meal, workout, biomarker, supplement, journal, and integration status are smoke-tested.
- Ask Pheno a question and confirm SSE streaming completes.
- Upload a lab PDF and confirm parsed biomarkers can be reviewed and saved.
- Connect WHOOP and Oura test accounts, then run sync from `/integrations`.
- Approve/merge draft PR #1, then connect Netlify to the confirmed GitHub repo/branch for automatic production deploys after the repository contents are approved.
