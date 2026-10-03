# Upay Campaign Intelligence

<p align="center">
  <strong>AI-Powered Causal Uplift & Audience Optimization Engine for Mobile Financial Services</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/ML-S--Learner-FF6F00" alt="Causal ML" />
  <img src="https://img.shields.io/badge/Deployment-Vercel%20Ready-000000?logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 1. Project Overview

**Upay Campaign Intelligence** is an end-to-end campaign optimization and audience intelligence platform designed for Mobile Financial Services (MFS) growth and campaign managers.

### The Campaign Targeting Problem in MFS

Traditional MFS marketing campaigns typically rely on **propensity models** or simple rule-based heuristics (e.g., targeting the top 10% highest-spending users or dormant users). While intuitive, propensity models answer the question:

> *"Which customers are most likely to make a transaction?"*

This question leads to substantial budget waste. In financial services:
- **"Sure Things" (organic transactors)**: Customers with high transaction frequency will recharge their phones or pay merchant bills regardless of an incentive. Offering them a ৳30 cashback wastes marketing spend without driving incremental volume.
- **"Lost Causes"**: Inactive or disengaged users who will not transact regardless of a small promotion.
- **"Sleeping Dogs / Fatigue Risk"**: Customers who may react negatively to excessive SMS or app notifications, increasing opt-outs or app uninstalls.

### The Causal Uplift Approach

Upay Campaign Intelligence reframes campaign targeting around **causal uplift modeling**:

> *"Which customers will transact **because** they received this specific campaign and incentive?"*

By estimating the **Incremental Conversion Probability (Uplift)**—the mathematical difference between a customer's probability of converting under promotional treatment ($P(\text{convert} \mid T=1)$) versus control without intervention ($P(\text{convert} \mid T=0)$)—the engine isolates true **"Persuadables"**.

### Purpose of the Project

The purpose of this project is to provide Upay campaign managers with a production-grade decision console to:
1. **Maximize Incremental Gross Merchandise Value (GMV)** and incremental transactions under fixed budget constraints.
2. **Eliminate wasted budget** on organic transactors ("Sure Things") and low-responsiveness cohorts.
3. **Prevent customer fatigue** through automated communication frequency moratoriums and fatigue risk filters.
4. **Dynamically tier incentives** (৳10, ৳20, ৳30, ৳50) based on customer price elasticity and uplift potential rather than uniform discounting.

---

## 2. Visual Walkthrough & Screenshots

| Campaign Studio & Execution Sequence | Strategy Report & Incentive Allocation |
|:---:|:---:|
| ![Campaign Studio Planning Workspace](frontend/public/Demo1.png) | ![Campaign Strategy Intelligence Report](frontend/public/Demo2.png) |
| *Configuring objective, budget cap, and real-time 8-stage causal optimization pipeline.* | *Strategy report with GMV multiplier, budget utilization, tiered cashback breakdown, and feature signals.* |

| Audience Recommendation & Priority Scoring | Customer Explorer & Causal Counterfactual Panel |
|:---:|:---:|
| ![Audience Recommendation Table](frontend/public/Demo3.png) | ![Customer Explorer & Detail Panel](frontend/public/Demo4.png) |
| *Audience audit table displaying baseline vs. campaign probabilities, uplift pp, and priority rank.* | *Individual counterfactual inspector comparing organic baseline to treated response with driver analysis.* |

---

## 3. Core Features

### 1. Operations Console & Dashboard
- **Population Telemetry**: Real-time overview of 10,000 synthetic MFS customer profiles categorized across four core segments: High Value, Mid Tier, Low Tier, and Dormant.
- **Campaign Opportunity Identification**: Automated scanner identifying addressable active customers exhibiting high responsiveness ($\ge 10\text{pp}$ uplift) across service channels.
- **Customer Availability & Fatigue Monitoring**: Immediate visibility into Fatigue-Safe, At-Risk, and Suppressed cohorts.
- **Cross-Category Responsiveness**: Interactive comparison of causal responsiveness across Recharge, Merchant Payment, P2P, and Bill Pay channels.
- **Uplift Distribution Spectrum**: Visual histogram illustrating population distribution across incremental conversion buckets.

### 2. Campaign Studio & Planning Workspace
- **Objective-Driven Targeting**: Select campaign objectives (Increase Recharge Transactions, Increase GMV, Reactivate Dormant Customers, Boost Merchant Payments, Increase P2P Transfers, Bill Pay Expansion) with automatic model vector mapping.
- **Budget & Incentive Controls**: Set custom budget caps (৳100K, ৳250K, ৳500K, ৳1M) and select baseline incentive levels (৳10, ৳20, ৳30, ৳50).
- **Automated Moratorium Guard**: Built-in toggle enforcing communication limits ($\ge 3$ campaigns in 90 days) and a 7-day spacing cooldown between outbound campaigns.
- **Real-Time Multi-Stage Analysis Pipeline**: Simulated multi-stage optimization pipeline illustrating population loading, baseline profiling, S-Learner scoring, fatigue pruning, and dynamic incentive optimization.

### 3. Campaign Strategy Report & Impact Analytics
- **Return Multiplier & Efficiency**: Calculates expected Net GMV Multiplier ($\text{Incremental GMV} / \text{Campaign Cost}$) and Reach Efficiency percentage.
- **Incremental Volume Estimation**: Model-driven forecast of total incremental transactions directly created by the campaign.
- **Incremental GMV Projection**: Projected gross merchandise value generated exclusively from persuaded customers.
- **Adaptive Incentive Allocation Mix**: Dynamically segments target audience into customized incentive tiers (৳50 high lift, ৳30 recommended, ৳20 standard, ৳10 low-tier push) to optimize return on investment.
- **Cohort Suppression Audit**: Clear categorization of non-targeted customers:
  - *Fatigue Protected*: Prevented customer burnout.
  - *Sure Things Skipped*: Organic transactors excluded to preserve marketing budget.
  - *Negative Uplift / Do Not Disturb*: Protected from potential adverse brand response.
  - *Lost Cause*: Excluded due to near-zero expected conversion delta.

### 4. Customer Explorer & Counterfactual Profiler
- **Searchable Customer Directory**: Paginated, filterable database of all 10,000 customer accounts with segment, GMV, monthly transaction count, and fatigue indicators.
- **Action Recommendation Tags**: Instant classification per customer (`Target ৳30`, `Target ৳10`, `Sure Thing`, `Fatigued`, `DND`).
- **Individual Counterfactual Inspector**: Slide-out audit panel displaying:
  - Baseline organic probability without intervention ($P(Y=1 \mid T=0)$).
  - Treated response probability with intervention ($P(Y=1 \mid T=1)$).
  - Exact incremental uplift delta in percentage points ($\text{pp}$).
  - Top individual feature drivers explaining why the model made the recommendation.
  - Historical behavioral profile and category-level affinities.

---

## 4. AI / ML — How It Works

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│  Customer Population    │ ──> │   Feature Engineering   │ ──> │ S-Learner Uplift Model  │
│  10,000 MFS Profiles    │     │  Tenure, GMV, Recency,  │     │ GradientBoostingClassifier│
│  Synthetic Behavior     │     │  Affinity, Fatigue Rate │     │ P(Y|X,T=1) - P(Y|X,T=0) │
└─────────────────────────┘     └─────────────────────────┘     └───────────┬─────────────┘
                                                                            │
┌─────────────────────────┐     ┌─────────────────────────┐                 │
│ Campaign Strategy Ready │ <── │ Greedy Budget Optimizer │ <───────────────┘
│ Incr. GMV + Allocation  │     │ Rank: Uplift × GMV/Cost │
│ Tiered Incentives (৳)   │     │ Enforce Fatigue Guards  │
└─────────────────────────┘     └─────────────────────────┘
```

### The S-Learner Causal Architecture

The system utilizes an **S-Learner (Single-Learner) Causal Uplift Model** powered by a `GradientBoostingClassifier` trained on historical treatment and control campaign interactions:

1. **Feature Vector ($X_i$)**: Encodes customer transaction habits, tenure, average GMV, recency, category affinities (Recharge, Merchant, P2P, Bill), and past communication fatigue metrics.
2. **Treatment Indicator ($T$)**: Binary indicator representing promotional intervention ($T=1$ with cashback incentive, $T=0$ without incentive).
3. **Outcome ($Y$)**: Binary conversion outcome (transaction completed during campaign window).
4. **Uplift Calculation**:
   $$\tau(X_i) = P(Y=1 \mid X_i, T=1, \text{offer}) - P(Y=1 \mid X_i, T=0)$$

### Customer Quadrant Classification

The model categorizes every customer into one of four behavioral quadrants:

| Quadrant | Behavior Without Offer | Behavior With Offer | Causal Delta ($\tau$) | Optimal Action |
|---|---|---|---|---|
| **Persuadables** | Unlikely to transact | Likely to transact | **Positive ($\tau > 0$)** | **Target with optimal incentive** |
| **Sure Things** | Highly likely to transact | Highly likely to transact | **Zero / Low ($\tau \approx 0$)** | **Suppress (Save budget)** |
| **Lost Causes** | Unlikely to transact | Unlikely to transact | **Zero / Low ($\tau \approx 0$)** | **Suppress (Avoid waste)** |
| **Do Not Disturb** | Moderate/High activity | Reduced activity | **Negative ($\tau < 0$)** | **Suppress (Protect retention)** |

### Suppression & Fatigue Guard Logic

Before budget allocation, candidates pass through rule-based fatigue and suppression guards:
- **Fatigue Rule**: Customers receiving $\ge 3$ campaigns within the last 90 days are automatically suppressed (`suppressed_fatigue`).
- **Spacing Cooldown**: Minimum 7-day moratorium enforced since the previous campaign contact.
- **Sure-Thing Suppression**: Customers with organic baseline conversion $> 65\%$ and incremental uplift $< 3\text{pp}$ are withheld from incentive targeting.

### Greedy ROI Budget Optimizer

Given a fixed campaign budget $B$ and base incentive cost $C$, customers are ranked by a **Priority Score**:

$$\text{Priority Score}_i = \frac{\tau(X_i) \times \text{Avg Transaction Value}_i}{C_i}$$

The engine greedily allocates budget down the ranked list until the budget ceiling is satisfied, ensuring each taka spent maximizes expected incremental GMV.

### Adaptive Incentive Tiering

Rather than offering a static incentive, customers selected by the optimizer receive dynamic cashback amounts based on their uplift elasticity:
- **৳50 High Push**: Assigned to high-potential persuadables ($\tau \ge 25\text{pp}$).
- **৳30 Recommended**: Assigned to moderate-to-high persuadables ($15\text{pp} \le \tau < 25\text{pp}$).
- **৳20 Standard**: Assigned to standard persuadables ($10\text{pp} \le \tau < 15\text{pp}$).
- **৳10 Maintenance**: Assigned to low-tier marginal responders ($\tau < 10\text{pp}$).

> **Notice on Synthetic Data & Simulation Scope:** All customer records, transaction histories, and campaign responses in this prototype are generated synthetically using realistic statistical distributions and behavioral rules. Model outputs, incremental metrics, and GMV multipliers are simulated approximations designed to demonstrate causal ML workflows in a hackathon setting.

---

## 5. Technology Stack

<p>
  <img src="https://skillicons.dev/icons?i=react" title="React 19" />
  <img src="https://skillicons.dev/icons?i=vite" title="Vite" />
  <img src="https://skillicons.dev/icons?i=ts" title="TypeScript" />
  <img src="https://skillicons.dev/icons?i=tailwind" title="Tailwind CSS" />
  <img src="https://skillicons.dev/icons?i=nodejs" title="Node.js" />
  <img src="https://skillicons.dev/icons?i=express" title="Express" />
  <img src="https://skillicons.dev/icons?i=py" title="Python" />
  <img src="https://skillicons.dev/icons?i=sklearn" title="Scikit-Learn" />
  <img src="https://skillicons.dev/icons?i=vercel" title="Vercel" />
  <img src="https://skillicons.dev/icons?i=git" title="Git" />
  <img src="https://skillicons.dev/icons?i=npm" title="npm" />
</p>

### Technology Breakdown

| Layer | Technology | Version / Specification | Role in Upay Campaign Intelligence |
|---|---|---|---|
| **Frontend Framework** | **React** | 19.2.8 | Single-page application rendering, reactive state management |
| **Build Tool** | **Vite** | 8.3.0 | Ultra-fast HMR and production bundle optimization |
| **Language** | **TypeScript** | 6.0.2 | End-to-end type safety across API contracts and campaign objects |
| **Styling** | **Tailwind CSS** | 3.4.19 | Custom design system using Upay brand colors (`#0054A6`, `#FFD600`) |
| **Typography** | **JetBrains Mono** | Google Fonts | High-readability technical font for tabular financial metrics |
| **UI Primitives** | **Radix UI** | Dialog, Tabs, Tooltip, Select | Accessible, unstyled UI primitives |
| **Animations** | **Framer Motion** | 14.0.0 | Fluid transitions, animated counters (`NumberTicker`), and modal fades |
| **Data Visualization** | **Recharts** | 3.10.1 | Uplift distribution histograms and channel lift charts |
| **Icons** | **Lucide React** | 1.50.0 | Clean contextual interface icons |
| **Backend Runtime** | **Node.js** | 18.x / 20.x | Lightweight REST API server |
| **Web Framework** | **Express** | 4.19.2 | Routing, JSON serialization, and campaign optimization endpoints |
| **CORS Middleware** | **cors** | 2.8.5 | Cross-Origin Resource Sharing configuration |
| **Machine Learning** | **Scikit-Learn** | 1.4.0+ | `GradientBoostingClassifier`, calibration, and AUC evaluation |
| **Data Processing** | **NumPy & Pandas** | 1.24+ / 2.0+ | Data generation, feature engineering, and matrix operations |
| **Hosting Platform** | **Vercel** | Multi-Project Configuration | Serverless deployment for frontend and Node.js backend |

---

## 6. Requirements & Prerequisites

To run Upay Campaign Intelligence locally, ensure you have the following installed:

| Requirement | Minimum Version | Recommended Version | Purpose |
|---|---|---|---|
| **Node.js** | 18.0.0 | 20.x LTS | Backend Express runtime and frontend Vite dev server |
| **npm** | 9.0.0 | 10.x | Package management for frontend and backend dependencies |
| **Python** *(Optional)* | 3.9.0 | 3.11.x | Only required if re-running data generation and model retraining |
| **Git** | 2.30.0+ | Latest | Version control and cloning the repository |

> **Note**: Pre-computed data artifacts (`customers.json`, `uplift_scores.json`, `model_meta.json`) are committed in the repository's `data/` folder. Running Python is **not required** to immediately start and test the backend and frontend.

---

## 7. Installation & Setup

Follow these step-by-step instructions to get the application running from a fresh clone.

### Step 1: Clone the Repository

```bash
git clone https://github.com/Riad-Zz/Upay_Campaign_Intelligence.git
cd Upay_Campaign_Intelligence
```

### Step 2: Set Up and Start the Backend

Open a terminal window:

```bash
cd backend
npm install
npm start
```

The backend API will start on **`http://localhost:3001`**.

You can verify the backend is running by opening `http://localhost:3001/api/health` in your browser.

### Step 3: Set Up and Start the Frontend

Open a second terminal window:

```bash
cd frontend
npm install
npm run dev
```

The frontend application will start on **`http://localhost:5173`**.

Open your browser and navigate to **`http://localhost:5173`** to use the application.

---

### Step 4 (Optional): Re-running the Python ML Pipeline

If you wish to regenerate the synthetic customer population and re-train the S-Learner uplift model:

```bash
cd ml
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# 1. Generate synthetic customers and historical campaign logs
python generate_data.py

# 2. Train S-Learner, compute causal uplift, and export JSON artifacts
python train_model.py
```

This will refresh `data/customers.json`, `data/uplift_scores.json`, and `data/model_meta.json`.

---

## 8. Environment Variables

The application uses standard environment variables to support both local development and cloud deployments.

### Frontend (`frontend/.env`)

| Variable Name | Required | Default (Local) | Production Example | Description |
|---|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:3001` | `https://upay-campaign-api.vercel.app` | Base URL of the backend API without trailing slash or `/api` |

A template is provided in `frontend/.env.example`:

```env
# Local development:
VITE_API_URL=http://localhost:3001

# Production (replace with your deployed backend URL):
# VITE_API_URL=https://your-backend.vercel.app
```

### Backend (`backend`)

| Variable Name | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port on which the Express server listens (auto-configured by Vercel in production) |
| `ALLOWED_ORIGIN` | No | `*` (All origins) | Restricts CORS requests to your frontend domain in production |

---

## 9. Run & Build Commands

### Development Mode

| Service | Directory | Command | Description |
|---|---|---|---|
| **Backend API** | `backend/` | `npm start` | Starts Express server on `http://localhost:3001` |
| **Backend (Dev)** | `backend/` | `npm run dev` | Starts server with `nodemon` auto-reloading |
| **Frontend UI** | `frontend/` | `npm run dev` | Starts Vite dev server on `http://localhost:5173` |

### Production Build

| Service | Directory | Command | Output Destination |
|---|---|---|---|
| **Frontend Build** | `frontend/` | `npm run build` | Compiles TypeScript and builds production assets into `frontend/dist/` |
| **Frontend Preview** | `frontend/` | `npm run preview` | Locally previews the compiled production build |

---

## 10. Live Deployment Status

- **Current Prototype Status**: The application is configured and validated for local execution (`http://localhost:5173` frontend and `http://localhost:3001` backend).
- **Cloud Deployment Ready**: The repository includes complete deployment configurations (`frontend/vercel.json` and `backend/vercel.json`) for multi-project serverless deployment on **Vercel**.
- Detailed cloud deployment instructions are documented in [hosting.md](hosting.md).

---

## 11. Testing & Verification Walkthrough

The project is structured as an interactive prototype designed for live verification by hackathon judges. Follow this walkthrough to test the core features end-to-end:

1. **Verify Backend Health**: Navigate to `http://localhost:3001/api/health` and verify `{"status":"ok"}` is returned.
2. **Launch Dashboard**: Open `http://localhost:5173`.
3. **Inspect Population Telemetry**: Check the Campaign Opportunity hero card, active audience count, and customer segment breakdown.
4. **Review Cross-Channel Lift**: Inspect the channel comparison bars comparing Mobile Recharge, Merchant, P2P, and Bill Pay responsiveness.
5. **Open Campaign Studio**: Click on **Campaign Studio** in the left sidebar navigation.
6. **Configure Campaign Objective**: Set Campaign Name to `Friday Recharge Boost` and select the objective `Increase Recharge Transactions`.
7. **Select Incentive & Budget**: Choose a base incentive of `৳30` (or `৳50`) and set the budget to `৳250,000`.
8. **Verify Fatigue Settings**: Confirm the automated fatigue guard indicators show active enforcement.
9. **Run Campaign Analysis**: Click **Run Campaign Analysis**. Observe the real-time 8-stage progress tracker.
10. **Analyze Strategy Report**: Review the generated results:
    - Net GMV Multiplier (e.g. `0.74x`–`1.2x`).
    - Budget utilization and recommended reach.
    - Expected incremental transactions and incremental GMV.
    - Suppression counters (Fatigue Protected, Sure Things Skipped, Negative Uplift Suppressed).
11. **Inspect Incentive Mix**: Review the dynamic cashback tiering breakdown showing customer distribution across ৳50, ৳30, ৳20, and ৳10.
12. **Audit Audience Recommendations**: Switch between the **Recommended Customers** and **Suppressed Cohort** tabs in the audience table.
13. **Explore Customer Profiles**: Click on **Customer Explorer** in the sidebar. Search for any customer (e.g., `CUST_07106` or `CUST_09188`).
14. **Inspect Counterfactual Panel**: Click a customer row to open the causal inspector. Compare the organic baseline probability vs. treated response probability, review individual feature drivers, and check fatigue warnings.

> **Automated Test Suite Notice**: As a hackathon prototype, automated test suites (e.g., Jest/PyTest) are not configured. Verification is conducted via the end-to-end interactive workflow outlined above and TypeScript compilation checks (`npm run build`).

---

## 12. Project Structure

```text
Upay_Campaign_Intelligence/
├── .agent/                             # Agent workflows and design intelligence skills
├── backend/                            # Express REST API
│   ├── controllers/
│   │   ├── campaignController.js       # Handles campaign execution requests
│   │   ├── customerController.js       # Customer directory, pagination, & recommendations
│   │   └── statsController.js          # Population overview & aggregate statistics
│   ├── routes/
│   │   └── api.js                      # API route definitions
│   ├── services/
│   │   ├── campaignEngine.js           # Campaign orchestration & objective mapping
│   │   ├── dataService.js              # Artifact data loader & statistics calculator
│   │   ├── fatigueService.js           # Frequency capping & moratorium rules
│   │   └── optimizer.js                # S-Learner classification & greedy budget optimizer
│   ├── package.json
│   ├── server.js                       # Express app entrypoint & middleware
│   └── vercel.json                     # Backend Vercel serverless configuration
├── data/                               # Pre-computed ML artifacts & datasets
│   ├── customers.json                  # 10,000 synthetic customer behavioral profiles
│   ├── model_meta.json                 # Feature importances, distributions, & explanations
│   └── uplift_scores.json              # Pre-computed S-Learner uplift scores across 4 channels
├── frontend/                           # React + TypeScript + Vite SPA
│   ├── public/
│   │   ├── Demo1.png                   # Campaign Studio screenshot
│   │   ├── Demo2.png                   # Campaign Strategy Report screenshot
│   │   ├── Demo3.png                   # Audience Recommendation Table screenshot
│   │   ├── Demo4.png                   # Customer Explorer & Detail Panel screenshot
│   │   └── favicon.svg                 # Upay brand favicon
│   ├── src/
│   │   ├── components/
│   │   │   ├── customers/
│   │   │   │   └── CustomerDetailPanel.tsx  # Counterfactual comparison slide-out
│   │   │   ├── layout/
│   │   │   │   └── Sidebar.tsx              # Responsive Upay-branded navigation
│   │   │   ├── shared/
│   │   │   │   ├── KPICard.tsx              # Metric card with animated number ticker
│   │   │   │   └── UpliftBar.tsx            # Conversion delta & comparison visualizer
│   │   │   └── ui/                          # Design primitives (framer-motion & radix)
│   │   ├── pages/
│   │   │   ├── CampaignPage.tsx        # Campaign Studio & Strategy Report
│   │   │   ├── CustomersPage.tsx       # Customer Explorer directory & filtering
│   │   │   └── DashboardPage.tsx       # Population Operations Console
│   │   ├── services/
│   │   │   └── api.ts                  # Axios/fetch client for backend API
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript domain models & interfaces
│   │   ├── App.tsx                     # Router configuration & view switcher
│   │   ├── index.css                   # Custom light theme tokens & Upay styling
│   │   └── main.tsx                    # React application entrypoint
│   ├── package.json
│   ├── tailwind.config.js              # Upay brand colors (#0054A6, #FFD600) & JetBrains Mono
│   ├── tsconfig.json
│   ├── vercel.json                     # Frontend Vercel SPA routing configuration
│   └── vite.config.ts
├── ml/                                 # Python ML pipeline (offline generation & training)
│   ├── generate_data.py                # Synthetic customer & campaign history generator
│   ├── requirements.txt                # Python dependencies (scikit-learn, pandas, numpy)
│   └── train_model.py                  # S-Learner training, scoring, & explanation pipeline
├── hosting.md                          # Detailed Vercel deployment guide
├── Product.md                          # Product specification & problem formulation
└── README.md                           # Master project documentation
```

---

## 13. System Workflow

The following execution flow highlights how customer data is transformed into prioritized campaign recommendations:

```text
Customer Behavioral Profiles (10,000 synthetic records)
                      │
                      ▼
Causal Feature Engineering (Recency, GMV, Txn Frequency, Category Affinity)
                      │
                      ▼
S-Learner Uplift Estimation (GradientBoosting: P(Convert|T=1) - P(Convert|T=0))
                      │
                      ▼
Audience Classification (Persuadables, Sure Things, Lost Causes, Do-Not-Disturb)
                      │
                      ▼
Automated Fatigue & Moratorium Suppression (≥3 campaigns in 90d, 7-day cooldown)
                      │
                      ▼
Greedy ROI Ranking (Priority Score = Uplift × Avg Txn Value / Incentive Cost)
                      │
                      ▼
Adaptive Incentive Optimization (Dynamic Cashback: ৳10 / ৳20 / ৳30 / ৳50)
                      │
                      ▼
Campaign Impact Estimation (Expected Incremental Transactions, GMV, & ROI Multiplier)
```

---

## 14. Responsible AI & Operational Considerations

1. **Synthetic Data Integrity**: All data used within this prototype is completely synthetic and generated for demonstration purposes. No Personally Identifiable Information (PII) or proprietary financial data is stored or processed.
2. **Fairness & Non-Discrimination**: Targeting decisions are driven strictly by aggregated behavioral transactional signals (tenure, transaction frequency, category usage, recency) and causal responsiveness. Demographic or sensitive personal attributes are never utilized for model scoring.
3. **Fatigue Mitigation**: The system explicitly embeds negative feedback protection to prioritize long-term user trust over short-term campaign reach.
4. **Human-in-the-Loop Governance**: The platform operates as an intelligence and decision-support system. Final campaign launch decisions, budget authorizations, and creative content remain under human marketing manager control.
5. **Production Validation**: For real-world MFS deployment, uplift estimates must be continuously calibrated and validated via randomized controlled A/B experiments (treatment vs. holdout control groups) to measure actual incremental business lift.
