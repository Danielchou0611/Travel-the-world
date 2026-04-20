# Japan Travel Itinerary App

Week 1 delivers the first data pipeline, scoring formula documentation, a 55-attraction sample dataset, and a React itinerary editor prototype using `dnd-kit`.

Week 2 adds API-ready itinerary update/delete logic and a Python user preference analysis flow. The 200+ real attraction dataset is intentionally left pending until the formal data source is available.

Scoring and schedule recalculation notes:

- `docs/scoring_formula.md`
- `docs/schedule_logic.md`

## Data Pipeline

```bash
python3 scripts/score_attractions.py
```

Input:

- `data/raw/attractions_japan_sample.csv`

Output:

- `data/processed/attractions_scored.csv`

Formula details:

- `docs/scoring_formula.md`

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

After rerunning the scoring pipeline, sync the catalog:

```bash
cp data/processed/attractions_scored.csv frontend/public/data/attractions_scored.csv
```

Convert the `Travel-the-world-Daniel` dataset into reusable catalogs:

```bash
python3 scripts/convert_daniel_attractions.py
```

Use the converted Daniel catalog in the frontend:

```bash
python3 scripts/convert_daniel_attractions.py --sync-frontend
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
