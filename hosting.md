# Hosting Guide — Upay Campaign Intelligence

This guide covers deploying the frontend and backend to **Vercel**.

---

## Architecture Overview

```
Vercel (Frontend)          Vercel (Backend)
React SPA                  Node.js / Express
  ↓  VITE_API_URL env var  ↓  PORT env (auto-set)
  └──────── REST/JSON ──────┘
                            ↓  reads at startup
                        data/ (bundled in deployment)
```

The frontend and backend are **two separate Vercel projects** deployed from the same repository.

---

## Prerequisites

1. [Vercel account](https://vercel.com) (free tier is sufficient)
2. [Vercel CLI](https://vercel.com/docs/cli) (optional but recommended):
   ```bash
   npm install -g vercel
   ```
3. ML pipeline must be run locally before deploying the backend:
   ```bash
   cd ml
   pip install -r requirements.txt
   python generate_data.py
   python train_model.py
   ```
   This generates the runtime artifacts in `data/`:
   - `customers.json`
   - `uplift_scores.json`
   - `model_meta.json`

   These files are committed to the repository and bundled into the backend deployment.

---

## Step 1: Deploy the Backend

### Option A: Vercel CLI (recommended)

```bash
cd backend
vercel
```

Follow the prompts:
- **Project name**: `upay-campaign-api` (or your choice)
- **Root directory**: `./` (the `backend/` folder)
- **Framework**: Other (Node.js)
- Vercel will detect `vercel.json` automatically

After deployment, note the URL — it will look like:
```
https://upay-campaign-api.vercel.app
```

### Option B: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repository
3. Set **Root Directory** to `backend`
4. Framework: **Other**
5. Build Command: *(leave empty)*
6. Output Directory: *(leave empty)*
7. Click **Deploy**

### Backend Environment Variables

In your Vercel backend project → **Settings** → **Environment Variables**:

| Variable | Value | Description |
|---|---|---|
| `ALLOWED_ORIGIN` | `https://your-frontend.vercel.app` | Restricts CORS to your frontend |
| `PORT` | *(leave unset)* | Vercel sets this automatically |

> If you want to allow all origins during testing, leave `ALLOWED_ORIGIN` unset (defaults to `*`).

---

## Step 2: Deploy the Frontend

### Option A: Vercel CLI

```bash
cd frontend
vercel
```

When prompted:
- **Project name**: `upay-campaign-intelligence` (or your choice)
- **Root directory**: `./` (the `frontend/` folder)
- **Framework**: Vite (auto-detected)

### Option B: Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the same GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**

### Frontend Environment Variables

In your Vercel frontend project → **Settings** → **Environment Variables**:

| Variable | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://upay-campaign-api.vercel.app` | Your deployed backend URL |

**This is the only variable you need to change when going from local to production.**

> ⚠️ Do NOT include `/api` in the URL. The frontend appends `/api` automatically.

After adding the environment variable, **trigger a redeployment**:
```bash
vercel --prod
```
or click **Redeploy** in the Vercel dashboard.

---

## Step 3: Configure API URL

The frontend reads the backend URL from `VITE_API_URL`:

```typescript
// frontend/src/services/api.ts
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
  .replace(/\/$/, '') + '/api';
```

| Environment | `VITE_API_URL` value |
|---|---|
| Local development | `http://localhost:3001` (set in `frontend/.env`) |
| Vercel production | `https://upay-campaign-api.vercel.app` (set in Vercel dashboard) |

**You never modify source code** — only the environment variable changes.

---

## Step 4: Test the Live Deployment

### Test the backend API

```bash
# Health check
curl https://upay-campaign-api.vercel.app/api/health

# Population stats
curl https://upay-campaign-api.vercel.app/api/stats

# Run a campaign
curl -X POST https://upay-campaign-api.vercel.app/api/campaign/run \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_name": "Friday Recharge Boost",
    "campaign_type": "recharge",
    "offer_value_bdt": 30,
    "budget_bdt": 500000,
    "target_segment": "all"
  }'
```

### Test the frontend

Open your frontend Vercel URL (e.g., `https://upay-campaign-intelligence.vercel.app`) in a browser.

Verify:
1. Dashboard loads and shows 10,000 customers
2. Campaign Studio → fill form → Run Analysis returns results
3. Customer Explorer table loads and detail panel opens

---

## Local Development (No Vercel)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm start         # http://localhost:3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev       # http://localhost:5173
```

Frontend `.env` is pre-configured to point to `http://localhost:3001`.

---

## Project Structure Reference

```
Upay_Campaign_Intelligence/
├── ml/                    # Python ML pipeline (run once offline)
│   ├── generate_data.py
│   ├── train_model.py
│   └── requirements.txt
├── data/                  # ML artifacts (committed; required for backend)
│   ├── customers.json
│   ├── uplift_scores.json
│   └── model_meta.json
│   # campaign_history.json is gitignored (70MB training data)
├── backend/               # Node.js / Express API → deploy as Vercel project
│   ├── vercel.json
│   ├── server.js
│   ├── routes/
│   ├── controllers/
│   └── services/
└── frontend/              # React Vite app → deploy as Vercel project
    ├── vercel.json
    ├── .env               # Local env (gitignored)
    ├── .env.example       # Template (committed)
    └── src/
```

---

## Troubleshooting

### CORS errors in browser console
- Add `ALLOWED_ORIGIN` environment variable in the Vercel backend project
- Set it to your exact frontend URL: `https://your-frontend.vercel.app`
- Redeploy the backend

### "Failed to load data artifacts" on backend startup
- The `data/customers.json`, `data/uplift_scores.json`, and `data/model_meta.json` files must be committed to the repository
- Run the ML pipeline locally and commit the generated files: `git add data/ && git commit`

### API calls returning 404
- Verify `VITE_API_URL` does not include `/api` at the end
- Verify the backend is deployed and accessible at that URL
- Check the Vercel function logs in the Vercel dashboard

### Slow first response (cold start)
- Vercel serverless functions have a cold start delay (~1–3 seconds) when not recently called
- Subsequent requests are fast
- This is expected behavior for serverless deployments
