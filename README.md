<div align="center">

# 🔬 AutomationEDA

**Automated Exploratory Data Analysis Platform**

[![Live Demo](https://img.shields.io/badge/🌐%20Live%20Demo-automationeda.vercel.app-6366f1?style=for-the-badge)](https://automationeda.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

Platform EDA (Exploratory Data Analysis) otomatis yang mampu memproses dataset CSV/Excel/JSON/TXT, menghitung statistik deskriptif, korelasi Pearson, asosiasi Cramér's V, menghasilkan visualisasi interaktif, serta AI insights menggunakan Google Gemini / Groq (Llama 3.1).

</div>

---

## 📑 Table of Contents

- [🌐 Live Demo](#-live-demo)
- [✨ Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [📦 Tech Stack](#-tech-stack)
- [🚀 Quick Start (Local Development)](#-quick-start-local-development)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Backend Setup (FastAPI)](#2-backend-setup-fastapi)
  - [3. Frontend Setup (Next.js)](#3-frontend-setup-nextjs)
  - [4. Environment Variables](#4-environment-variables)
- [🗂️ Project Structure](#️-project-structure)
  - [Backend Structure](#backend-structure)
  - [Frontend Structure](#frontend-structure)
- [🔌 API Reference](#-api-reference)
  - [Authentication](#authentication)
  - [Dataset](#dataset)
  - [Cleaning](#cleaning)
  - [Analysis](#analysis)
  - [Visualization](#visualization)
  - [Insights](#insights)
  - [Reports & Export](#reports--export)
  - [History](#history)
- [🔄 Data Flow](#-data-flow)
  - [Upload → Analysis Flow](#upload--analysis-flow)
  - [Cleaning Flow](#cleaning-flow)
  - [Visualization Flow](#visualization-flow)
  - [AI Insight Flow](#ai-insight-flow)
- [🧠 Core Modules Deep Dive](#-core-modules-deep-dive)
  - [EDA Pipeline](#eda-pipeline)
  - [AI Insights Architecture](#ai-insights-architecture)
  - [JSON Safety Pipeline](#json-safety-pipeline)
  - [Report Generation](#report-generation)
  - [Per-User Data Storage](#per-user-data-storage)
- [🎨 Frontend Architecture](#-frontend-architecture)
  - [State Management](#state-management)
  - [Visualization Architecture](#visualization-architecture)
  - [Route Protection](#route-protection)
- [🔐 Authentication](#-authentication)
- [🐳 Docker (Backend)](#-docker-backend)
- [🚢 Deployment](#-deployment)
- [🛠️ Development Tools](#️-development-tools)
- [📄 License](#-license)

---

## 🌐 Live Demo

> **Production URL:** [https://automationeda.vercel.app](https://automationeda.vercel.app)

| Akun Demo | Email | Password |
|---|---|---|
| Administrator | `hello@arhamkhnz.com` | `admin123` |
| Admin | `hello@ammarkhnz.com` | `admin123` |
| User | `test@test.com` | `test123` |

---

## ✨ Features

| Fitur | Deskripsi |
|---|---|
| 📤 **Multi-format Upload** | Mendukung CSV, Excel (XLSX/XLS), JSON, dan TXT |
| 📊 **Descriptive Statistics** | Mean, median, std, variance, skewness, kurtosis, Shapiro-Wilk normality test, IQR outlier detection |
| 🔗 **Correlation Matrix** | Pearson correlation untuk kolom numerik |
| 🗂️ **Association Matrix** | Cramér's V untuk kolom kategorik |
| 🧹 **Data Cleaning** | Drop duplikat, impute mean/median/mode, drop missing rows, standardize text |
| 📈 **Interactive Visualizations** | Histogram, boxplot, bar chart, pie chart, scatter plot, heatmap, stacked bar, time series (via Highcharts) |
| 🤖 **AI Insights** | Google Gemini 1.5 Flash / Groq Llama 3.1-70b — fallback rule-based engine |
| 📝 **Academic Reports** | Export PDF (ReportLab), HTML (Jinja2), CSV, XLSX dalam format journal akademik |
| 🔐 **Auth** | JWT + httpOnly cookie, session 7 hari |
| 📚 **Upload History** | Simpan & restore 10 dataset terakhir per user |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser / Client                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  Next.js 16 App (Frontend)                    │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │  Upload &   │  │   Data      │  │   Visualizations     │  │  │
│  │  │  Preview    │  │   Cleaning  │  │   (Highcharts)       │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │ Descriptive │  │ AI Insights │  │  Reports & Export    │  │  │
│  │  │ Statistics  │  │ & Interpret │  │  (PDF/CSV/XLSX)      │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │
│  │                                                               │  │
│  │  State: React Context + Zustand + Next.js Server Actions      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                        │                                            │
│              HTTP REST (credentials: include)                       │
│              Cookie: eda_session_token (httpOnly)                   │
│                        │                                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                  FastAPI Server (Backend)                     │  │
│  │                                                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │  Auth (JWT) │  │ EDA Pipeline│  │   AI Engine          │  │  │
│  │  │  PyJWT HS256│  │ Pandas+SciPy│  │  Gemini / Groq       │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────┐  │  │
│  │  │  Cleaning   │  │  Reports    │  │  Visualization Gen   │  │  │
│  │  │  Module     │  │  (ReportLab │  │  (Highcharts JSON)   │  │  │
│  │  │             │  │   Jinja2)   │  │                      │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────────────┘  │  │
│  │                                                               │  │
│  │  Storage: Per-user pickle files (backend/data/users/{id}/)   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Tech Stack

### Backend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **Python** | 3.10+ | Runtime utama |
| **FastAPI** | 0.115.8 | REST API framework |
| **Uvicorn** | 0.34.0 | ASGI server |
| **Pandas** | 2.2.3 | Manipulasi & analisis data |
| **NumPy** | 2.2.3 | Komputasi numerik |
| **SciPy** | 1.15.1 | Shapiro-Wilk test, statistik lanjutan |
| **openpyxl** | 3.1.5 | Baca/tulis file Excel (XLSX) |
| **xlrd** | 2.0.1 | Baca file Excel lama (XLS) |
| **PyJWT** | 2.9.0 | JWT authentication |
| **ReportLab** | latest | Generate PDF |
| **Jinja2** | latest | Template HTML report |
| **google-generativeai** | 0.8.4 | Google Gemini AI API |
| **groq** | latest | Groq (Llama 3.1) API |
| **python-dotenv** | 1.0.1 | Environment variables |
| **python-multipart** | 0.0.20 | File upload (multipart/form-data) |

### Frontend
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **Next.js** | 16.x | React framework + App Router |
| **React** | 19.x | UI library |
| **TypeScript** | 5.x | Type safety |
| **Tailwind CSS** | 4.x | Utility-first CSS |
| **shadcn/ui** | 4.x | Accessible UI components |
| **Zustand** | 5.x | Global state management |
| **Highcharts** | 12.x | Interactive charts |
| **Recharts** | 3.x | React chart library |
| **Framer Motion** | 12.x | Animasi |
| **TanStack Table** | 8.x | Tabel data canggih |
| **Zod** | 4.x | Schema validation |
| **React Hook Form** | 7.x | Form management |
| **Biome** | 2.x | Linting & formatting |
| **Husky** | 9.x | Git hooks |

### Deployment
| Komponen | Platform |
|---|---|
| **Frontend** | [Vercel](https://vercel.com) |
| **Backend** | [Hugging Face Spaces](https://huggingface.co/spaces) (Docker) |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

Pastikan tools berikut sudah terinstall di sistem kamu:

- **Python 3.10+** → [download](https://www.python.org/downloads/)
- **Node.js 18+** → [download](https://nodejs.org/)
- **npm** (bundled bersama Node.js)
- **Git** → [download](https://git-scm.com/)

Verifikasi instalasi:
```bash
python --version    # Python 3.10.x atau lebih baru
node --version      # v18.x.x atau lebih baru
npm --version       # 9.x.x atau lebih baru
git --version
```

---

### 1. Clone Repository

```bash
git clone https://github.com/YanDraa/AutomationEDA.git
cd AutomationEDA
```

---

### 2. Backend Setup (FastAPI)

#### a. Masuk ke direktori backend

```bash
cd backend
```

#### b. Buat virtual environment

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

> **Tanda aktivasi berhasil:** Prompt terminal akan menampilkan `(.venv)` di depannya.

#### c. Install dependencies

```bash
pip install -r requirements.txt
```

Proses ini akan menginstall semua library yang dibutuhkan (FastAPI, Pandas, NumPy, SciPy, ReportLab, dll.).

#### d. Buat file `.env`

```bash
# Buat file .env di dalam direktori backend/
cp .env.example .env   # jika ada contohnya
# atau buat manual:
```

Isi file `backend/.env`:
```env
AUTH_SECRET_KEY=automationeda-secret-key-2025
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

> **Catatan:** `GEMINI_API_KEY` dan `GROQ_API_KEY` bersifat opsional. Jika keduanya tidak diset, sistem akan otomatis menggunakan **rule-based fallback engine** untuk insight.

#### e. Jalankan backend server

```bash
uvicorn main:app --reload
```

Backend akan berjalan di: **http://localhost:8000**

Dokumentasi API interaktif (Swagger UI) tersedia di: **http://localhost:8000/docs**

---

### 3. Frontend Setup (Next.js)

Buka terminal **baru** (jangan tutup terminal backend), lalu:

#### a. Masuk ke direktori frontend

```bash
# dari root project
cd frontend
```

#### b. Install dependencies

```bash
npm install
```

#### c. Buat file `.env.local`

```bash
# Buat file .env.local di dalam direktori frontend/
```

Isi file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Penting:** Variabel ini menentukan ke mana frontend mengirim request API. Untuk production, nilainya adalah URL backend yang sudah di-deploy (misal: Hugging Face Spaces URL).

#### d. Jalankan development server

```bash
npm run dev
```

Frontend akan berjalan di: **http://localhost:3000**

---

### 4. Environment Variables

#### Backend (`backend/.env`)

| Variable | Required | Default | Deskripsi |
|---|---|---|---|
| `AUTH_SECRET_KEY` | ✅ Ya | `automationeda-secret-key-2025` | Kunci untuk menandatangani JWT (HS256). **Ganti di production!** |
| `GEMINI_API_KEY` | ⚙️ Opsional | — | Google Gemini 1.5 Flash API key. Dapatkan di [Google AI Studio](https://aistudio.google.com/) |
| `GROQ_API_KEY` | ⚙️ Opsional | — | Groq API key untuk Llama 3.1-70b. Dapatkan di [console.groq.com](https://console.groq.com/) |

#### Frontend (`frontend/.env.local`)

| Variable | Required | Deskripsi |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ Ya | URL backend FastAPI. Contoh: `http://localhost:8000` (dev) atau URL Hugging Face Spaces (prod) |

---

## 🗂️ Project Structure

### Backend Structure

```
backend/
├── main.py                          # Entry point: FastAPI app, semua routes, orchestrator
├── cleaning.py                      # Dataset cleaning logic
├── insights.py                      # AI insights + rule-based fallback engine
├── requirements.txt                 # Python dependencies
├── Dockerfile                       # Docker image untuk deploy ke Hugging Face Spaces
├── .env                             # Environment variables (tidak di-commit ke Git)
├── backend/
│   ├── __init__.py
│   ├── auth.py                      # JWT auth, user store, cookie management
│   ├── categorical_analysis.py      # Cramér's V, describe_categorical()
│   ├── dependencies.py              # FastAPI Depends → require_user_id
│   ├── descriptive_stats.py         # describe_numeric() (Shapiro-Wilk, IQR, skewness)
│   ├── reports.py                   # Full report builder, PDF/HTML/XLSX export
│   ├── utils.py                     # File I/O, JSON sanitization, user path resolver
│   └── visualization.py             # Highcharts JSON config generators
└── data/
    └── users/{user_id}/             # Per-user pickle + metadata storage
        ├── data_raw.pkl
        ├── data_clean.pkl
        ├── active_dataset.pkl
        ├── active_dataset_meta.json
        └── upload_history.json
```

### Frontend Structure

```
frontend/
├── package.json
├── next.config.mjs                  # Next.js config (React Compiler, redirects)
├── tsconfig.json
├── biome.json                       # Biome linter/formatter config
├── postcss.config.mjs
├── components.json                  # shadcn/ui config
└── src/
    ├── app/
    │   ├── globals.css              # Global Tailwind CSS styles + CSS variables
    │   ├── layout.tsx               # Root layout (Geist font, theme provider)
    │   ├── not-found.tsx            # Custom 404 page
    │   ├── (external)/
    │   │   ├── landing/             # Landing page (public, no auth required)
    │   │   └── page.tsx             # Root redirect → /landing
    │   └── (main)/
    │       ├── auth/                # Login page
    │       ├── unauthorized/        # Access denied page
    │       └── dashboard/           # Protected main application
    │           ├── layout.tsx       # Dashboard layout (Sidebar, Header, DatasetProvider)
    │           ├── page.tsx         # Default redirect → upload-data
    │           ├── data-preview/    # Tabel preview dataset
    │           ├── cleaning/        # Cleaning diagnostics
    │           ├── data-cleaning/   # Interactive per-action cleaning
    │           ├── descriptive-statistics/  # Tabel statistik numerik & kategorik
    │           ├── analytics/       # Charts & statistical analysis
    │           ├── insights/        # AI insight dashboard (7 kategori)
    │           ├── interpretation/  # Column-by-column AI analysis
    │           ├── visualizations/  # Highcharts + AI chart recommendation
    │           ├── reports/         # Generate PDF/HTML report
    │           ├── download/        # Export CSV/XLSX/PDF
    │           └── upload-data/     # Drag-and-drop file upload
    ├── components/
    │   ├── ui/                      # shadcn/ui components (Button, Card, Dialog, dll.)
    │   ├── visualizations/
    │   │   ├── highcharts-chart.tsx     # Dynamic Highcharts wrapper (singleton pattern)
    │   │   ├── ai-insight-panel.tsx     # Panel display AI insight
    │   │   ├── viz-field-select.tsx     # Column selector untuk visualisasi
    │   │   └── viz-page-shell.tsx       # Visualization page shell
    │   ├── empty-dataset.tsx        # Komponen untuk state dataset kosong
    │   ├── date-range-picker.tsx
    │   └── simple-icon.tsx
    ├── config/
    │   └── app-config.ts            # App metadata (nama, deskripsi, dll.)
    ├── context/
    │   └── dataset-context.tsx      # React Context untuk dataset state global
    ├── hooks/
    │   ├── use-dataset-columns.ts   # Custom hook: fetch numeric/categorical columns
    │   └── use-mobile.ts            # Custom hook: deteksi mobile viewport
    ├── lib/
    │   ├── dataset-client.ts        # API client: dataset endpoints
    │   ├── insights-client.ts       # API client: AI insights endpoints
    │   ├── visualization-client.ts  # API client: Highcharts config endpoints
    │   ├── reports-client.ts        # API client: report generation
    │   ├── cookie.client.ts         # Cookie utilities (client-side)
    │   ├── local-storage.client.ts  # LocalStorage utilities
    │   ├── preferences/             # Sidebar layout preferences logic
    │   ├── fonts/                   # Font loader (Geist)
    │   └── utils.ts                 # cn() helper (clsx + tailwind-merge)
    ├── navigation/
    │   └── sidebar/                 # App sidebar navigation config & components
    ├── proxy.ts                     # Next.js middleware → route protection
    ├── scripts/                     # Build-time scripts (generate theme presets)
    ├── server/
    │   └── server-actions.ts        # Next.js Server Actions (sidebar preferences)
    └── stores/
        ├── preferences/             # Zustand store: sidebar & theme preferences
        └── upload/                  # Zustand store: upload progress & history
```

---

## 🔌 API Reference

Base URL (local): `http://localhost:8000`
Base URL (production): URL backend Hugging Face Spaces kamu

> Semua endpoint yang memerlukan autentikasi membaca cookie `eda_session_token` secara otomatis dari request header.

---

### Authentication

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/auth/login` | ❌ | Login dengan email & password. Menyimpan cookie `eda_session_token` |
| `GET` | `/api/auth/me` | ✅ | Ambil info user saat ini berdasarkan cookie |
| `POST` | `/api/auth/logout` | ✅ | Hapus cookie sesi |

**Request body** `POST /api/auth/login`:
```json
{
  "email": "test@test.com",
  "password": "test123"
}
```

**Response** `POST /api/auth/login`:
```json
{
  "message": "Login successful",
  "user": {
    "id": "3",
    "email": "test@test.com",
    "role": "user"
  }
}
```

---

### Dataset

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/current-dataset` | ✅ | Ambil metadata dataset aktif + preview + daftar kolom |
| `POST` | `/api/upload` | ✅ | Upload file (multipart). Simpan ke user storage |
| `POST` | `/api/data/analyze` | ✅ | Upload → parse → simpan → jalankan full EDA pipeline |
| `GET` | `/api/data/analyze` | ✅ | Auto-fetch EDA diagnostics dari dataset yang sudah ada |
| `GET` | `/api/data/me` | ✅ | Cek apakah user punya data raw/clean |
| `GET` | `/api/data/ai-schema` | ✅ | AI-powered column type classification |
| `POST` | `/api/data/chart-render` | ✅ | Statistical computation engine (univariate/bivariate/multivariate/timeseries) |
| `POST` | `/api/reset` | ✅ | Reset/hapus semua dataset user |

---

### Cleaning

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/data/clean` | ✅ | Interactive cleaning: `drop_duplicates`, `impute_mean`, `impute_median`, `impute_mode`, `drop_missing_rows`, `standardize_text` |
| `GET` | `/api/data/cleaning-summary` | ✅ | Diagnostik cleaning: per-kolom missing values, info duplikat |
| `POST` | `/api/data/execute-cleaning` | ✅ | Execute cleaning action: `drop_duplicates`, `impute_missing`, `reset_raw` |

**Request body** `POST /api/data/clean`:
```json
{
  "action": "impute_mean",
  "columns": ["Age", "Salary"]
}
```

---

### Analysis

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/analysis/numeric` | ✅ | Statistik deskriptif numerik |
| `POST` | `/api/analysis/categorical` | ✅ | Statistik deskriptif kategorik |
| `POST` | `/api/preview` | ✅ | Preview dataset (10 baris pertama) |
| `GET` | `/api/insights` | ✅ | 7-kategori intelligent insights |
| `GET` | `/api/interpretation` | ✅ | Column-by-column AI interpretation |
| `GET` | `/api/reports` | ✅ | Full report data (semua statistik teragregasi) |

---

### Visualization

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/visualization/numerical` | ✅ | Config chart numerik (histogram, boxplot) |
| `POST` | `/api/visualization/categorical` | ✅ | Config chart kategorik (bar chart, pie chart) |
| `POST` | `/api/visualization/bivariate` | ✅ | Config chart bivariat (scatter, heatmap, stacked bar, box plot) |
| `POST` | `/api/visualization/time-series` | ✅ | Config time series line chart |

**Query params** contoh `POST /api/visualization/numerical`:
```
?col=Salary&chart_type=histogram
```

**Response** (Highcharts JSON config):
```json
{
  "chart": { "type": "column", "zoomType": "x" },
  "title": { "text": "Distribution of Salary" },
  "xAxis": { "categories": ["0-1000", "1000-2000", ...] },
  "yAxis": { "title": { "text": "Frequency" } },
  "series": [{ "name": "Salary", "data": [12, 45, 67, ...] }]
}
```

---

### Insights

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/insights/univariate` | ✅ | AI insight untuk satu kolom |
| `POST` | `/api/insights/bivariate` | ✅ | AI insight untuk relasi dua kolom |
| `POST` | `/api/insights/text` | ✅ | Generic AI insight dari raw stats |
| `POST` | `/api/insights/recommend-chart` | ✅ | Rekomendasi tipe chart dari AI |

**Request body** `POST /api/insights/univariate`:
```json
{
  "col": "Salary",
  "type": "numerical"
}
```

---

### Reports & Export

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `POST` | `/api/export/report` | ✅ | Text report dengan AI insights |
| `POST` | `/api/reports/generate` | ✅ | Generate PDF atau HTML dengan seksi yang dipilih |
| `GET` | `/api/download/csv` | ✅ | Download dataset sebagai CSV |
| `GET` | `/api/download/xlsx` | ✅ | Download dataset + statistik sebagai XLSX |
| `GET` | `/api/download/pdf` | ✅ | Download report PDF |

**Request body** `POST /api/reports/generate`:
```json
{
  "format": "pdf",
  "sections": ["overview", "statistics", "correlation", "conclusion"]
}
```

---

### History

| Method | Path | Auth | Deskripsi |
|---|---|---|---|
| `GET` | `/api/data/history` | ✅ | 10 upload terakhir untuk user saat ini |
| `POST` | `/api/data/restore` | ✅ | Restore dataset dari history |
| `DELETE` | `/api/data/history` | ✅ | Hapus dataset dari history + backup |

---

## 🔄 Data Flow

### Upload → Analysis Flow

```
1. User drag-and-drop file ke upload dropzone (CSV/XLSX/JSON/TXT)
        │
        ▼
2. Frontend POST multipart ke /api/data/analyze
        │
        ▼
3. Backend _parse_uploaded_bytes():
   ├── CSV  → coba encoding: utf-8-sig → utf-8 → latin-1 → cp1252
   ├── XLSX → openpyxl
   ├── TXT  → coba separator: tab → comma
   └── JSON → array of objects ATAU column-oriented object
        │
        ▼
4. Simpan raw bytes ke user directory
   Pickle DataFrame → active_dataset.pkl
   Buat backup dari file raw lama
        │
        ▼
5. Jalankan _run_eda() pipeline:
   ├── _compute_dataset_meta()      → rows, cols, duplicates, missing cells
   ├── _compute_summary_stats()     → per numeric col: mean, median, std,
   │                                   variance, min, max, q1, q3, skewness,
   │                                   kurtosis, normality flag, outlier count
   ├── _compute_pearson_matrix()    → full Pearson correlation matrix
   └── _compute_cramers_v_matrix()  → Cramér's V association matrix (kategorik)
        │
        ▼
6. Return JSON: { summary_stats, pearson_matrix, cramers_v_matrix,
                  dataset_meta, data_preview }
        │
        ▼
7. Frontend update DatasetContext → UI merender hasil analisis
```

---

### Cleaning Flow

```
1. GET /api/data/analyze → load existing clean/raw data
        │
        ▼
2. User pilih aksi cleaning di UI:
   POST /api/data/clean { action: "impute_mean", columns: ["Age"] }
        │
        ▼
3. Backend:
   a. Load dari data_clean.pkl (fallback → data_raw.pkl)
   b. Terapkan operasi cleaning:
      - drop_duplicates   → df.drop_duplicates()
      - impute_mean       → df[col].fillna(df[col].mean())
      - impute_median     → df[col].fillna(df[col].median())
      - impute_mode       → df[col].fillna(df[col].mode()[0])
      - drop_missing_rows → df.dropna()
      - standardize_text  → strip, lowercase, single spaces
   c. Simpan ke data_clean.pkl DAN active_dataset.pkl
   d. Update metadata (rows/cols baru)
   e. Return changes summary (berapa baris terpengaruh)
```

---

### Visualization Flow

```
1. Frontend fetch numeric_columns / categorical_columns dari /api/current-dataset
        │
        ▼
2. User pilih kolom + tipe chart di UI
        │
        ▼
3. Frontend POST ke visualization endpoint:
   - /api/visualization/numerical?col=X&chart_type=histogram
   - /api/visualization/categorical?col=Y&chart_type=piechart
   - /api/visualization/bivariate?x_col=X&y_col=Y&chart_type=scatter
   - /api/visualization/time-series?date_col=D&value_col=V
        │
        ▼
4. Backend generate Highcharts-compatible JSON config
        │
        ▼
5. Frontend render via <HighchartsChart options={config} />
   (dynamic import dengan singleton module loading pattern)
```

---

### AI Insight Flow

```
1. POST /api/insights/univariate { col: "Salary", type: "numerical" }
        │
        ▼
2. Backend describe_numeric() → hitung statistik
        │
        ▼
3. generate_ai_insight(stats, insight_type):
   ├── GEMINI_API_KEY ada? → call Gemini 1.5 Flash
   │   (system prompt: "Senior Data Analyst, jawab dalam Bahasa Indonesia")
   ├── GROQ_API_KEY ada?   → call Llama 3.1-70b via Groq
   └── Tidak ada?          → rule-based fallback engine:
       ├── _fallback_overview     → dimensi dataset, jumlah kolom
       ├── _fallback_summary      → peringatan missing values
       ├── _fallback_numerical    → skewness, outlier, mean vs median
       ├── _fallback_categorical  → mode dominance, missing %, kategori unik
       ├── _fallback_bivariate    → interpretasi Pearson r / Cramér's V
       └── _fallback_generic      → ringkasan statistik umum
        │
        ▼
4. Return { stats: {...}, insight: "teks interpretasi..." }
```

---

## 🧠 Core Modules Deep Dive

### EDA Pipeline

Fungsi `_run_eda()` di `main.py` adalah orchestrator utama:

```python
# Pseudocode dari _run_eda()
def _run_eda(df: pd.DataFrame) -> dict:
    meta = _compute_dataset_meta(df)
    # → { rows, columns, duplicates, missing_cells, missing_percentage }

    stats = _compute_summary_stats(df)
    # Per kolom numerik:
    # { count, mean, median, std, variance, min, max, q1, q3,
    #   skewness, kurtosis, is_normal (Shapiro-Wilk p > 0.05),
    #   outlier_count (IQR method) }

    pearson = _compute_pearson_matrix(df)
    # Full n×n Pearson correlation matrix untuk semua kolom numerik

    cramers_v = _compute_cramers_v_matrix(df)
    # Full m×m Cramér's V association matrix untuk semua kolom kategorik

    return { meta, stats, pearson, cramers_v }
```

**Implementasi Cramér's V** (manual, tanpa library eksternal):
```
V = sqrt(χ² / (n × min(r-1, c-1)))
```
di mana:
- `χ²` = Chi-square statistic
- `n` = jumlah observasi
- `r` = jumlah baris (unique values kolom 1)
- `c` = jumlah kolom (unique values kolom 2)

---

### AI Insights Architecture

7 kategori **Intelligent Insights** yang dihasilkan oleh `generate_intelligent_insights()`:

| Kategori | Deskripsi |
|---|---|
| `overview` | Ringkasan dimensi dataset (baris, kolom, tipe data) |
| `summary` | Peringatan dan rangkuman missing values per kolom |
| `numerical` | Distribusi, outlier, skewness untuk semua kolom numerik |
| `categorical` | Mode dominance, persentase missing, jumlah kategori unik |
| `bivariate` | Top korelasi Pearson dan asosiasi Cramér's V terkuat |
| `anomaly` | Deteksi anomali dataset (kolom seluruhnya kosong, duplikat ekstrem) |
| `verdict` | Strategic verdict & integrity score keseluruhan dataset |

---

### JSON Safety Pipeline

Semua endpoint melewati `clean_json_payload()` untuk memastikan **100% JSON-safe output**:

```python
def clean_json_payload(obj):
    # Konversi rekursif:
    # np.int64 / np.float64 → int / float (native Python)
    # np.nan / float('inf') → None
    # np.ndarray            → list
    # pd.Timestamp          → str (ISO format)
    # pd.DataFrame          → { columns, index, data }
    # dict                  → rekursi key-value
    # list                  → rekursi setiap elemen
```

Tanpa ini, FastAPI akan melempar `JSONEncodeError` karena NumPy/Pandas types tidak JSON-serializable secara native.

---

### Report Generation

Laporan akademik dihasilkan dalam 4 format:

| Format | Library | Entry Point |
|---|---|---|
| **PDF** | ReportLab | `report_to_pdf_bytes()` |
| **HTML** | Jinja2 | `_generate_html_jinja()` |
| **CSV** | Pandas | `dataframe_to_csv_bytes()` |
| **XLSX** | openpyxl | `dataframe_to_xlsx_bytes()` |

Struktur **laporan journal akademik** (HTML/PDF):

```
ABSTRAK
  └── Ringkasan dataset, metode analisis, temuan utama

PENDAHULUAN
  └── Konteks dataset, tujuan analisis

METODOLOGI
  ├── Formula IQR (outlier detection)
  ├── Kriteria normalitas Shapiro-Wilk
  └── Definisi Pearson r & Cramér's V

HASIL DAN PEMBAHASAN
  ├── Tabel anomali (kolom dengan outlier / missing ekstrem)
  ├── Tabel statistik numerik (mean, std, skewness, kurtosis, dll.)
  ├── Tabel statistik kategorik (mode, frekuensi, missing %)
  └── Narasi insight korelasi (top Pearson / Cramér's V)

KESIMPULAN
  ├── Integrity score dataset (0–100%)
  └── Strategic verdict (rekomendasi tindakan)
```

---

### Per-User Data Storage

Setiap user memiliki direktori isolat di backend:

```
backend/data/users/{user_id}/
├── data_raw.pkl              # DataFrame original (pickle) — hasil upload pertama
├── data_clean.pkl            # DataFrame setelah cleaning interaktif
├── active_dataset.pkl        # Dataset yang sedang aktif (raw atau clean)
├── active_dataset_meta.json  # Metadata: fileName, rows, columns, fileSize, uploadedAt
└── upload_history.json       # Array 10 upload terakhir
```

Format `active_dataset_meta.json`:
```json
{
  "fileName": "sales_data.csv",
  "rows": 5000,
  "columns": 12,
  "fileSize": 245760,
  "uploadedAt": "2025-06-21T08:00:00Z"
}
```

---

## 🎨 Frontend Architecture

### State Management

Tiga layer state management digunakan secara bersamaan:

| Layer | Implementasi | Kegunaan |
|---|---|---|
| **React Context** | `dataset-context.tsx` | Dataset info global (rows, columns, upload state) |
| **Zustand** | `stores/upload/`, `stores/preferences/` | Upload history, sidebar & theme preferences |
| **Server Actions** | `server/server-actions.ts` | Persist sidebar layout preferences ke cookies |
| **Next.js cookies** | `proxy.ts` + `cookie.client.ts` | Auth token (`eda_session_token`), sidebar state |

---

### Visualization Architecture

`HighchartsChart` component menggunakan **dynamic import** + **singleton promise pattern**:

```typescript
// singleton pattern: modul Highcharts hanya di-load sekali
let highchartsPromise: Promise<typeof Highcharts> | null = null;

function loadHighcharts() {
  if (!highchartsPromise) {
    highchartsPromise = import('highcharts').then(async (HC) => {
      await import('highcharts/modules/heatmap');
      await import('highcharts/modules/exporting');
      // ... module lain
      return HC.default;
    });
  }
  return highchartsPromise;
}
```

Ini mencegah double-loading dan **race condition** saat multiple chart dirender bersamaan.

---

### Route Protection

`proxy.ts` (Next.js Middleware) melindungi semua rute `/dashboard/*`:

```typescript
// Middleware logic (pseudocode)
if (pathname.startsWith('/dashboard')) {
  const token = request.cookies.get('eda_session_token');
  if (!token) {
    return NextResponse.redirect('/landing');
  }
}
```

---

## 🔐 Authentication

Menggunakan **JWT (HS256)** dengan **httpOnly cookies**:

- **Cookie name:** `eda_session_token`
- **Expiry:** 7 hari
- **Algorithm:** HS256

Akun yang tersedia (hardcoded untuk demo):

```python
USERS_DB = [
    {"id": "1", "email": "hello@arhamkhnz.com", "password": "admin123", "role": "administrator"},
    {"id": "2", "email": "hello@ammarkhnz.com", "password": "admin123", "role": "admin"},
    {"id": "3", "email": "test@test.com",        "password": "test123",  "role": "user"},
]
```

Semua endpoint protected menggunakan `Depends(require_user_id)` yang:
1. Baca cookie `eda_session_token` dari request
2. Decode & verifikasi JWT dengan `AUTH_SECRET_KEY`
3. Ekstrak `user_id` dari payload
4. Inject `user_id` ke handler function

---

## 🐳 Docker (Backend)

Backend menggunakan Docker untuk deployment ke **Hugging Face Spaces**.

`backend/Dockerfile`:
```dockerfile
FROM python:3.10-slim

# Non-root user (Hugging Face Spaces requirement)
RUN useradd -m -u 1000 user
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user:user . /app
USER user

RUN mkdir -p /app/data/users

# Port 7860 = standar Hugging Face Spaces
EXPOSE 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
```

Build & run lokal dengan Docker:
```bash
cd backend
docker build -t automationeda-backend .
docker run -p 8000:7860 \
  -e AUTH_SECRET_KEY=your-secret \
  -e GEMINI_API_KEY=your-key \
  automationeda-backend
```

---

## 🚢 Deployment

### Frontend → Vercel

1. Push kode ke GitHub
2. Import repository di [vercel.com](https://vercel.com)
3. Set **Root Directory** ke `frontend`
4. Tambahkan Environment Variable:
   ```
   NEXT_PUBLIC_API_URL = https://your-backend.up.railway.app
   ```
5. Deploy otomatis saat push ke `master`

### Backend → Railway

1. Hubungkan repository GitHub Anda di [railway.app](https://railway.app)
2. Tambahkan Service dari repository Anda, lalu di tab **Settings** atur **Root Directory** ke `backend` (Railway secara otomatis akan membaca `Dockerfile` di dalam folder tersebut).
3. Tambahkan **Variables** di dashboard Railway:
   ```
   AUTH_SECRET_KEY = your-production-secret
   GEMINI_API_KEY  = your-gemini-key
   GROQ_API_KEY    = your-groq-key
   ```
4. Generate domain publik di bagian **Settings** service backend Anda di Railway. Domain tersebut digunakan sebagai nilai `NEXT_PUBLIC_API_URL` pada konfigurasi Vercel Anda.


---

## 🛠️ Development Tools

| Tool | Kegunaan |
|---|---|
| **Biome** | Linter & formatter untuk TypeScript/JavaScript (`npm run check`) |
| **Husky** | Git hooks (jalankan Biome check sebelum commit) |
| **lint-staged** | Hanya lint file yang berubah saat commit |
| **Swagger UI** | Dokumentasi API interaktif di `http://localhost:8000/docs` |
| **React Compiler** | Enabled di `next.config.mjs` untuk otomatis optimasi React renders |

### Useful Commands

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build production bundle
npm run check        # Run Biome linter
npm run check:fix    # Auto-fix Biome lint issues
npm run format       # Format code dengan Biome

# Backend
uvicorn main:app --reload          # Dev server dengan hot-reload
uvicorn main:app --host 0.0.0.0    # Server untuk LAN/container
python -m pytest                   # Run unit tests (jika ada)
```

---

## 📄 License

Distributed under the **MIT License**. See [`frontend/LICENSE`](frontend/LICENSE) for more information.

---

<div align="center">

**Built with ❤️ by the AutomationEDA Team**

[![Live Demo](https://img.shields.io/badge/🌐%20Try%20it%20Now-automationeda.vercel.app-6366f1?style=for-the-badge)](https://automationeda.vercel.app)

</div>
