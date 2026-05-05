# PhenoAgent

PhenoAgent is a full-stack health intelligence dashboard with Convex-backed health data modules and an AI assistant named Pheno.

## Local Setup

```bash
npm run install:all
cp client/.env.example client/.env
cp server/.env.example server/.env

# In separate terminals:
npx convex dev
npm run dev:client
npm run dev:server
```

The client also includes a demo fallback so the interface can run before a Convex deployment URL is configured.
Local development can point at the local Convex dev server with `client/.env.development.local`; production builds use `client/.env.production` so local verification and Netlify deploys produce the same public demo bundle.

## Deploy

The public demo is configured for Netlify from `netlify.toml` and is live at https://phenoagent-demo.netlify.app.

The Express API can be deployed on Render with `render.yaml`. Configure the secret environment variables in Render before using OAuth or Pheno streaming.

## Architecture

- `convex/`: source of truth for schema and data functions.
- `client/`: React 18 + Vite + Tailwind dashboard.
- `server/`: thin Express service for OAuth redirects and Pheno SSE streaming only.

External secrets stay in environment files and are never exposed through the client bundle.
