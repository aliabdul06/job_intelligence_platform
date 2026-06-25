# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Three top-level pieces that depend on each other in this order:

1. `nlp_analysis.py` (project root) — offline analytics. Reads `job_postings_combined.csv`, writes CSV tables and PNG charts to `output/`, plus the enriched dataset `output/enriched_job_postings.csv`.
2. `backend/` — FastAPI + MongoDB (Motor). On seed it reads `output/enriched_job_postings.csv` and populates the DB. At runtime it serves `/api/v1/*`.
3. `frontend/` — Next.js 16 app (React 19). Talks to the backend via `src/lib/api.js` (`NEXT_PUBLIC_API_URL`, defaults to `http://localhost:8000/api/v1`). The PNG charts from `output/` are also copied into `frontend/public/` and rendered as alternate views alongside the interactive React charts.

## Commands

### Regenerate analytics outputs
```bash
# from repo root — produces output/*.csv and output/*.png
PYTHONIOENCODING=utf-8 python nlp_analysis.py

# copy regenerated charts to the frontend so the PNG views update
cp output/*.png frontend/public/
```
Run this whenever `job_postings_combined.csv` or the skill/role taxonomies in `nlp_analysis.py` change.

### Backend
```bash
cd backend
cp .env.example .env       # first time only — fill in JWT_SECRET_KEY
pip install -r requirements.txt
python -m app.seed_data    # drops & repopulates Mongo from output/enriched_job_postings.csv
python run.py              # uvicorn on 0.0.0.0:8000 with reload
```
`JWT_SECRET_KEY` is **required** — the app refuses to start without it. The seed script must be re-run after every analytics regeneration, otherwise the API serves stale numbers. Mongo defaults: `mongodb://localhost:27017`, db `job_intelligence` — override via `.env` in `backend/`.

### Frontend
```bash
cd frontend
npm run dev      # next dev on :3000
npm run build
npm run lint
```
There are no tests configured in either backend or frontend.

## Architecture notes

### Skill counting invariant — do not break
`mentions` for any skill **must not exceed total postings**. Both `nlp_analysis.py` and `backend/app/seed_data.py` independently compute skill counts and **must agree**. The rule is: take the *union* of the structured `skills` column and the NLP-extracted skills per posting, then count each skill at most once per posting. Never sum the two sources — that double-counts.

Placeholder values (`"Other"`, `"Unknown"`, `"None"`, `"nan"`, empty string) are filtered out of role/region/skill rankings at the analytics layer so the API never returns them as top values. If you add a new ranking, apply the same filter.

The two skill keyword lists (`SKILL_KEYWORDS`) and role regexes (`ROLE_CATEGORIES`) and experience map (`EXPERIENCE_MAP`) in `nlp_analysis.py` and `backend/app/seed_data.py` are duplicated on purpose (seed can fall back to the raw CSV) — keep them in sync when editing.

### Backend layering
- `app/main.py` mounts routers under `/api/v1`. Lifespan opens/closes the Mongo client.
- `app/database.py` exposes a single `database` proxy used by routers (`database.jobs`, `database.skills_analytics`, …). Collections are precomputed by `seed_data.py` — most analytics endpoints read from these aggregate collections, not from `jobs`.
- `app/security.py` adds three middlewares (rate-limit, security headers, cache-control) — order matters in `main.py`.
- `app/services/recommendation_engine.py` is pure-Python scoring (skill overlap 40% / role 30% / experience 20% / location 10%). It runs in-process over all jobs fetched from Mongo on each `/recommendations` call.
- Auth: JWT access + refresh tokens via `python-jose`; `get_current_user` dependency injects the Mongo user doc.

### Frontend
- App Router (Next.js 16). All pages under `src/app/` are client components (`'use client'`) that fetch via `src/lib/api.js`.
- `src/lib/auth-context.js` provides the auth context; `localStorage` holds the JWT.
- The home dashboard pulls everything from one `/api/v1/homepage` call. Other pages hit specific endpoints (`/skills/*`, `/regions/*`, `/jobs/*`, `/search`, `/recommendations/*`).
- **Field-name gotcha:** API job documents use `description` (not `job_description`) and `_id` is serialized to a string. New frontend code must use those keys.
- **Experience filter values** are the human-readable strings the seed writes (`"Entry Level"`, `"1-2 Years"`, `"3-5 Years"`, `"5+ Years"`, `"10+ Years"`) — they're regex-matched on the backend, so dropdown `value`s must use these exact strings, not aliases like `"mid"`/`"senior"`.

### Frontend Next.js version warning (from frontend/AGENTS.md)
This is **Next.js 16** with breaking changes from older versions. Before writing Next.js-specific code, read the relevant guide in `frontend/node_modules/next/dist/docs/` — do not rely on training-data conventions.
