# PhenoAgent

PhenoAgent is an MVP personal health intelligence agent. It combines lab reports, wearable exports, and optional genome files, runs a Bayesian-style risk model, and returns plain-English insights through an OpenAI interpretation layer.

Live demo: https://phenoagent-health-demo.netlify.app

## What Is Included

- FastAPI backend with upload, inference, results, and chat routes.
- Lab parser using `pdfplumber` plus regex support for common Quest and LabCorp-style lines.
- Wearable parser for Apple Health XML and generic CSV.
- 23andMe raw genome parser with SNP counting.
- Bayesian-style risk engine for metabolic, cardiovascular, and sleep domains.
- OpenAI layer that sends only de-identified posteriors and feature labels.
- React 18 + TypeScript dashboard with upload, risk cards, trends, and chat.
- Demo fixture for borderline metabolic syndrome markers.

## Run Locally

Start the backend:

```bash
cd phenoagent/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

Start the frontend:

```bash
cd phenoagent/frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Environment Variables

Backend:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.2
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=http://localhost:5173
```

Frontend:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:8000
VITE_DEMO_AUTH_TOKEN=demo
```

## Supabase Tables

Create these tables with RLS enabled so users can only read and write their own rows:

```sql
create table lab_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  uploaded_at timestamptz default now(),
  parsed_values jsonb not null,
  raw_pdf_path text,
  source text
);

create table wearable_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  uploaded_at timestamptz default now(),
  time_series_summary jsonb,
  feature_vector jsonb,
  source text
);

create table inference_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now(),
  bbn_posteriors jsonb not null,
  openai_interpretation jsonb not null,
  status text not null
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  created_at timestamptz default now(),
  role text not null,
  content text not null,
  session_id uuid
);
```

## Safety Notes

This MVP does not diagnose conditions. Every AI response includes: "For informational purposes only. Consult a healthcare provider for medical decisions."

The local demo uses in-memory storage when Supabase is not configured. Use Supabase Storage and Postgres before handling real user data.
