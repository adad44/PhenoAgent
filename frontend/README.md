# PhenoAgent Frontend

React 18 + TypeScript dashboard for the PhenoAgent MVP.

## Local Setup

```bash
cd phenoagent/frontend
npm install
cp .env.example .env
npm run dev
```

The frontend expects the backend at `VITE_API_BASE_URL=http://localhost:8000` and sends `Authorization: Bearer demo` by default for local development.

## Build

```bash
npm run build
```

Upload supports lab PDFs, wearable CSV/XML exports, and optional genome files. Dashboard shows metabolic, cardiovascular, and sleep risk cards with confidence intervals. Chat streams text from the backend `/chat` endpoint.
