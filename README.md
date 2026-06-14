# AutomationEDA (FastAPI + Next.js)

Aplikasi **EDA otomatis** (Exploratory Data Analysis) yang menerima file dataset (CSV/Excel/JSON/TXT), menghitung ringkasan statistik, matriks korelasi (Pearson) untuk numerik, dan asosiasi (Cramér’s V) untuk kategorik, serta menyediakan visualisasi dan insight.

## Prasyarat
- Python 3.10+ (disarankan)
- Node.js 18+ 

## Cara Menjalankan
### 1) Jalankan Backend (FastAPI)

Masuk folder backend:

```bat
cd backend
```

Buat environment virtual:

```bat
python -m venv .venv
.venv\Scripts\activate
```

Install dependency:

```bat
pip install -r requirements.txt
```

Jalankan server:

```bat
uvicorn main:app --reload
```

Backend akan berjalan di:
- `http://localhost:8000`

Catatan: backend mengizinkan CORS untuk frontend di `http://localhost:3000`.

### 2) Jalankan Frontend (Next.js)

Buka terminal baru, masuk folder frontend:

```bat
cd frontend
```

Install dependency:

```bat
npm install
```

Jalankan dev server:

```bat
npm run dev
```

Frontend akan berjalan di:
- `http://localhost:3000`

## Endpoint Backend (ringkas)
- `GET /` : health check
- `GET /api/current-dataset`
- `POST /api/upload` : upload dataset
- `POST /api/preview` : preview data
- `POST /api/analysis/numeric`
- `POST /api/analysis/categorical`
- `POST /api/insights/univariate`
- `POST /api/insights/bivariate`
- `POST /api/data/analyze` : upload file → parse → simpan → jalankan EDA (mengembalikan `summary_stats`, `pearson_matrix`, `cramers_v_matrix`, dan `data_preview`)

## File Dataset
Dataset disimpan per-user di folder data backend (mis. `backend/data/...`) dalam format pickle (`.pkl`) untuk status sesi/analisis lanjutan.

