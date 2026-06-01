from __future__ import annotations

import io
import json
import math
from typing import Any, Dict, List, Optional, Tuple, Union

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
    """Make values JSON-serializable and safe for FastAPI."""
    # numpy scalar -> python scalar
    if isinstance(x, (np.integer,)):
        return int(x)
    if isinstance(x, (np.floating,)):
        v = float(x)
        if math.isnan(v) or math.isinf(v):
            return None
        return v
    if isinstance(x, (np.bool_,)):
        return bool(x)

    # pandas Timestamp / Timedelta
    if isinstance(x, (pd.Timestamp, pd.Timedelta)):
        return str(x)

    # NaN / inf
    if _is_nan(x):
        return None

    if isinstance(x, float) and (math.isnan(x) or math.isinf(x)):
        return None

    return x


def sanitize_obj(obj: Any) -> Any:
    """Recursively sanitize dict/list/scalar/np structures."""
    if isinstance(obj, dict):
        return {str(k): sanitize_obj(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_obj(v) for v in obj]
    if isinstance(obj, tuple):
        return [sanitize_obj(v) for v in obj]

    # numpy arrays
    if isinstance(obj, np.ndarray):
        return sanitize_obj(obj.tolist())

    # pandas objects
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


def read_dataframe_from_upload(file: UploadFile) -> pd.DataFrame:
    filename = (file.filename or "").lower()
    raw = file.file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    bio = io.BytesIO(raw)

    # csv
    if filename.endswith(".csv"):
        try:
            # Let pandas detect encoding; keep engine default.
            bio.seek(0)
            return pd.read_csv(bio)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse CSV: {e}")

    # excel
    if filename.endswith(".xlsx") or filename.endswith(".xls"):
        try:
            bio.seek(0)
            return pd.read_excel(bio, engine="openpyxl")
        except ValueError:
            # Fallback for older xls
            try:
                bio.seek(0)
                return pd.read_excel(bio)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Could not parse Excel: {e}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not parse Excel: {e}")

    raise HTTPException(status_code=400, detail="Unsupported file type. Use .csv or .xlsx/.xls")


# -----------------------------
# Notebook functions re-implemented
# -----------------------------

def describe_numeric(df: pd.DataFrame) -> Dict[str, Any]:
    # Numeric: int64/float64 (match notebook)
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns

    results: Dict[str, Dict[str, Any]] = {}

    for col in num_cols:
        series = df[col].dropna()
        n_total = len(df[col])
        n_valid = len(series)

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

        n_missing = n_total - n_valid
        pct_missing = (n_missing / n_total) * 100 if n_total else 0.0

        # Shapiro-Wilk with limit 5000 samples
        # If series is empty or has < 3 points, shapiro can fail
        sample = series.sample(min(len(series), 5000), random_state=42) if len(series) else series
        is_normal = "Not Normal"
        n_outlier = 0

        if len(sample) >= 3:
            try:
                _, p_sw = scipy_stats.shapiro(sample)
                is_normal = "Normal" if p_sw >= 0.05 else "Not Normal"
            except Exception:
                is_normal = "Not Normal"

        # Outliers via IQR
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

    # Return as structure similar to notebook transpose
    # notebook returns pd.DataFrame(results).T
    # We convert to dict for JSON.
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


def manual_covariance(x: pd.Series, y: pd.Series) -> float:
    x_arr = x.to_numpy(dtype=float)
    y_arr = y.to_numpy(dtype=float)

    n = len(x_arr)
    if n < 2:
        return 0.0

    mean_x = x_arr.mean()
    mean_y = y_arr.mean()

    return float(np.sum((x_arr - mean_x) * (y_arr - mean_y)) / (n - 1))


def manual_pearson(x: pd.Series, y: pd.Series) -> float:
    x_arr = x.to_numpy(dtype=float)
    y_arr = y.to_numpy(dtype=float)

    n = len(x_arr)
    if n < 2:
        return 0.0

    mean_x = x_arr.mean()
    mean_y = y_arr.mean()

    numerator = float(np.sum((x_arr - mean_x) * (y_arr - mean_y)))

    std_x = float((np.sum((x_arr - mean_x) ** 2) / (n - 1)) ** 0.5)
    std_y = float((np.sum((y_arr - mean_y) ** 2) / (n - 1)) ** 0.5)

    if std_x == 0 or std_y == 0:
        return 0.0

    return float(numerator / ((n - 1) * std_x * std_y))


def manual_cramers_v(x: pd.Series, y: pd.Series) -> float:
    table = pd.crosstab(x.fillna("NA"), y.fillna("NA"))
    chi2 = scipy_stats.chi2_contingency(table)[0]
    n = table.values.sum()
    r, k = table.shape

    denom = n * (min(r - 1, k - 1))
    if denom == 0:
        return 0.0

    return float(np.sqrt(chi2 / denom))


def association_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()

    cov_mat = pd.DataFrame(np.zeros((len(num_cols), len(num_cols))), index=num_cols, columns=num_cols)
    pearson_mat = pd.DataFrame(np.zeros((len(num_cols), len(num_cols))), index=num_cols, columns=num_cols)

    for i, c1 in enumerate(num_cols):
        for j, c2 in enumerate(num_cols):
            valid = df[[c1, c2]].dropna()
            cov_mat.iloc[i, j] = round(manual_covariance(valid[c1], valid[c2]), 4) if len(valid) >= 2 else 0.0
            pearson_mat.iloc[i, j] = round(manual_pearson(valid[c1], valid[c2]), 4) if len(valid) >= 2 else 0.0

    cramers_mat = pd.DataFrame(np.eye(len(cat_cols)), index=cat_cols, columns=cat_cols)

    for i, c1 in enumerate(cat_cols):
        for j in range(i + 1, len(cat_cols)):
            v = round(manual_cramers_v(df[c1], df[cat_cols[j]]), 4)
            cramers_mat.iloc[i, j] = v
            cramers_mat.iloc[j, i] = v

    return {
        "covariance": sanitize_obj(cov_mat),
        "pearson": sanitize_obj(pearson_mat),
        "cramers_v": sanitize_obj(cramers_mat),
    }


# -----------------------------
# FastAPI app
# -----------------------------

app = FastAPI(title="Automation EDA API")

# Allow Next.js dev server (default). You can add your real origin if needed.
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

    if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .csv or .xlsx/.xls")

    try:
        df = read_dataframe_from_upload(file)
        rows = int(len(df))
        columns = int(len(df.columns))
        # File size as string in KB/MB
        # UploadFile doesn't give size reliably; read bytes to compute size.
        # We already buffered bytes in read_dataframe_from_upload via file.file.read().
        # So we compute size from that read by re-reading file is not possible.
        # Instead, compute from raw bytes once here.
        # Re-read raw bytes to get exact size.
        raw = file.file.read()
        file_size_bytes = len(raw)
        if file_size_bytes == 0:
            # fallback: unknown
            file_size_str = "0 B"
        else:
            if file_size_bytes < 1024:
                file_size_str = f"{file_size_bytes} B"
            else:
                file_size_str = f"{file_size_bytes/1024:.2f} KB" if file_size_bytes < 1024**2 else f"{file_size_bytes/1024**2:.2f} MB"

        return {
            "status": "success",
            "metadata": {
                "fileName": filename,
                "rows": rows,
                "columns": columns,
                "fileSize": file_size_str,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error while processing upload: {e}")


@app.post("/api/analysis/numeric")
async def analysis_numeric(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()
    if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df = read_dataframe_from_upload(file)
        out = describe_numeric(df)
        return {"status": "success", "result": sanitize_obj(out)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/categorical")
async def analysis_categorical(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()
    if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df = read_dataframe_from_upload(file)
        out = describe_categorical(df)
        return {"status": "success", "result": sanitize_obj(out)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/association")
async def analysis_association(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    lower = filename.lower()
    if not (lower.endswith(".csv") or lower.endswith(".xlsx") or lower.endswith(".xls")):
        raise HTTPException(status_code=400, detail="Unsupported file type")

    try:
        df = read_dataframe_from_upload(file)
        out = association_matrix(df)
        return {"status": "success", "result": sanitize_obj(out)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")

