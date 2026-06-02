from __future__ import annotations

import io
import math
from typing import Any, Dict

import numpy as np
import pandas as pd
import scipy.stats as scipy_stats
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware


# -----------------------------
# Utilities: sanitization
# -----------------------------

def _is_nan(x: Any) -> bool:
    try:
        return bool(pd.isna(x))
    except Exception:
        return False


def sanitize_value(x: Any) -> Any:
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(x, (np.bool_,)):
        return bool(x)
    if isinstance(x, (pd.Timestamp, pd.Timedelta)):
        return str(x)
    if _is_nan(x):
        return None
    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None
    return x


def sanitize_obj(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {str(k): sanitize_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_obj(v) for v in obj]
    if isinstance(obj, tuple):
        return [sanitize_obj(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return sanitize_obj(obj.tolist())
    if isinstance(obj, pd.DataFrame):
        return {
            "columns": [str(c) for c in obj.columns.tolist()],
            "index": [str(i) for i in obj.index.tolist()],
            "data": [[sanitize_value(v) for v in row] for row in obj.values.tolist()],
        }
    if isinstance(obj, pd.Series):
        return {
            "name": obj.name,
            "index": [str(i) for i in obj.index.tolist()],
            "data": [sanitize_value(v) for v in obj.tolist()],
        }
    return sanitize_value(obj)


def _format_file_size(size_bytes: int) -> str:
    """Format bytes menjadi string yang human-readable."""
    if size_bytes <= 0:
        return "0 B"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.2f} KB"
    return f"{size_bytes / 1024 ** 2:.2f} MB"


def read_dataframe_and_raw(file: UploadFile) -> tuple[pd.DataFrame, bytes]:
    """
    Baca file SEKALI, kembalikan (DataFrame, raw_bytes).
    Ini memperbaiki bug file size = 0 B karena sebelumnya
    file dibaca dua kali secara terpisah.
    """
    filename = (file.filename or "").lower()
    raw = file.file.read()

    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    bio = io.BytesIO(raw)

    if filename.endswith(".csv"):
        try:
            df = pd.read_csv(bio)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    elif filename.endswith(".txt"):
        # TXT: coba tab-separated dulu, fallback ke comma
        try:
            bio.seek(0)
            df = pd.read_csv(bio, sep="\t")
            # Jika hanya 1 kolom, kemungkinan bukan TSV — coba comma
            if df.shape[1] == 1:
                bio.seek(0)
                df = pd.read_csv(bio, sep=",")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse TXT: {e}")

    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            df = pd.read_excel(bio, engine="openpyxl")
        except ValueError:
            try:
                bio.seek(0)
                df = pd.read_excel(bio)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not parse Excel: {e}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse Excel: {e}")

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use .csv, .xlsx, .xls, or .txt",
        )

    return df, raw


# -----------------------------
# Analysis functions
# -----------------------------

def describe_numeric(df: pd.DataFrame) -> Dict[str, Any]:
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    results: Dict[str, Dict[str, Any]] = {}

    for col in num_cols:
        series = df[col].dropna()
        n_total = len(df[col])
        n_valid = len(series)
        n_missing = n_total - n_valid
        pct_missing = (n_missing / n_total * 100) if n_total else 0.0

        mean_val = series.mean()
        median_val = series.median()
        mode_series = series.mode()
        mode_val = mode_series.iloc[0] if not mode_series.empty else np.nan
        std_val = series.std(ddof=1)
        var_val = series.var(ddof=1)
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        skew_val = series.skew()
        kurt_val = series.kurt()

        # Shapiro-Wilk normality test (max 5000 samples)
        is_normal = "Not Normal"
        if len(series) >= 3:
            sample = series.sample(min(len(series), 5000), random_state=42)
            try:
                _, p_sw = scipy_stats.shapiro(sample)
                is_normal = "Normal" if p_sw >= 0.05 else "Not Normal"
            except Exception:
                is_normal = "Not Normal"

        # Outliers via IQR method
        n_outlier = 0
        if len(series) >= 1:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            n_outlier = int(((series < lower) | (series > upper)).sum())

        results[col] = {
            "count": int(n_valid),
            "missing": int(n_missing),
            "missing_%": round(float(pct_missing), 2),
            "mean": round(float(mean_val), 4) if pd.notna(mean_val) else None,
            "median": round(float(median_val), 4) if pd.notna(median_val) else None,
            "mode": round(float(mode_val), 4) if pd.notna(mode_val) else None,
            "std": round(float(std_val), 4) if pd.notna(std_val) else None,
            "variance": round(float(var_val), 4) if pd.notna(var_val) else None,
            "min": round(float(series.min()), 4) if len(series) else None,
            "Q1 (25%)": round(float(q1), 4) if pd.notna(q1) else None,
            "Q3 (75%)": round(float(q3), 4) if pd.notna(q3) else None,
            "max": round(float(series.max()), 4) if len(series) else None,
            "IQR": round(float(iqr), 4) if pd.notna(iqr) else None,
            "skewness": round(float(skew_val), 4) if pd.notna(skew_val) else None,
            "kurtosis": round(float(kurt_val), 4) if pd.notna(kurt_val) else None,
            "distribution": is_normal,
            "n_outliers": int(n_outlier),
        }

    return {"table": sanitize_obj(pd.DataFrame(results).T)}


def describe_categorical(df: pd.DataFrame) -> Dict[str, Any]:
    cat_cols = df.select_dtypes(include=["object", "string"]).columns
    results: Dict[str, Dict[str, Any]] = {}

    for col in cat_cols:
        series = df[col]
        n_total = len(series)
        n_missing = int(series.isna().sum())
        clean = series.dropna()
        n_valid = len(clean)
        n_unique = int(clean.nunique())

        mode_series = clean.mode()
        mode_val = mode_series.iloc[0] if not mode_series.empty else "N/A"
        mode_freq = int((clean == mode_val).sum()) if n_valid else 0
        mode_pct = round((mode_freq / n_valid) * 100, 2) if n_valid > 0 else 0.0
        pct_missing = round((n_missing / n_total) * 100, 2) if n_total else 0.0

        results[col] = {
            "count": int(n_valid),
            "missing": int(n_missing),
            "missing_%": pct_missing,
            "unique": n_unique,
            "mode": sanitize_value(mode_val),
            "mode_freq": mode_freq,
            "mode_%": mode_pct,
        }

    return {"table": sanitize_obj(pd.DataFrame(results).T)}


def build_dataset_preview(df: pd.DataFrame, n_head: int = 10) -> Dict[str, Any]:
    """
    Kembalikan preview dataset: kolom, tipe data, sample baris pertama,
    dan ringkasan missing values per kolom.
    """
    columns_info = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        # Kategorisasi tipe untuk frontend
        if dtype in ("int64", "float64"):
            col_type = "numerical"
        elif dtype in ("object", "string"):
            col_type = "categorical"
        elif "datetime" in dtype:
            col_type = "datetime"
        else:
            col_type = "other"

        n_missing = int(df[col].isna().sum())
        pct_missing = round(n_missing / len(df) * 100, 2) if len(df) else 0.0

        columns_info.append({
            "name": str(col),
            "dtype": dtype,
            "type": col_type,
            "missing": n_missing,
            "missing_%": pct_missing,
        })

    # Sample rows — convert ke list of dict, sanitize semua nilai
    sample_rows = df.head(n_head).copy()
    # Convert datetime ke string agar JSON serializable
    for col in sample_rows.select_dtypes(include=["datetime64[ns]", "datetimetz"]):
        sample_rows[col] = sample_rows[col].astype(str)

    rows_data = [
        {str(k): sanitize_value(v) for k, v in row.items()}
        for row in sample_rows.to_dict(orient="records")
    ]

    return {
        "columns": columns_info,
        "rows": rows_data,
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
    }


# -----------------------------
# FastAPI app
# -----------------------------

app = FastAPI(title="Automation EDA API")

FRONTEND_ORIGIN = "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()

    if not (
        lower.endswith(".csv")
        or lower.endswith(".xlsx")
        or lower.endswith(".xls")
        or lower.endswith(".txt")
    ):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use .csv, .xlsx, .xls, or .txt",
        )

    try:
        # ✅ Fix: baca file SEKALI saja — df dan raw bytes dari sumber yang sama
        df, raw = read_dataframe_and_raw(file)

        return {
            "status": "success",
            "metadata": {
                "fileName": filename,
                "rows": int(len(df)),
                "columns": int(len(df.columns)),
                "fileSize": _format_file_size(len(raw)),  # ✅ Fix: tidak lagi 0 B
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/preview")
async def preview(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Endpoint baru: dataset preview.
    Mengembalikan info kolom (nama, tipe, missing),
    sample 10 baris pertama, dan total rows/columns.
    """
    filename = file.filename or ""
    lower = filename.lower()

    if not (
        lower.endswith(".csv")
        or lower.endswith(".xlsx")
        or lower.endswith(".xls")
        or lower.endswith(".txt")
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df, _ = read_dataframe_and_raw(file)
        preview_data = build_dataset_preview(df, n_head=10)
        return {"status": "success", "result": preview_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/numeric")
async def analysis_numeric(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()

    if not (
        lower.endswith(".csv")
        or lower.endswith(".xlsx")
        or lower.endswith(".xls")
        or lower.endswith(".txt")
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df, _ = read_dataframe_and_raw(file)
        return {"status": "success", "result": sanitize_obj(describe_numeric(df))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/categorical")
async def analysis_categorical(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()

    if not (
        lower.endswith(".csv")
        or lower.endswith(".xlsx")
        or lower.endswith(".xls")
        or lower.endswith(".txt")
    ):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df, _ = read_dataframe_and_raw(file)
        return {"status": "success", "result": sanitize_obj(describe_categorical(df))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")