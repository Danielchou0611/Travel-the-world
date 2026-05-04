# Japan Travel Itinerary App

This repo now uses a single JSON-based attraction pipeline for the main catalog, alongside the React itinerary editor prototype and the Python user preference analysis flow.

Scoring and schedule recalculation notes:

- `docs/scoring_formula.md`
- `docs/schedule_logic.md`

## Main Data Pipeline

```bash
python3 scripts/build_japan_attractions.py --sync-frontend
```

Input:

- `data/raw/japan_with_rating.json`

Outputs:

- `data/processed/japan_attractions_normalized.csv`
- `data/processed/japan_attractions_scored.csv`
- `reports/japan_attractions_pipeline_report.json`
- `frontend/public/data/attractions_scored.csv`

Formula details:

- `docs/scoring_formula.md`

Pipeline notes:

- `docs/pipeline_japan_json.md`

## Frontend Prototype

```bash
cd frontend
npm install
npm run dev
```

Use this when the Django API runs on another origin:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

When `VITE_API_BASE_URL` is not set, the frontend uses a mock API so drag-and-drop and delete can be tested before the Django backend exists.

The custom attraction search reads this frontend catalog:

- `frontend/public/data/attractions_scored.csv`

After rerunning the main pipeline, sync the catalog:

```bash
python3 scripts/build_japan_attractions.py --sync-frontend
```

Build check:

```bash
cd frontend
npm run build
```

## User Preference Analysis

```bash
python3 scripts/analyze_preferences.py
```

Input:

- `data/raw/user_preferences_sample.csv`

Output:

- `reports/preference_analysis.json`
- `reports/preference_analysis.md`

## Legacy Scripts

These remain in the repo for earlier milestones and compatibility checks:

- `scripts/score_attractions.py` for the original 55-row sample CSV pipeline
- `scripts/convert_daniel_attractions.py` for the earlier multi-file Daniel JSON conversion flow
