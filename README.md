# AutomationEDA (FastAPI + Next.js)

Aplikasi **EDA otomatis** (Exploratory Data Analysis) yang menerima file dataset (CSV/Excel/JSON/TXT), menghitung ringkasan statistik, matriks korelasi (Pearson) untuk numerik, dan asosiasi (Cramér's V) untuk kategorik, serta menyediakan visualisasi dan insight.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Backend (FastAPI)](#backend-fastapi)
- [Frontend (Next.js)](#frontend-nextjs)
- [API Endpoints](#api-endpoints)
- [Data Flow](#data-flow)
- [Prasyarat](#prasyarat)
- [Cara Menjalankan](#cara-menjalankan)

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            Next.js 16 App (Frontend)                    │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │  │
│  │  │ Upload   │  │ Preview  │  │ Visualizations      │   │  │
│  │  │ Page     │  │ Page     │  │ (Highcharts)        │   │  │
│  │  └──────────┘  └──────────┘  └─────────────────────┘   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │  │
│  │  │ Cleaning │  │ Insights │  │ Reports & Export    │   │  │
│  │  │ Page     │  │ Page     │  │ (PDF/CSV/XLSX)      │   │  │
│  │  └──────────┘  └──────────┘  └─────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
│                           │ HTTP (credentials: include)      │
│                           ▼                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              FastAPI Server (Backend)                   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │  │
│  │  │ Auth     │  │ EDA      │  │ AI Engine           │   │  │
│  │  │ (JWT)    │  │ Pipeline │  │ (Gemini/Groq)       │   │  │
│  │  └──────────┘  └──────────┘  └─────────────────────┘   │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │  │
│  │  │ Cleaning │  │ Reports  │  │ Visualization Gen   │   │  │
│  │  │ Module   │  │ (PDF/    │  │ (Highcharts config)  │   │  │
│  │  │          │  │  HTML)   │  │                      │   │  │
│  │  └──────────┘  └──────────┘  └─────────────────────┘   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**Stack:**
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Zustand, Highcharts, Recharts
- **Backend:** Python 3.10+, FastAPI, Pandas, NumPy, SciPy, ReportLab, Jinja2
- **AI:** Google Gemini 1.5 Flash, Groq (Llama 3.1) — fallback rule-based engine
- **Auth:** JWT (PyJWT) with httpOnly cookies
- **Storage:** Per-user pickle files (`backend/data/users/{user_id}/`)

---

## Backend (FastAPI)

### Directory Structure

```
backend/
├── main.py                          # Entry point: FastAPI app, all routes, orchestrator
├── cleaning.py                      # Dataset cleaning logic
├── insights.py                      # AI insights + rule-based fallback
├── requirements.txt                 # Python dependencies
├── backend/
│   ├── __init__.py
│   ├── auth.py                      # JWT auth, hardcoded users
│   ├── categorical_analysis.py      # Cramér's V, describe_categorical
│   ├── dependencies.py              # FastAPI Depends (require_user_id)
│   ├── descriptive_stats.py         # describe_numeric (Shapiro-Wilk, IQR, skewness)
│   ├── reports.py                   # Full report builder, PDF/HTML/XLSX export
│   ├── utils.py                     # File I/O, JSON sanitization, user paths
│   └── visualization.py             # Highcharts config generators
└── data/
    └── users/{user_id}/             # Per-user pickle + metadata storage
```

### Core Modules

| Module | File | Responsibility |
|---|---|---|
| **Auth** | `backend/auth.py` | JWT creation/verification, hardcoded user store (`USERS_DB`), cookie-based sessions |
| **Dependencies** | `backend/dependencies.py` | FastAPI `Depends(require_user_id)` — extracts user ID from JWT cookie |
| **Utils** | `backend/utils.py` | File parsing (CSV/XLSX/JSON/TXT), per-user path resolution, JSON sanitization (`sanitize_obj`, `clean_json_payload`), dataset preview builder |
| **Descriptive Stats** | `backend/descriptive_stats.py` | `describe_numeric()` — mean, median, std, variance, skewness, kurtosis, Shapiro-Wilk normality test, IQR outlier detection |
| **Categorical Analysis** | `backend/categorical_analysis.py` | `describe_categorical()` — mode, frequency, missing %, unique count; `_manual_pearson()`, `_manual_cramers_v()` — manual implementations of Pearson r and Cramér's V |
| **Visualization** | `backend/visualization.py` | Generates **Highcharts** JSON config for histogram, boxplot, bar chart, pie chart, scatter plot, heatmap, stacked bar, grouped box plot, time series |
| **Reports** | `backend/reports.py` | `build_full_report()` — journal-style academic report with anomaly scan, dispersion/skewness/correlation narratives, strategic verdict; PDF via ReportLab, HTML via Jinja2, XLSX via openpyxl |
| **Cleaning** | `cleaning.py` | `clean_dataset()` — drops duplicates, drops missing rows, standardizes column names |
| **Insights** | `insights.py` | `generate_ai_insight()` — Gemini AI insight with rule-based fallback (7 fallback types: overview, summary, numerical, categorical, bivariate, generic); `get_chart_recommendation()` — AI chart recommendation with fallback; `generate_intelligent_insights()` — 7-category computed insight bundle |
| **Main** | `main.py` | App bootstrap, CORS, all REST endpoints, JSON safety pipeline, orchestrator |

### Authentication

Uses **JWT (HS256)** with httpOnly cookies. Hardcoded users for demo:

```python
USERS_DB = [
    {"id": "1", "email": "hello@arhamkhnz.com", "password": "admin123", "role": "administrator"},
    {"id": "2", "email": "hello@ammarkhnz.com", "password": "admin123", "role": "admin"},
    {"id": "3", "email": "test@test.com", "password": "test123", "role": "user"},
]
```

- Cookie name: `eda_session_token`
- Expiry: 7 days
- All protected endpoints use `Depends(require_user_id)` which reads the cookie

### EDA Pipeline

The core analysis pipeline (`_run_eda()` in `main.py:1585`):

```
Input DataFrame
    │
    ├─► _compute_dataset_meta()    → rows, columns, duplicates, missing cells
    ├─► _compute_summary_stats()   → per-numeric-column: count, mean, median, std,
    │                                  variance, min, max, q1, q3, skewness, kurtosis,
    │                                  normality flag, outlier count
    ├─► _compute_pearson_matrix()  → full Pearson correlation matrix (nested dict)
    └─► _compute_cramers_v_matrix()→ Cramér's V association matrix for categorical columns
```

### AI Insights Architecture

```
Insight Request
    │
    ├─► Gemini API key present?
    │   YES ─► call Gemini 1.5 Flash (system prompt: Senior Data Analyst in Indonesian)
    │   NO  ─► GROQ API key present?
    │           YES ─► call Llama 3.1-70b via Groq
    │           NO  ─► rule-based fallback engine
    │
    └─► Return insight text
```

**Fallback types:**
- `_fallback_overview` — dataset dimensions, column counts
- `_fallback_summary` — missing value warnings
- `_fallback_numerical` — skewness, outliers, distribution, mean-vs-median analysis
- `_fallback_categorical` — mode dominance, missing %, category count
- `_fallback_bivariate` — Pearson r / Cramér's V interpretation
- `_fallback_generic` — generic stats summary

### JSON Safety Pipeline

All endpoints pass through `clean_json_payload()` which recursively converts:
- `np.int64`/`np.float64` → native Python int/float
- `np.nan`/`float('inf')` → `None`
- `np.ndarray` → list
- `pd.Timestamp` → str
- `pd.DataFrame` → `{columns, index, data}`

This guarantees 100% JSON compliance with zero NumPy/NaN leakage.

### Per-User Data Storage

```
backend/data/users/{user_id}/
├── data_raw.pkl              # Original uploaded DataFrame (pickle)
├── data_clean.pkl            # Cleaned DataFrame (after interactive cleaning)
├── active_dataset.pkl        # Currently active dataset (raw or clean)
├── active_dataset_meta.json  # Metadata: fileName, rows, columns, fileSize, uploadedAt
└── upload_history.json       # Last 10 uploads
```

### Report Generation

| Format | Technology | Entry Point |
|---|---|---|
| **PDF** | ReportLab | `report_to_pdf_bytes()` |
| **HTML** | Jinja2 | `_generate_html_jinja()` |
| **CSV** | Pandas | `dataframe_to_csv_bytes()` |
| **XLSX** | openpyxl | `dataframe_to_xlsx_bytes()` |

The HTML/PDF report follows an **academic journal format** with:
- Abstract (ABSTRAK)
- Introduction (PENDAHULUAN)
- Methodology (METODOLOGI) — IQR formula, skewness normality criterion
- Results (HASIL DAN PEMBAHASAN) — anomaly tables, numeric/categorical stats tables, correlation insight
- Conclusion (KESIMPULAN) — integrity score, strategic verdict

---

## Frontend (Next.js)

### Directory Structure

```
frontend/
├── package.json
├── next.config.mjs
├── tsconfig.json
├── biome.json                  # Linting/formatting (Biome)
├── postcss.config.mjs
├── components.json             # shadcn/ui config
├── src/
│   ├── app/
│   │   ├── globals.css         # Global Tailwind styles
│   │   ├── layout.tsx          # Root layout
│   │   ├── not-found.tsx       # 404 page
│   │   ├── (external)/
│   │   │   ├── landing/        # Landing page (public)
│   │   │   └── page.tsx        # Root redirect
│   │   └── (main)/
│   │       ├── auth/           # Login page
│   │       ├── unauthorized/   # Access denied
│   │       └── dashboard/      # Main app (protected)
│   │           ├── layout.tsx  # Sidebar, header, DatasetProvider
│   │           ├── page.tsx    # Upload page (default)
│   │           ├── data-preview/
│   │           ├── cleaning/
│   │           ├── data-cleaning/
│   │           ├── descriptive-statistics/
│   │           ├── analytics/
│   │           ├── insights/
│   │           ├── interpretation/
│   │           ├── visualizations/
│   │           ├── reports/
│   │           ├── download/
│   │           ├── upload-data/
│   │           ├── crm/
│   │           ├── logistics/
│   │           ├── productivity/
│   │           ├── academy/
│   │           └── coming-soon/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── visualizations/
│   │   │   ├── highcharts-chart.tsx    # Dynamic Highcharts wrapper
│   │   │   ├── ai-insight-panel.tsx    # AI insight display
│   │   │   ├── viz-field-select.tsx    # Column selector for viz
│   │   │   └── viz-page-shell.tsx      # Visualization page shell
│   │   ├── empty-dataset.tsx
│   │   ├── date-range-picker.tsx
│   │   └── simple-icon.tsx
│   ├── config/
│   │   └── app-config.ts       # App metadata
│   ├── context/
│   │   └── dataset-context.tsx  # React context for dataset state
│   ├── hooks/
│   │   ├── use-dataset-columns.ts  # Fetch numeric/categorical columns
│   │   └── use-mobile.ts
│   ├── lib/
│   │   ├── dataset-client.ts    # API client for dataset endpoints
│   │   ├── insights-client.ts   # API client for AI insights
│   │   ├── visualization-client.ts # API client for Highcharts config
│   │   ├── reports-client.ts
│   │   ├── cookie.client.ts
│   │   ├── local-storage.client.ts
│   │   ├── preferences/        # Sidebar layout preferences
│   │   ├── fonts/
│   │   └── utils.ts            # cn() helper (clsx + tailwind-merge)
│   ├── navigation/
│   │   └── sidebar/            # App sidebar navigation
│   ├── proxy.ts                # Next.js middleware (route protection)
│   ├── scripts/                # Build-time scripts (theme presets)
│   ├── server/
│   │   └── server-actions.ts   # Next.js server actions for preferences
│   └── stores/
│       ├── preferences/        # Zustand store for sidebar/theme
│       └── upload/             # Zustand store for upload state
```

### Key Frontend Pages

| Route | Component | Description |
|---|---|---|
| `/` | Root redirect | Redirects to `/landing` |
| `/landing` | Landing page | Public landing page |
| `/auth` | Login page | Email/password login form |
| `/dashboard` | Upload page | Drag-and-drop file upload, format info |
| `/dashboard/data-preview` | Dataset preview | Table view with column types, missing values |
| `/dashboard/cleaning` | Cleaning | Cleaning diagnostics + action buttons |
| `/dashboard/data-cleaning` | Interactive cleaning | Per-action cleaning (drop duplicates, impute, etc.) |
| `/dashboard/descriptive-statistics` | Stats tables | Numeric & categorical stats |
| `/dashboard/analytics` | Analytics | Charts, statistical analysis |
| `/dashboard/visualizations` | Visualizations | Highcharts + AI chart recommendations |
| `/dashboard/insights` | AI insights | Intelligent insight dashboard |
| `/dashboard/interpretation` | Interpretation | Column-by-column AI analysis |
| `/dashboard/reports` | Reports | Generate PDF/HTML report |
| `/dashboard/download` | Export | Download CSV/XLSX/PDF |

### State Management

- **React Context** (`dataset-context.tsx`): Current dataset info (rows, columns, upload state)
- **Zustand stores** (`stores/`): Upload history, sidebar/theme preferences
- **Server Actions** (`server/server-actions.ts`): Persist sidebar layout preferences
- **Next.js cookies**: Auth token, sidebar state

### Visualization Architecture

```
User selects column(s) and chart type
    │
    ▼
POST /api/visualization/numerical (or categorical/bivariate/time-series)
    │
    ▼
Backend generates Highcharts JSON config:
    {
      chart: { type, zoomType },
      title: { text },
      xAxis: { categories },
      yAxis: { title },
      series: [{ name, data }],
      ...
    }
    │
    ▼
Frontend renders via highcharts-react-official
    (dynamic import with lazy loading)
```

The `HighchartsChart` component uses **dynamic imports** with a singleton promise pattern to load Highcharts modules only once.

### Route Protection

The `proxy.ts` middleware checks for `eda_session_token` cookie on `/dashboard/*` routes and redirects to `/landing` if missing.

---

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login, sets `eda_session_token` cookie |
| GET | `/api/auth/me` | Get current user info from cookie |
| POST | `/api/auth/logout` | Clear cookie |

### Dataset

| Method | Path | Description |
|---|---|---|
| GET | `/api/current-dataset` | Get active dataset metadata + preview + column lists |
| POST | `/api/upload` | Upload file (CSV/XLSX/JSON/TXT), saves to user storage |
| POST | `/api/data/analyze` | Upload → parse → save → run full EDA pipeline |
| GET | `/api/data/analyze` | Auto-fetch EDA diagnostics for existing dataset |
| GET | `/api/data/me` | Check if user has raw/clean data |
| GET | `/api/data/ai-schema` | AI-powered column classification with Gemini/Groq fallback |
| POST | `/api/data/chart-render` | Statistical computation engine for 4 scopes (univariate, bivariate, multivariate, timeseries) |
| POST | `/api/reset` | Reset/delete all user datasets |

### Cleaning

| Method | Path | Description |
|---|---|---|
| POST | `/api/data/clean` | Interactive cleaning (drop_duplicates, impute_mean, impute_median, impute_mode, drop_missing_rows, standardize_text) |
| GET | `/api/data/cleaning-summary` | Cleaning diagnostics with per-column missing values |
| POST | `/api/data/execute-cleaning` | Execute cleaning action (drop_duplicates, impute_missing, reset_raw) |

### Analysis

| Method | Path | Description |
|---|---|---|
| POST | `/api/analysis/numeric` | Numeric descriptive statistics |
| POST | `/api/analysis/categorical` | Categorical descriptive statistics |
| POST | `/api/preview` | Dataset preview (first 10 rows) |
| GET | `/api/insights` | 7-category intelligent insights |
| GET | `/api/interpretation` | Column-by-column AI interpretation |
| GET | `/api/reports` | Full report data |

### Visualization

| Method | Path | Description |
|---|---|---|
| POST | `/api/visualization/numerical` | Numerical chart config (histogram, boxplot) |
| POST | `/api/visualization/categorical` | Categorical chart config (bar chart, pie chart) |
| POST | `/api/visualization/bivariate` | Bivariate chart config (scatter, heatmap, stacked bar, box plot) |
| POST | `/api/visualization/time-series` | Time series line chart config |

### Insights

| Method | Path | Description |
|---|---|---|
| POST | `/api/insights/univariate` | AI insight for a single column |
| POST | `/api/insights/bivariate` | AI insight for column pair relationship |
| POST | `/api/insights/text` | Generic AI insight from raw stats |
| POST | `/api/insights/recommend-chart` | AI chart recommendation for a column |

### Reports & Export

| Method | Path | Description |
|---|---|---|
| POST | `/api/export/report` | Text report with AI insights |
| POST | `/api/reports/generate` | Generate PDF or HTML report with selected sections |
| GET | `/api/download/csv` | Download dataset as CSV |
| GET | `/api/download/xlsx` | Download dataset + stats as XLSX |
| GET | `/api/download/pdf` | Download dataset report as PDF |

### History

| Method | Path | Description |
|---|---|---|
| GET | `/api/data/history` | Last 10 uploads for current user |
| POST | `/api/data/restore` | Restore a dataset from history |
| DELETE | `/api/data/history` | Delete a dataset from history + backups |

### Health

| Method | Path | Description |
|---|---|---|
| GET | `/` | Health check + user dataset status |

---

## Data Flow

### Upload → Analysis Flow

```
1. User drags file onto upload dropzone
2. Frontend POSTs to /api/data/analyze (multipart upload)
3. Backend:
   a. Reads file bytes → parses via _parse_uploaded_bytes()
      - CSV: tries utf-8-sig, utf-8, latin-1, cp1252
      - XLSX: openpyxl
      - TXT: tries tab, then comma
      - JSON: array of objects or column-oriented object
   b. Saves raw bytes to user's data directory
   c. Pickles DataFrame to active_dataset.pkl
   d. Creates backup of any existing raw file
   e. Runs _run_eda() pipeline:
      - _compute_dataset_meta()
      - _compute_summary_stats()
      - _compute_pearson_matrix()
      - _compute_cramers_v_matrix()
   f. Returns JSON with summary_stats, pearson_matrix,
      cramers_v_matrix, dataset_meta, data_preview
4. Frontend receives response → updates DatasetContext
5. User navigates to data-preview, cleaning, statistics, etc.
```

### Cleaning Flow

```
1. GET /api/data/analyze → load existing clean/raw data
2. POST /api/data/clean { action: "drop_duplicates" }
   (or impute_mean/median/mode, drop_missing_rows, standardize_text)
3. Backend:
   a. Loads from data_clean.pkl (fallback to data_raw.pkl)
   b. Applies cleaning operation
   c. Saves to data_clean.pkl AND active_dataset.pkl
   d. Updates metadata with new row/column counts
   e. Returns changes summary
```

### Visualization Flow

```
1. Frontend fetches numeric_columns / categorical_columns from /api/current-dataset
2. User selects column(s) and chart type
3. Frontend POSTs to visualization endpoint (form data):
   - /api/visualization/numerical?col=X&chart_type=histogram
   - /api/visualization/categorical?col=Y&chart_type=piechart
   - /api/visualization/bivariate?x_col=X&y_col=Y&chart_type=scatter
   - /api/visualization/time-series?date_col=D&value_col=V
4. Backend generates Highcharts-compatible JSON config
5. Frontend renders via <HighchartsChart options={...} />
```

### AI Insight Flow

```
1. POST /api/insights/univariate { col: "Salary", type: "numerical" }
2. Backend:
   a. Calls describe_numeric() to compute stats
   b. Passes stats to generate_ai_insight(stats, "univariate_numerical")
   c. AI Engine:
      - If GEMINI_API_KEY set: call Gemini 1.5 Flash
      - Else if GROQ_API_KEY set: call Llama 3.1-70b via Groq
      - Else: use _fallback_numerical(stats) → rule-based interpretation
   d. Returns { stats, insight }
```

---

## Prasyarat

- Python 3.10+ (disarankan)
- Node.js 18+

## Cara Menjalankan

### 1) Jalankan Backend (FastAPI)

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: `http://localhost:8000`

### 2) Jalankan Frontend (Next.js)

```bat
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

### Environment Variables (backend/.env)

| Variable | Description |
|---|---|
| `AUTH_SECRET_KEY` | JWT signing key (default: `automationeda-secret-key-2025`) |
| `GEMINI_API_KEY` | Google Gemini API key for AI insights |
| `GROQ_API_KEY` | Groq API key (fallback if Gemini unavailable) |

## File Dataset

Dataset disimpan per-user di folder `backend/data/users/{user_id}/` dalam format pickle (`.pkl`) untuk status sesi/analisis lanjutan.
