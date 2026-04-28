# PhenoAgent Backend

FastAPI backend for the PhenoAgent MVP. It parses lab PDFs, wearable exports, and optional genome files, then runs a Bayesian-style health risk model and returns de-identified insight text through OpenAI.

## Local Setup

```bash
cd phenoagent/backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

The API is available at `http://localhost:8000`. In local demo mode, use `Authorization: Bearer demo`. When Supabase environment variables are configured, bearer tokens are validated through Supabase Auth.

## Verification

```bash
cd phenoagent/backend
pytest
```

The `/inference/run` endpoint falls back to `fixtures/sample_lab.json` when no lab upload exists, so the frontend can run an end-to-end demo before real credentials are configured.

## Privacy Boundary

OpenAI receives only posterior probabilities, feature names, and biomarker flag labels. Raw lab values, names, DOB, exact dates, and uploaded files are not sent to the AI layer.
