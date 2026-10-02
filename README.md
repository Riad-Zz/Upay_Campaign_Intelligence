# Upay Campaign Intelligence

AI-powered campaign intelligence and audience optimization prototype for Upay MFS.

## Architecture

```
React (Vite + TS + Tailwind)
    ↓  REST/JSON
Node.js / Express API
    ↓  reads at startup
JSON artifacts ← Python ML pipeline (runs once offline)
```

## Quick Start

### 1. Run ML pipeline (first time only)

```bash
cd ml
pip install -r requirements.txt
python generate_data.py      # generates customers.json, campaign_history.json
python train_model.py        # trains S-Learner, generates uplift_scores.json, model_meta.json
```

### 2. Start backend

```bash
cd backend
npm install
npm start
# API running at http://localhost:3001
```

### 3. Start frontend

```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/stats | Population-level statistics |
| GET | /api/customers | Paginated customer list |
| GET | /api/customers/:id | Customer profile + explanation |
| POST | /api/campaign/run | Run campaign intelligence pipeline |

## ML Model

**S-Learner (GradientBoostingClassifier)**

```
uplift(i) = P(convert | features_i, T=1) − P(convert | features_i, T=0)
```

AUC = 0.7892. Pre-computed for all 10,000 customers × 4 campaign types.

## Core Business Metrics

- **Uplift Score**: Incremental conversion probability change due to the campaign
- **Priority Score**: `uplift × avg_txn_value / offer_cost` — used for greedy budget allocation
- **Expected Incremental Transactions**: `Σ uplift(i)` over recommended customers
- **Expected Incremental GMV**: `Σ uplift(i) × avg_txn_value(i)`
- **GMV Multiplier**: `incremental_gmv / campaign_cost`

## Data

- 10,000 synthetic customers across 4 segments (high_value, mid, low, dormant)
- 359,091 historical campaign records (80 campaigns, 70% treatment / 30% control)
- No real customer data used
