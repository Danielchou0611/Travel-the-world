# Japan Travel Itinerary App

Week 1 delivers the first data pipeline, scoring formula documentation, a 55-attraction sample dataset, and a React itinerary editor prototype using `dnd-kit`.

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

Build check:

```bash
cd frontend
npm run build
```
