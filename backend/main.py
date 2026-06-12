from __future__ import annotations

# ── Environment must be loaded FIRST before any other local imports ────────────
import os
from pathlib import Path
from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

# ─────────────────────────────────────────────────────────────────────────────
import io
import json
import math
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from scipy.stats import chi2_contingency

from backend.categorical_analysis import (
    _manual_cramers_v,
    _manual_pearson,
    describe_categorical,
)
from backend.descriptive_stats import describe_numeric
from backend.reports import (
    build_full_report,
    build_interpretation,
    build_stats_bundle,
    dataframe_to_csv_bytes,
    dataframe_to_xlsx_bytes,
    report_to_pdf_bytes,
)
from backend.utils import (
    ACTIVE_DATASET_META_JSON,
    ACTIVE_DATASET_PKL,
    CLEAN_DATASET_PKL,
    CLEAN_DIR,
    RAW_DATASET_PKL,
    RAW_DIR,
    SUPPORTED_UPLOAD_EXTENSIONS,
    _format_file_size,
    _load_active_dataset_df,
    build_dataset_preview,
    cleanup_orphaned_dataset_metadata,
    get_categorical_columns,
    get_numeric_columns,
    is_supported_upload,
    migrate_legacy_clean_dataset,
    persist_metadata,
    read_dataframe_and_raw,
    sanitize_obj,
)
from backend.visualization import (
    generate_bivariate_plot,
    generate_categorical_plot,
    generate_numerical_plot,
)
from cleaning import clean_dataset
from insights import generate_ai_insight, get_chart_recommendation

# ── Persistence paths ─────────────────────────────────────────────────────────
# Raw uploads & engine pickle → backend/data/raw/
# Cleaned working dataset   → backend/data/clean/
_ENGINE_PKL = RAW_DATASET_PKL
_CLEAN_PKL = CLEAN_DATASET_PKL

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Automation EDA API")

FRONTEND_ORIGIN = "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _on_startup() -> None:
    migrate_legacy_clean_dataset()
    cleanup_orphaned_dataset_metadata()


# ─── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
async def health_check() -> Dict[str, Any]:
    cleanup_orphaned_dataset_metadata()
    return {
        "status": "ok",
        "service": "Automation EDA API",
        "dataset_active": ACTIVE_DATASET_PKL.exists(),
        "engine_pkl_exists": _ENGINE_PKL.exists(),
        "clean_pkl_exists": _CLEAN_PKL.exists(),
        "data_dirs": {
            "raw": str(RAW_DIR),
            "clean": str(CLEAN_DIR),
        },
        "supported_uploads": list(SUPPORTED_UPLOAD_EXTENSIONS),
    }


# ─── Internal helpers ──────────────────────────────────────────────────────────

def _latest_uploaded_file_path() -> Path | None:
    if not RAW_DIR.exists():
        return None
    candidates = [
        p for p in RAW_DIR.iterdir()
        if p.is_file() and p.suffix.lower() in {".csv", ".txt", ".xlsx", ".xls"}
    ]
    if not candidates:
        return None
    candidates.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    return candidates[0]


def _extract_column_stats(df: pd.DataFrame, col: str, col_type: str) -> Dict[str, Any]:
    col_type = col_type.lower().strip()
    if col_type == "numerical":
        result = describe_numeric(df)
    elif col_type == "categorical":
        result = describe_categorical(df)
    else:
        raise ValueError("Parameter 'type' harus 'numerical' atau 'categorical'.")
    table = result["table"]
    if col not in table["index"]:
        raise ValueError(f"Kolom '{col}' tidak ditemukan atau bukan tipe {col_type}.")
    row_idx = table["index"].index(col)
    return dict(zip(table["columns"], table["data"][row_idx]))


def _correlation_strength_label(value: float) -> str:
    abs_val = abs(value)
    if abs_val >= 0.7:
        return "kuat"
    if abs_val >= 0.4:
        return "sedang"
    if abs_val >= 0.2:
        return "lemah"
    return "sangat lemah"


def _build_bivariate_summary(df: pd.DataFrame, x_col: str, y_col: str) -> Dict[str, Any]:
    if x_col not in df.columns:
        raise ValueError(f"Kolom '{x_col}' tidak ditemukan dalam dataset.")
    if y_col not in df.columns:
        raise ValueError(f"Kolom '{y_col}' tidak ditemukan dalam dataset.")
    pair = df[[x_col, y_col]].dropna()
    n_pairs = len(pair)
    x_num = pd.api.types.is_numeric_dtype(df[x_col])
    y_num = pd.api.types.is_numeric_dtype(df[y_col])
    summary: Dict[str, Any] = {
        "x_column": x_col,
        "y_column": y_col,
        "n_valid_pairs": n_pairs,
        "x_dtype": "numerical" if x_num else "categorical",
        "y_dtype": "numerical" if y_num else "categorical",
    }
    if n_pairs == 0:
        summary["measure"] = "no_data"
        return summary
    if x_num and y_num:
        valid = pair.copy()
        valid[x_col] = pd.to_numeric(valid[x_col], errors="coerce")
        valid[y_col] = pd.to_numeric(valid[y_col], errors="coerce")
        valid = valid.dropna()
        r = _manual_pearson(valid[x_col], valid[y_col])
        summary["measure"] = "pearson_correlation"
        summary["pearson_r"] = round(float(r), 4)
        summary["strength_label"] = _correlation_strength_label(r)
        summary["direction"] = "positif" if r > 0 else ("negatif" if r < 0 else "netral")
        summary["n_valid_pairs"] = len(valid)
        summary["x_mean"] = round(float(valid[x_col].mean()), 4)
        summary["y_mean"] = round(float(valid[y_col].mean()), 4)
    elif not x_num and not y_num:
        v = _manual_cramers_v(pair[x_col], pair[y_col])
        summary["measure"] = "cramers_v"
        summary["cramers_v"] = round(float(v), 4)
        summary["strength_label"] = _correlation_strength_label(v)
        top_combos = pair.groupby([x_col, y_col]).size().sort_values(ascending=False).head(3)
        summary["top_combinations"] = [
            {"x": str(idx[0]), "y": str(idx[1]), "count": int(cnt)}
            for idx, cnt in top_combos.items()
        ]
    else:
        num_col = x_col if x_num else y_col
        cat_col = y_col if x_num else x_col
        grouped = pair.copy()
        grouped[num_col] = pd.to_numeric(grouped[num_col], errors="coerce")
        grouped = grouped.dropna(subset=[num_col])
        stats_df = grouped.groupby(cat_col)[num_col].agg(["mean", "count", "std"])
        summary["measure"] = "numeric_by_category"
        summary["numeric_column"] = num_col
        summary["categorical_column"] = cat_col
        summary["group_stats"] = {
            "mean": {str(k): round(float(v), 4) for k, v in stats_df["mean"].items()},
            "count": {str(k): int(v) for k, v in stats_df["count"].items()},
            "std": {
                str(k): round(float(v), 4) if pd.notna(v) else None
                for k, v in stats_df["std"].items()
            },
        }
    return summary


def _resolve_dataframe(file: Optional[UploadFile]) -> pd.DataFrame:
    if file is not None and file.filename:
        filename = file.filename
        if not is_supported_upload(filename):
            supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type. Use {supported}",
            )
        df, raw = read_dataframe_and_raw(file)
        safe_name = os.path.basename(filename)
        save_path = RAW_DIR / safe_name
        with save_path.open("wb") as f:
            f.write(raw)
        df.to_pickle(ACTIVE_DATASET_PKL)
        persist_metadata(
            file_name=safe_name,
            df=df,
            raw_size_bytes=len(raw),
            original_filename=filename,
        )
        return df
    return _load_active_dataset_df()


# ─── Existing endpoints (fully preserved) ─────────────────────────────────────

@app.get("/api/current-dataset")
async def current_dataset() -> Dict[str, Any]:
    empty_payload: Dict[str, Any] = {
        "status": "success",
        "activated": False,
        "dataset": None,
        "preview": None,
        "numeric_columns": [],
        "categorical_columns": [],
    }
    cleanup_orphaned_dataset_metadata()
    if not ACTIVE_DATASET_PKL.exists() or not ACTIVE_DATASET_META_JSON.exists():
        return empty_payload
    try:
        df = pd.read_pickle(ACTIVE_DATASET_PKL)
        with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
            meta = json.load(f)
        preview_data = build_dataset_preview(df, n_head=10)
        return {
            "status": "success",
            "activated": True,
            "dataset": {
                "fileName": meta.get("fileName", ""),
                "originalFilename": meta.get("originalFilename", ""),
                "rows": meta.get("rows", int(len(df))),
                "columns": meta.get("columns", int(len(df.columns))),
                "fileSize": meta.get("fileSize", ""),
                "uploadedAt": meta.get("uploadedAt", ""),
            },
            "preview": preview_data,
            "numeric_columns": get_numeric_columns(df),
            "categorical_columns": get_categorical_columns(df),
        }
    except Exception as e:
        return {**empty_payload, "_error": str(e)}


@app.post("/api/reset")
async def reset_dataset() -> Dict[str, Any]:
    deleted: list[str] = []
    if ACTIVE_DATASET_PKL.exists():
        ACTIVE_DATASET_PKL.unlink()
        deleted.append(ACTIVE_DATASET_PKL.name)
    if ACTIVE_DATASET_META_JSON.exists():
        ACTIVE_DATASET_META_JSON.unlink()
        deleted.append(ACTIVE_DATASET_META_JSON.name)
    if _ENGINE_PKL.exists():
        _ENGINE_PKL.unlink()
        deleted.append(_ENGINE_PKL.name)
    if _CLEAN_PKL.exists():
        _CLEAN_PKL.unlink()
        deleted.append(_CLEAN_PKL.name)
    if deleted:
        return {
            "status": "success",
            "message": f"Dataset berhasil direset. File yang dihapus: {', '.join(deleted)}",
            "deleted": deleted,
        }
    return {
        "status": "info",
        "message": "Tidak ada data aktif yang perlu direset. Server sudah dalam keadaan bersih.",
        "deleted": [],
    }


@app.post("/api/upload")
async def upload(file: UploadFile = File(...)) -> Dict[str, Any]:
    filename = file.filename or ""
    if not filename.strip():
        raise HTTPException(status_code=400, detail="No file name provided.")
    if not is_supported_upload(filename):
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use {supported}")
    try:
        df, raw = read_dataframe_and_raw(file)
        safe_name = os.path.basename(filename)

        # ── 1. Save the original uploaded file to backend/data/raw/<filename> ──
        RAW_DIR.mkdir(parents=True, exist_ok=True)
        save_path = RAW_DIR / safe_name
        with save_path.open("wb") as f:
            f.write(raw)

        # ── 2. Persist raw dataframe as data_raw.pkl inside backend/data/raw/ ──
        df.to_pickle(_ENGINE_PKL)

        # ── Remove stale cleaned dataset so the app reflects the new upload ──
        if _CLEAN_PKL.exists():
            _CLEAN_PKL.unlink()

        # ── 3. Persist raw dataframe as active_dataset.pkl as well ───────────
        df.to_pickle(ACTIVE_DATASET_PKL)
        persist_metadata(
            file_name=safe_name,
            df=df,
            raw_size_bytes=len(raw),
            original_filename=file.filename,
        )
        return {
            "status": "success",
            "metadata": {
                "fileName": safe_name,
                "rows": int(len(df)),
                "columns": int(len(df.columns)),
                "fileSize": _format_file_size(len(raw)),
                "savedTo": str(save_path),
            },
            "cleaning": {
                "original_rows": int(len(df)),
                "cleaned_rows": int(len(df)),
                "duplicates_removed": 0,
                "rows_deleted_missing_data": 0,
                "columns_standardized": [str(c) for c in df.columns],
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


class CleanActionRequest(BaseModel):
    action: str  # "drop_duplicates" | "impute_mean" | "impute_median" | "impute_mode" | "drop_missing_rows" | "standardize_text"


@app.post("/api/data/clean")
async def api_data_clean(req: CleanActionRequest) -> Dict[str, Any]:
    """
    Interactive data cleaning endpoint.
    Reads from data/clean/data_clean.pkl if it exists, otherwise data/raw/data_raw.pkl.
    After cleaning, saves result to data/clean/data_clean.pkl and returns updated dataset_meta.
    """
    try:
        # ── 1. Load the current working dataset ──────────────────────────────
        if _CLEAN_PKL.exists():
            df = pd.read_pickle(_CLEAN_PKL)
        elif _ENGINE_PKL.exists():
            df = pd.read_pickle(_ENGINE_PKL)
        else:
            raise HTTPException(status_code=404, detail="No dataset found. Upload data first.")

        original_rows = int(len(df))
        original_missing = int(df.isna().sum().sum())
        original_duplicated = int(df.duplicated().sum())

        # ── 2. Apply the requested cleaning action ───────────────────────────
        action = req.action.strip()

        if action == "drop_duplicates":
            df = df.drop_duplicates()

        elif action == "impute_mean":
            numeric_cols = df.select_dtypes(include=["number"]).columns
            if len(numeric_cols) > 0:
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

        elif action == "impute_median":
            numeric_cols = df.select_dtypes(include=["number"]).columns
            if len(numeric_cols) > 0:
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())

        elif action == "drop_missing_rows":
            df = df.dropna()

        elif action == "impute_mode":
            for col in df.columns:
                mode_vals = df[col].mode()
                if len(mode_vals) > 0:
                    df[col] = df[col].fillna(mode_vals.iloc[0])

        elif action == "standardize_text":
            text_cols = df.select_dtypes(include=["object", "string"]).columns
            for col in text_cols:
                df[col] = df[col].astype(str).str.strip().str.lower()
                # Replace literal 'nan' strings back to actual NaN
                df[col] = df[col].replace("nan", pd.NA)
                # Also replace 'none' and empty strings back to NaN
                df[col] = df[col].replace({"none": pd.NA, "": pd.NA})

        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: '{action}'. "
                                "Valid actions: drop_duplicates, impute_mean, impute_median, "
                                "impute_mode, drop_missing_rows, standardize_text")

        # ── 3. Persist cleaned dataset ──────────────────────────────────────
        df.to_pickle(_CLEAN_PKL)
        df.to_pickle(ACTIVE_DATASET_PKL)

        # ── 3.5. Sync metadata JSON with new rows/columns counts ────────────
        existing_meta: dict[str, Any] = {}
        if ACTIVE_DATASET_META_JSON.exists():
            try:
                with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
                    existing_meta = json.load(f) or {}
            except Exception:
                existing_meta = {}

        file_name = existing_meta.get("fileName", "dataset.pkl")
        original_filename = existing_meta.get("originalFilename", file_name)
        file_size = existing_meta.get("fileSize", "0 B")
        uploaded_at = existing_meta.get("uploadedAt", "")

        payload = {
            "fileName": file_name,
            "originalFilename": original_filename,
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "fileSize": file_size,
            "uploadedAt": uploaded_at,
        }
        with ACTIVE_DATASET_META_JSON.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        # ── 4. Recalculate health metrics ───────────────────────────────────
        dataset_meta = _compute_dataset_meta(df)

        return {
            "status": "success",
            "action": action,
            "dataset_meta": dataset_meta,
            "changes": {
                "rows_before": original_rows,
                "rows_after": int(len(df)),
                "rows_removed": original_rows - int(len(df)),
                "missing_before": original_missing,
                "missing_after": int(df.isna().sum().sum()),
                "duplicated_before": original_duplicated,
                "duplicated_after": int(df.duplicated().sum()),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


# ── Cleaning Summary & Execute Endpoints ───────────────────────────────────

class ExecuteCleaningRequest(BaseModel):
    action: str  # "drop_duplicates" | "impute_missing" | "reset_raw"


@app.get("/api/data/cleaning-summary")
async def api_cleaning_summary() -> Dict[str, Any]:
    """
    Return cleaning diagnostics: total rows, columns, duplicated rows,
    and per-column missing value counts with data types.
    """
    try:
        if _CLEAN_PKL.exists():
            df = pd.read_pickle(_CLEAN_PKL)
        elif _ENGINE_PKL.exists():
            df = pd.read_pickle(_ENGINE_PKL)
        else:
            return {"status": "no_data"}

        missing_per_col: List[Dict[str, Any]] = []
        for col in df.columns:
            mc = int(df[col].isna().sum())
            missing_per_col.append({
                "column": str(col),
                "type": str(df[col].dtype),
                "missing_count": mc,
            })

        return {
            "status": "success",
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "total_duplicated_rows": int(df.duplicated().sum()),
            "total_missing_cells": int(df.isna().sum().sum()),
            "columns_detail": missing_per_col,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


@app.post("/api/data/execute-cleaning")
async def api_execute_cleaning(req: ExecuteCleaningRequest) -> Dict[str, Any]:
    """
    Execute a cleaning action and persist result to data/clean/data_clean.pkl.
    Actions: drop_duplicates, impute_missing, reset_raw.
    """
    try:
        action = req.action.strip()

        # ── reset_raw: copy raw → clean ────────────────────────────────────
        if action == "reset_raw":
            if _ENGINE_PKL.exists():
                import shutil
                shutil.copy2(_ENGINE_PKL, _CLEAN_PKL)
                df = pd.read_pickle(_CLEAN_PKL)
            elif _CLEAN_PKL.exists():
                df = pd.read_pickle(_CLEAN_PKL)
            else:
                raise HTTPException(status_code=404, detail="No dataset found.")

            return {
                "status": "success",
                "message": "Dataset reset to raw data.",
                "total_rows": int(len(df)),
                "total_columns": int(len(df.columns)),
                "total_duplicated_rows": int(df.duplicated().sum()),
                "total_missing_cells": int(df.isna().sum().sum()),
            }

        # ── Load working dataframe ─────────────────────────────────────────
        if _CLEAN_PKL.exists():
            df = pd.read_pickle(_CLEAN_PKL)
        elif _ENGINE_PKL.exists():
            df = pd.read_pickle(_ENGINE_PKL)
        else:
            raise HTTPException(status_code=404, detail="No dataset found.")

        msg = ""

        if action == "drop_duplicates":
            before = int(len(df))
            df = df.drop_duplicates()
            removed = before - int(len(df))
            msg = f"Removed {removed} duplicate row(s). {int(len(df))} rows remaining."

        elif action == "impute_missing":
            before_missing = int(df.isna().sum().sum())
            # Numerical → median
            num_cols = df.select_dtypes(include=["number"]).columns
            if len(num_cols) > 0:
                df[num_cols] = df[num_cols].fillna(df[num_cols].median())
            # Categorical/object → "Unknown"
            cat_cols = df.select_dtypes(include=["object", "string", "category"]).columns
            for col in cat_cols:
                df[col] = df[col].fillna("Unknown")
            after_missing = int(df.isna().sum().sum())
            msg = f"Imputed {before_missing - after_missing} missing cell(s). Remaining: {after_missing}."

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown action: '{action}'. Valid: drop_duplicates, impute_missing, reset_raw",
            )

        # ── Persist ──────────────────────────────────────────────────────
        df.to_pickle(_CLEAN_PKL)

        return {
            "status": "success",
            "message": msg,
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "total_duplicated_rows": int(df.duplicated().sum()),
            "total_missing_cells": int(df.isna().sum().sum()),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


@app.post("/api/preview")
async def api_preview(file: Optional[UploadFile] = File(None)) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        preview_data = build_dataset_preview(df, n_head=10)
        return {"status": "success", "result": preview_data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/numeric")
async def analysis_numeric(file: Optional[UploadFile] = File(None)) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        return {"status": "success", "result": sanitize_obj(describe_numeric(df))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/categorical")
async def analysis_categorical(file: Optional[UploadFile] = File(None)) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        return {"status": "success", "result": sanitize_obj(describe_categorical(df))}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


# ── Statistical Visualization Endpoints (Intro Stat Ch.2-3) ─────────────────

class ChartRenderRequest(BaseModel):
    var_x: str
    var_y: Optional[str] = None
    chart_type: str


def _classify_column_type(df: pd.DataFrame, col: str) -> str:
    """Classify a column as categorical, discrete_numeric, or continuous_numeric."""
    if df[col].dtype in ["object", "string", "category", "bool"]:
        return "categorical"
    if pd.api.types.is_numeric_dtype(df[col]):
        nunique = int(df[col].dropna().nunique())
        return "discrete_numeric" if nunique <= 10 else "continuous_numeric"
    return "categorical"


def safe_parse_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except Exception:
        return {}


def make_json_safe(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_safe(x) for x in obj]
    elif isinstance(obj, tuple):
        return tuple(make_json_safe(x) for x in obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return make_json_safe(obj.tolist())
    elif isinstance(obj, pd.Series):
        return make_json_safe(obj.tolist())
    elif pd.isna(obj):
        return None
    elif isinstance(obj, (float, int)):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj


@app.get("/api/data/ai-schema")
async def api_data_ai_schema() -> Dict[str, Any]:
    """
    Load active dataset, perform statistical classification on all columns,
    and query the configured AI engine (Gemini/Groq) to double-check column classification
    and return an explanation badge for each data type.
    """
    try:
        if _CLEAN_PKL.exists():
            df = pd.read_pickle(_CLEAN_PKL)
        elif _ENGINE_PKL.exists():
            df = pd.read_pickle(_ENGINE_PKL)
        else:
            return {"status": "no_data"}

        # 1. Compute rule-based classification baseline
        rule_baseline = {}
        for col in df.columns:
            nunique = int(df[col].dropna().nunique())
            if pd.api.types.is_numeric_dtype(df[col]):
                if nunique <= 10:
                    ctype = "Discrete Numeric"
                    recommended = ["Bar Chart", "Grouped Comparison"]
                    reason = f"Numerical variable with {nunique} unique values (<= 10) acting as discrete categories."
                else:
                    ctype = "Continuous Numeric"
                    recommended = ["Histogram", "Boxplot", "Scatter Plot", "Grouped Comparison"]
                    reason = f"Numerical variable with {nunique} unique values (> 10) representing a continuous scale."
            else:
                ctype = "Categorical (Qualitative)"
                recommended = ["Bar Chart", "Grouped Comparison"]
                reason = f"Qualitative variable with {nunique} categories."
            
            rule_baseline[col] = {
                "type": ctype,
                "recommended_charts": recommended,
                "reason": reason
            }

        # 2. Extract metadata for AI prompt
        columns_info = {}
        for col in df.columns:
            nunique = int(df[col].dropna().nunique())
            dtype_str = str(df[col].dtype)
            sample_vals = df[col].dropna().head(3).tolist()
            columns_info[col] = {
                "dtype": dtype_str,
                "unique_count": nunique,
                "sample_values": sample_vals
            }

        sample_dict = df.head(3).to_dict(orient="records")

        # 3. Formulate Prompt
        system_instruction = (
            "You are a Senior Statistician and Data Science Consultant. Your task is to analyze the schema of a dataset, "
            "classify each column under strict Intro Statistics Chapters 2 & 3 rules, recommend appropriate chart types, "
            "and provide a clear explanation for the classification.\n\n"
            "Rules for Classification:\n"
            "- 'Categorical (Qualitative)': strings, objects, categories, booleans, or textual columns.\n"
            "- 'Discrete Numeric': numeric columns with 10 or fewer unique values.\n"
            "- 'Continuous Numeric': numeric columns with more than 10 unique values.\n\n"
            "Rules for Recommended Charts (choose from: ['Bar Chart', 'Histogram', 'Boxplot', 'Scatter Plot', 'Grouped Comparison']):\n"
            "- Histogram, Boxplot: Recommended for Continuous Numeric data.\n"
            "- Bar Chart: Recommended for Categorical (Qualitative) or Discrete Numeric data.\n"
            "- Scatter Plot: Recommended for pairs of Continuous Numeric data.\n"
            "- Grouped Comparison: Recommended when analyzing a numeric column grouped by a categorical column.\n\n"
            "Return a strict JSON response in the following format:\n"
            "{\n"
            "  \"columns\": {\n"
            "    \"column_name\": {\n"
            "      \"type\": \"Continuous Numeric\" | \"Discrete Numeric\" | \"Categorical (Qualitative)\",\n"
            "      \"recommended_charts\": [\"Histogram\", \"Boxplot\"],\n"
            "      \"reason\": \"A concise 1-sentence statistical explanation explaining why this type and chart recommendation applies.\"\n"
            "    }\n"
            "  }\n"
            "}"
        )

        prompt_payload = {
            "columns_schema": columns_info,
            "3_row_sample": sample_dict,
            "rule_based_baseline": rule_baseline
        }

        prompt_content = (
            f"Here is the dataset metadata, 3-row sample, and a rule-based statistical baseline:\n"
            f"{json.dumps(prompt_payload, indent=2)}\n\n"
            f"Please review each column. Double check the classification and recommended charts. "
            f"Provide a clear, concise 1-sentence reason (in English) that serves as an explanation badge for the user. "
            f"Respond with a single JSON object matching the requested schema. Do not output markdown blocks or extra text."
        )

        # 4. Invoke AI Engine (Gemini / Groq)
        ai_result = None
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        groq_key = os.getenv("GROQ_API_KEY", "").strip()

        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel(
                    "gemini-1.5-flash",
                    system_instruction=system_instruction
                )
                response = model.generate_content(
                    prompt_content,
                    generation_config={"response_mime_type": "application/json"}
                )
                ai_result = safe_parse_json(response.text)
            except Exception as e:
                print(f"Gemini schema generation failed: {e}")

        if not ai_result and groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                response = client.chat.completions.create(
                    model="llama-3.1-70b-versatile",
                    messages=[
                        {"role": "system", "content": system_instruction},
                        {"role": "user", "content": prompt_content}
                    ],
                    response_format={"type": "json_object"}
                )
                ai_result = safe_parse_json(response.choices[0].message.content)
            except Exception as e:
                print(f"Groq schema generation failed: {e}")

        # 5. Merge AI findings with the deterministic rule baseline to ensure safety
        final_columns = {}
        for col in df.columns:
            baseline = rule_baseline[col]
            ai_col_data = None
            if ai_result and "columns" in ai_result and col in ai_result["columns"]:
                ai_col_data = ai_result["columns"][col]
            
            if ai_col_data:
                ctype = ai_col_data.get("type")
                if ctype not in ["Categorical (Qualitative)", "Discrete Numeric", "Continuous Numeric"]:
                    ctype = baseline["type"]
                
                recommended = ai_col_data.get("recommended_charts")
                if not isinstance(recommended, list) or not recommended:
                    recommended = baseline["recommended_charts"]
                
                reason = ai_col_data.get("reason")
                if not reason or not isinstance(reason, str):
                    reason = baseline["reason"]
                
                final_columns[col] = {
                    "type": ctype,
                    "recommended_charts": recommended,
                    "reason": reason
                }
            else:
                final_columns[col] = baseline

        return {
            "status": "success",
            "columns": final_columns
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error in ai-schema: {e}")


@app.post("/api/data/chart-render")
async def api_data_chart_render(req: ChartRenderRequest) -> Dict[str, Any]:
    """
    Generate chart data based on statistical variable classification.
    Returns JSON chart_data consumable by the frontend.
    """
    try:
        if _CLEAN_PKL.exists():
            df = pd.read_pickle(_CLEAN_PKL)
        elif _ENGINE_PKL.exists():
            df = pd.read_pickle(_ENGINE_PKL)
        else:
            raise HTTPException(status_code=404, detail="No dataset found.")

        var_x = req.var_x.strip()
        var_y = (req.var_y or "").strip() or None
        chart_type = req.chart_type.strip()

        if var_x not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{var_x}' not found.")
        if var_y and var_y not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{var_y}' not found.")

        # Compute exact data structure based on the chart type
        chart_payload = {
            "status": "success",
            "type": chart_type,
            "var_x": var_x,
            "var_y": var_y,
        }

        if chart_type == "Histogram":
            clean = df[var_x].dropna()
            if len(clean) == 0:
                chart_payload["chart_data"] = {"categories": [], "values": []}
            else:
                counts, bin_edges = np.histogram(clean, bins=10)
                bin_labels = [
                    f"{bin_edges[i]:.2f} - {bin_edges[i + 1]:.2f}"
                    for i in range(len(bin_edges) - 1)
                ]
                chart_payload["chart_data"] = {
                    "categories": bin_labels,
                    "values": [int(c) for c in counts.tolist()]
                }

        elif chart_type == "Boxplot":
            clean = df[var_x].dropna()
            if len(clean) == 0:
                chart_payload["box_data"] = {
                    "min": 0, "q1": 0, "median": 0, "q3": 0, "max": 0,
                    "lower_whisker": 0, "upper_whisker": 0, "outliers": []
                }
            else:
                q1 = float(np.percentile(clean, 25))
                median = float(np.percentile(clean, 50))
                q3 = float(np.percentile(clean, 75))
                iqr = q3 - q1
                w_lo = max(float(clean.min()), q1 - 1.5 * iqr)
                w_hi = min(float(clean.max()), q3 + 1.5 * iqr)
                outliers = clean[(clean < w_lo) | (clean > w_hi)]
                chart_payload["box_data"] = {
                    "min": float(clean.min()),
                    "q1": q1,
                    "median": median,
                    "q3": q3,
                    "max": float(clean.max()),
                    "lower_whisker": w_lo,
                    "upper_whisker": w_hi,
                    "outliers": [float(v) for v in outliers.tolist()]
                }

        elif chart_type == "Bar Chart":
            counts = df[var_x].value_counts().head(10)
            chart_payload["chart_data"] = {
                "categories": [str(c) for c in counts.index.tolist()],
                "values": [int(v) for v in counts.values.tolist()]
            }

        elif chart_type == "Scatter Plot":
            if not var_y:
                raise HTTPException(status_code=400, detail="Scatter Plot requires Variable Y.")
            pair = df[[var_x, var_y]].dropna()
            points = []
            for x, y in zip(pair[var_x], pair[var_y]):
                val_x = float(x) if isinstance(x, (int, float, np.number)) else x
                val_y = float(y) if isinstance(y, (int, float, np.number)) else y
                points.append([val_x, val_y])
            chart_payload["chart_data"] = {
                "points": points
            }

        elif chart_type == "Grouped Comparison":
            if not var_y:
                raise HTTPException(status_code=400, detail="Grouped Comparison requires Variable Y.")
            
            type_x = _classify_column_type(df, var_x)
            type_y = _classify_column_type(df, var_y)
            
            cat_col, num_col = None, None
            if type_x in ("categorical", "discrete_numeric") and type_y == "continuous_numeric":
                cat_col, num_col = var_x, var_y
            elif type_y in ("categorical", "discrete_numeric") and type_x == "continuous_numeric":
                cat_col, num_col = var_y, var_x
            else:
                is_x_num = pd.api.types.is_numeric_dtype(df[var_x])
                is_y_num = pd.api.types.is_numeric_dtype(df[var_y])
                if not is_x_num and is_y_num:
                    cat_col, num_col = var_x, var_y
                elif not is_y_num and is_x_num:
                    cat_col, num_col = var_y, var_x
                else:
                    cat_col, num_col = var_x, var_y

            pair = df[[cat_col, num_col]].dropna()
            grouped = pair.groupby(cat_col, observed=True)[num_col].mean().sort_values(ascending=False)
            
            chart_payload["chart_data"] = {
                "categories": [str(c) for c in grouped.index.tolist()],
                "values": [float(v) if pd.notna(v) else None for v in grouped.values.tolist()],
                "cat_col": cat_col,
                "num_col": num_col
            }
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported chart type: {chart_type}")

        # Ensure CRITICAL JSON SAFETY: Cast all numpy structures and Pandas NaNs
        return make_json_safe(chart_payload)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error in chart-render: {e}")


@app.post("/api/visualization/numerical")
async def visualization_numerical(
    col: str = Form(...),
    chart_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        options = generate_numerical_plot(df, col, chart_type)
        return {
            "status": "success",
            "chart_type": chart_type,
            "column": col,
            "options": sanitize_obj(options),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/visualization/categorical")
async def visualization_categorical(
    col: str = Form(...),
    chart_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        options = generate_categorical_plot(df, col, chart_type)
        return {
            "status": "success",
            "chart_type": chart_type,
            "column": col,
            "options": sanitize_obj(options),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/visualization/bivariate")
async def visualization_bivariate(
    x_col: str = Form(...),
    y_col: str = Form(...),
    chart_type: str = Form(...),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        options = generate_bivariate_plot(df, x_col, y_col, chart_type)
        return {
            "status": "success",
            "chart_type": chart_type,
            "x_col": x_col,
            "y_col": y_col,
            "options": sanitize_obj(options),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/insights/univariate")
async def insights_univariate(
    col: str = Form(...),
    type: str = Form(...),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        col_type = type.lower().strip()
        stats = _extract_column_stats(df, col, col_type)
        stats["column"] = col
        context = f"univariate_{col_type}"
        insight = generate_ai_insight(stats, context)
        return {
            "status": "success",
            "column": col,
            "type": col_type,
            "stats": sanitize_obj(stats),
            "insight": insight,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/insights/bivariate")
async def insights_bivariate(
    x_col: str = Form(...),
    y_col: str = Form(...),
    file: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file)
        summary = _build_bivariate_summary(df, x_col, y_col)
        insight = generate_ai_insight(summary, "bivariate")
        return {
            "status": "success",
            "x_col": x_col,
            "y_col": y_col,
            "stats": sanitize_obj(summary),
            "insight": insight,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


class TextInsightRequest(BaseModel):
    stats_summary: Dict[str, Any]
    context_type: str


class ChartRecommendationRequest(BaseModel):
    column_name: str


@app.post("/api/insights/text")
async def get_text_insight(payload: TextInsightRequest) -> Dict[str, Any]:
    try:
        insight = generate_ai_insight(payload.stats_summary, payload.context_type)
        return {"status": "success", "insight": insight}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/export/report")
async def export_report() -> Dict[str, Any]:
    try:
        df = _load_active_dataset_df()
        dataset_meta = {}
        if ACTIVE_DATASET_META_JSON.exists():
            try:
                with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
                    dataset_meta = json.load(f) or {}
            except Exception:
                dataset_meta = {}
        meta_lines = []
        if dataset_meta:
            file_name = dataset_meta.get("fileName") or dataset_meta.get("file_name")
            original_filename = dataset_meta.get("originalFilename") or dataset_meta.get("original_filename")
            if file_name:
                meta_lines.append(f"File: {file_name}")
            if original_filename:
                meta_lines.append(f"Original: {original_filename}")
            rows = dataset_meta.get("rows")
            cols = dataset_meta.get("columns")
            if rows is not None:
                meta_lines.append(f"Rows: {rows}")
            if cols is not None:
                meta_lines.append(f"Columns: {cols}")
        numeric_cols = get_numeric_columns(df)
        categorical_cols = get_categorical_columns(df)
        insights_blocks = []
        from backend.descriptive_stats import describe_numeric as _describe_numeric
        from backend.categorical_analysis import describe_categorical as _describe_categorical
        if numeric_cols:
            num_inspect = numeric_cols[:3]
            num_summary = _describe_numeric(df)
            table = num_summary.get("table") if isinstance(num_summary, dict) else None
            for col in num_inspect:
                try:
                    if table and col in table.get("index", []):
                        row_idx = table["index"].index(col)
                        stats_summary = dict(zip(table["columns"], table["data"][row_idx]))
                    else:
                        stats_summary = {"column": col}
                    stats_summary["column"] = col
                    insights_blocks.append({
                        "section": f"Univariate Numerical — {col}",
                        "insight": generate_ai_insight(stats_summary, "univariate_numerical"),
                        "stats": sanitize_obj(stats_summary),
                    })
                except Exception:
                    continue
        if categorical_cols:
            cat_inspect = categorical_cols[:3]
            cat_summary = _describe_categorical(df)
            table = cat_summary.get("table") if isinstance(cat_summary, dict) else None
            for col in cat_inspect:
                try:
                    if table and col in table.get("index", []):
                        row_idx = table["index"].index(col)
                        stats_summary = dict(zip(table["columns"], table["data"][row_idx]))
                    else:
                        stats_summary = {"column": col}
                    stats_summary["column"] = col
                    insights_blocks.append({
                        "section": f"Univariate Categorical — {col}",
                        "insight": generate_ai_insight(stats_summary, "univariate_categorical"),
                        "stats": sanitize_obj(stats_summary),
                    })
                except Exception:
                    continue
        report_lines = ["Automation EDA — Full Analysis Report", ""]
        if meta_lines:
            report_lines.extend(meta_lines)
            report_lines.append("")
        report_lines.append(f"Detected Numeric Columns: {len(numeric_cols)}")
        report_lines.append(f"Detected Categorical Columns: {len(categorical_cols)}")
        report_lines.append("")
        for block in insights_blocks:
            report_lines.append(f"## {block.get('section')}")
            report_lines.append("")
            report_lines.append(block.get("insight") or "(insight unavailable)")
            report_lines.append("")
        report_text = "\n".join(report_lines).strip() + "\n"
        return {"status": "success", "report_text": report_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


def _active_dataset_or_404() -> pd.DataFrame:
    try:
        return _load_active_dataset_df()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Tidak ada dataset aktif: {e}")


@app.get("/api/interpretation")
async def api_interpretation() -> Dict[str, Any]:
    try:
        df = _active_dataset_or_404()
        result = build_interpretation(df)
        return {"status": "success", "result": sanitize_obj(result)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/reports")
async def api_reports() -> Dict[str, Any]:
    try:
        df = _active_dataset_or_404()
        report = build_full_report(df)
        return {"status": "success", "result": sanitize_obj(report)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/csv")
async def download_csv() -> StreamingResponse:
    try:
        df = _active_dataset_or_404()
        meta = {}
        if ACTIVE_DATASET_META_JSON.exists():
            with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        content = dataframe_to_csv_bytes(df)
        return StreamingResponse(
            iter([content]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_export.csv"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/xlsx")
async def download_xlsx() -> StreamingResponse:
    try:
        df = _active_dataset_or_404()
        meta = {}
        if ACTIVE_DATASET_META_JSON.exists():
            with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        numeric_stats, categorical_stats = build_stats_bundle(df)
        content = dataframe_to_xlsx_bytes(df, numeric_stats, categorical_stats)
        return StreamingResponse(
            iter([content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_report.xlsx"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/pdf")
async def download_pdf() -> StreamingResponse:
    try:
        df = _active_dataset_or_404()
        meta = {}
        if ACTIVE_DATASET_META_JSON.exists():
            with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        report = build_full_report(df)
        content = report_to_pdf_bytes(report)
        return StreamingResponse(
            iter([content]),
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_report.pdf"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/insights/recommend-chart")
async def recommend_chart(payload: ChartRecommendationRequest) -> Dict[str, Any]:
    try:
        df = _load_active_dataset_df()
        col = payload.column_name
        if col not in df.columns:
            raise HTTPException(
                status_code=400,
                detail=f"Kolom '{col}' tidak ditemukan dalam dataset aktif.",
            )
        dtype_str = str(df[col].dtype)
        if dtype_str in ("int64", "float64"):
            data_type = "numerical"
        elif dtype_str in ("object", "string"):
            data_type = "categorical"
        elif "datetime" in dtype_str:
            data_type = "datetime"
        else:
            data_type = dtype_str
        unique_count = int(df[col].nunique())
        sample_values = sanitize_obj(df[col].dropna().head(5).tolist())
        recommendation = get_chart_recommendation(
            column_name=col,
            data_type=data_type,
            unique_count=unique_count,
            sample_values=sample_values,
        )
        return {
            "status": "success",
            "column_name": col,
            "data_type": data_type,
            "unique_count": unique_count,
            "sample_values": sample_values,
            "recommendation": recommendation,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# ███  ANTIGRAVITY STANDARDIZATION ENGINE  ·  v4
#      POST /api/data/analyze  (upload + persist + EDA + health metrics)
#      GET  /api/data/analyze  (auto-fetch from persisted pkl)
# ─────────────────────────────────────────────────────────────────────────────

# ── JSON-safety helpers ───────────────────────────────────────────────────────

def _safe(v: Any) -> Any:
    """
    Cast any NumPy scalar to a native Python type.
    Map NaN, NaT, and Inf to Python None (→ JSON null).
    """
    if isinstance(v, np.integer):
        return int(v)
    if isinstance(v, np.floating):
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(v, np.bool_):
        return bool(v)
    if isinstance(v, float):
        return None if (math.isnan(v) or math.isinf(v)) else v
    if v is np.nan:
        return None
    # pandas NaT, Timestamp, etc.
    try:
        if pd.isnull(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def _sanitize_preview_records(records: List[Dict]) -> List[Dict]:
    """Ensure every cell in the preview sample is JSON-serialisable."""
    clean: List[Dict] = []
    for row in records:
        clean_row: Dict[str, Any] = {}
        for k, v in row.items():
            clean_row[str(k)] = v if isinstance(v, str) else _safe(v)
        clean.append(clean_row)
    return clean


# ── Notebook EDA Core ─────────────────────────────────────────────────────────

def _compute_summary_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Descriptive statistics for every numeric column.
    Mirrors DescriptiveStatistics.ipynb exactly.

    Fields per column:
      count, missing, missing_percentage, mean, median, mode,
      std, variance, min, max, q1, q3, iqr, skewness, kurtosis,
      distribution ("Normal" if |skewness| ≤ 0.5 else "Not Normal"),
      n_outliers (IQR-fence method).
    """
    result: Dict[str, Any] = {}
    for col in df.select_dtypes(include=["number"]).columns:
        series = df[col]
        total = len(series)
        missing_count = int(series.isna().sum())
        valid = series.dropna()
        n = len(valid)

        if n == 0:
            result[str(col)] = {
                "count": 0,
                "missing": missing_count,
                "missing_percentage": _safe(missing_count / total * 100 if total else 0),
                "mean": None, "median": None, "mode": None,
                "std": None, "variance": None, "min": None, "max": None,
                "q1": None, "q3": None, "iqr": None,
                "skewness": None, "kurtosis": None,
                "distribution": None, "n_outliers": None,
            }
            continue

        q1 = _safe(valid.quantile(0.25))
        q3 = _safe(valid.quantile(0.75))
        iqr_val = (q3 - q1) if (q1 is not None and q3 is not None) else None

        skewness_val = _safe(valid.skew())
        kurtosis_val = _safe(valid.kurt())

        distribution: Optional[str]
        if skewness_val is not None:
            distribution = "Normal" if abs(skewness_val) <= 0.5 else "Not Normal"
        else:
            distribution = None

        n_outliers: Optional[int] = None
        if iqr_val is not None and q1 is not None and q3 is not None:
            lo = q1 - 1.5 * iqr_val
            hi = q3 + 1.5 * iqr_val
            n_outliers = int(((valid < lo) | (valid > hi)).sum())

        mode_series = valid.mode()
        mode_val = _safe(mode_series.iloc[0]) if len(mode_series) > 0 else None

        result[str(col)] = {
            "count": n,
            "missing": missing_count,
            "missing_percentage": _safe(missing_count / total * 100 if total else 0),
            "mean": _safe(valid.mean()),
            "median": _safe(valid.median()),
            "mode": mode_val,
            "std": _safe(valid.std()),
            "variance": _safe(valid.var()),
            "min": _safe(valid.min()),
            "max": _safe(valid.max()),
            "q1": q1,
            "q3": q3,
            "iqr": _safe(iqr_val),
            "skewness": skewness_val,
            "kurtosis": kurtosis_val,
            "distribution": distribution,
            "n_outliers": n_outliers,
        }
    return result


def _compute_pearson_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Full Pearson correlation matrix → JSON-serialisable nested dict."""
    numeric_df = df.select_dtypes(include=["number"])
    corr = numeric_df.corr(method="pearson")
    cols = [str(c) for c in corr.columns.tolist()]
    matrix = {
        str(row_col): {
            str(col_col): _safe(corr.loc[row_col, col_col])
            for col_col in corr.columns
        }
        for row_col in corr.columns
    }
    return {"columns": cols, "matrix": matrix}


def _cramers_v_pair(x: pd.Series, y: pd.Series) -> float:
    """Bias-corrected Cramér's V between two categorical Series."""
    confusion = pd.crosstab(x, y)
    chi2, _, _, _ = chi2_contingency(confusion)
    n = confusion.values.sum()
    phi2 = chi2 / n if n else 0.0
    r, k = confusion.shape
    phi2_corr = max(0.0, phi2 - ((k - 1) * (r - 1)) / (n - 1)) if n > 1 else 0.0
    r_corr = r - (r - 1) ** 2 / (n - 1) if n > 1 else r
    k_corr = k - (k - 1) ** 2 / (n - 1) if n > 1 else k
    denom = min(k_corr - 1, r_corr - 1)
    return float(math.sqrt(phi2_corr / denom)) if denom > 0 else 0.0


def _compute_cramers_v_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Cramér's V association matrix for categorical text columns."""
    preferred = ["Gender", "Department", "Education_Level", "Job_Level"]
    cat_cols = [c for c in preferred if c in df.columns]
    if not cat_cols:
        cat_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()

    matrix: Dict[str, Any] = {}
    for col_a in cat_cols:
        matrix[col_a] = {}
        for col_b in cat_cols:
            if col_a == col_b:
                matrix[col_a][col_b] = 1.0
            else:
                try:
                    pair = df[[col_a, col_b]].dropna()
                    matrix[col_a][col_b] = round(_cramers_v_pair(pair[col_a], pair[col_b]), 4)
                except Exception:
                    matrix[col_a][col_b] = None
    return {"columns": cat_cols, "matrix": matrix}


# ── Notebook Health Metrics & EDA Runner ──────────────────────────────────────

def _compute_dataset_meta(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Notebook-level data integrity checks.
    Returns 4 key health metrics for the dataset diagnostics panel.
    """
    return {
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "total_duplicated_rows": int(df.duplicated().sum()),
        "total_missing_cells": int(df.isna().sum().sum()),
    }


def _run_eda(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Orchestrates the analytical pipeline (no AI engine).
    Returns the full payload dict (without data_preview — that is added by callers).
    """
    dataset_meta = _compute_dataset_meta(df)
    summary_stats = _compute_summary_stats(df)
    pearson_matrix = _compute_pearson_matrix(df)
    cramers_v_matrix = _compute_cramers_v_matrix(df)

    return {
        "dataset_meta": dataset_meta,
        "metadata": {
            "rows": dataset_meta["total_rows"],
            "columns": dataset_meta["total_columns"],
            "column_names": [str(c) for c in df.columns.tolist()],
        },
        "summary_stats": summary_stats,
        "pearson_matrix": pearson_matrix,
        "cramers_v_matrix": cramers_v_matrix,
    }


# ── File-parsing helper (supports CSV, TXT, Excel, JSON) ─────────────────────

def _parse_uploaded_bytes(raw_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse raw file bytes into a Pandas DataFrame. Raises HTTPException on failure."""
    bio = io.BytesIO(raw_bytes)
    lower = filename.lower()
    df: Optional[pd.DataFrame] = None

    if lower.endswith(".csv"):
        for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
            try:
                bio.seek(0)
                df = pd.read_csv(bio, encoding=enc)
                break
            except Exception:
                continue
    elif lower.endswith(".txt"):
        try:
            bio.seek(0)
            df = pd.read_csv(bio, sep="\t")
            if df is not None and df.shape[1] == 1:
                bio.seek(0)
                df = pd.read_csv(bio, sep=",")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Cannot parse TXT file: {exc}")
    elif lower.endswith((".xlsx", ".xls")):
        try:
            bio.seek(0)
            df = pd.read_excel(bio)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Cannot parse Excel file: {exc}")
    elif lower.endswith(".json"):
        try:
            bio.seek(0)
            payload_json = json.loads(bio.read().decode("utf-8-sig"))
            df = (
                pd.DataFrame(payload_json)
                if isinstance(payload_json, list)
                else pd.DataFrame([payload_json])
            )
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Cannot parse JSON file: {exc}")
    else:
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use: {supported}")

    if df is None or df.empty:
        raise HTTPException(status_code=400, detail="Dataset is empty after parsing.")

    return df


# ── POST /api/data/analyze ────────────────────────────────────────────────────

@app.post("/api/data/analyze")
async def analyze_data_post(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Upload a file → parse raw DataFrame (DO NOT drop rows) →
    immediately save to data_raw.pkl → run EDA + health metrics →
    return combined payload with random 10-row sample as data_preview.
    """
    filename = file.filename or ""
    if not filename.strip():
        raise HTTPException(status_code=400, detail="No file name provided.")
    if not is_supported_upload(filename):
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use: {supported}")

    try:
        raw_bytes = await file.read()
        if not raw_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # ── 1. Parse to raw DataFrame — zero rows dropped ─────────────────────
        df_raw = _parse_uploaded_bytes(raw_bytes, filename)

        # ── 2. Persist to disk immediately ────────────────────────────────────
        df_raw.to_pickle(_ENGINE_PKL)

        # ── Remove stale cleaned dataset so the app reflects the new upload ──
        if _CLEAN_PKL.exists():
            _CLEAN_PKL.unlink()

        # ── 3. EDA + Notebook Health Metrics ──────────────────────────────────
        payload = _run_eda(df_raw)
        payload["status"] = "success"
        payload["metadata"]["fileName"] = filename

        # ── 4. Data preview: random sample of max 10 rows from raw DataFrame ─
        sample_n = min(10, len(df_raw))
        preview_records = df_raw.sample(n=sample_n, random_state=42).to_dict(orient="records")
        payload["data_preview"] = _sanitize_preview_records(preview_records)

        return payload

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Server error: {exc}") from exc


# ── GET /api/data/analyze ─────────────────────────────────────────────────────

@app.get("/api/data/analyze")
async def analyze_data_get() -> Dict[str, Any]:
    """
    Cross-page auto-fetch endpoint.
    • data_raw.pkl missing  → {"status": "no_data"}
    • data_clean.pkl present → load cleaned df (latest cleaning state).
    • data_clean.pkl absent  → fallback to data_raw.pkl.
    """
    if not _ENGINE_PKL.exists():
        return {"status": "no_data"}

    try:
        # Prefer the cleaned dataset if it exists; fallback to raw.
        df_source = pd.read_pickle(_CLEAN_PKL) if _CLEAN_PKL.exists() else pd.read_pickle(_ENGINE_PKL)

        payload = _run_eda(df_source)
        payload["status"] = "success"

        sample_n = min(10, len(df_source))
        preview_records = df_source.sample(n=sample_n, random_state=42).to_dict(orient="records")
        payload["data_preview"] = _sanitize_preview_records(preview_records)

        return payload

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Server error: {exc}") from exc
