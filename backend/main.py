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
import shutil
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import Cookie, Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
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
    get_user_paths,
    is_supported_upload,
    migrate_legacy_data_to_users,
    persist_metadata,
    read_dataframe_and_raw,
    sanitize_obj,
)
from backend.dependencies import require_user_id
from backend.visualization import (
    generate_bivariate_plot,
    generate_categorical_plot,
    generate_numerical_plot,
    generate_time_series_plot,
)
from backend.auth import (
    COOKIE_NAME,
    authenticate_user,
    create_access_token,
    get_user_by_id,
    verify_token,
    ACCESS_TOKEN_EXPIRE_DAYS,
)
from cleaning import clean_dataset
from insights import generate_ai_insight, get_chart_recommendation

# ── Persistence paths ─────────────────────────────────────────────────────────
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
    migrate_legacy_data_to_users()


# ─── AUTH ENDPOINTS ───────────────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/api/auth/login")
async def auth_login(req: LoginRequest) -> JSONResponse:
    """Authenticate user and set JWT cookie."""
    user = authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email atau password salah.")

    token = create_access_token({"sub": user["id"], "email": user["email"]})

    response = JSONResponse(content={"status": "success", "user": user})
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,  # 7 days in seconds
    )
    return response


@app.get("/api/auth/me")
async def auth_me(request: Request) -> Dict[str, Any]:
    """Return current authenticated user info from JWT cookie."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid.")

    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    return {"status": "success", "user": user}


@app.post("/api/auth/logout")
async def auth_logout() -> JSONResponse:
    """Clear the session cookie."""
    response = JSONResponse(content={"status": "success", "message": "Logged out."})
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return response


# ─── JSON SAFETY UTILITIES ───────────────────────────────────────────────────

def clean_json_payload(obj: Any) -> Any:
    """
    Recursively scan any dictionary/list and convert:
    - float('nan'), float('inf'), np.nan → None
    - np.int64/np.float64 → native Python int/float
    - np.ndarray → list
    - pd.Series → list
    - pd.Timestamp → str
    Guarantees 100% JSON compliance with zero raw NumPy or NaN leakages.
    """
    if isinstance(obj, dict):
        return {str(k): clean_json_payload(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [clean_json_payload(x) for x in obj]
    elif isinstance(obj, np.ndarray):
        return clean_json_payload(obj.tolist())
    elif isinstance(obj, pd.Series):
        return clean_json_payload(obj.tolist())
    elif isinstance(obj, pd.DataFrame):
        return {
            "columns": [str(c) for c in obj.columns.tolist()],
            "index": [str(i) for i in obj.index.tolist()],
            "data": [[clean_json_payload(v) for v in row] for row in obj.values.tolist()],
        }
    elif isinstance(obj, (pd.Timestamp, pd.Timedelta)):
        return str(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        f = float(obj)
        return None if (math.isnan(f) or math.isinf(f)) else f
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    elif obj is None:
        return None
    else:
        try:
            if pd.isna(obj):
                return None
        except (TypeError, ValueError):
            pass
        return obj


def _safe(v: Any) -> Any:
    """Cast any NumPy scalar to native Python type. Map NaN/NaT/Inf to None."""
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


# ─── Health check ──────────────────────────────────────────────────────────────

@app.get("/")
async def health_check(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    try:
        cleanup_orphaned_dataset_metadata(user_id)
        paths = get_user_paths(user_id)
        return {
            "status": "ok",
            "service": "Automation EDA API",
            "dataset_active": paths["active_pkl"].exists(),
            "engine_pkl_exists": paths["raw_pkl"].exists(),
            "clean_pkl_exists": paths["clean_pkl"].exists(),
            "data_dirs": {"raw": str(RAW_DIR), "clean": str(CLEAN_DIR)},
            "supported_uploads": list(SUPPORTED_UPLOAD_EXTENSIONS),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {e}")


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
        "x_column": x_col, "y_column": y_col,
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
            "std": {str(k): round(float(v), 4) if pd.notna(v) else None for k, v in stats_df["std"].items()},
        }
    return summary


def _resolve_dataframe(file: Optional[UploadFile], user_id: str) -> pd.DataFrame:
    if file is not None and file.filename:
        filename = file.filename
        if not is_supported_upload(filename):
            supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
            raise HTTPException(status_code=400, detail=f"Unsupported file type. Use {supported}")
        df, raw = read_dataframe_and_raw(file)
        safe_name = os.path.basename(filename)
        paths = get_user_paths(user_id)
        save_path = paths["raw_pkl"].parent / safe_name
        with save_path.open("wb") as f:
            f.write(raw)
        df.to_pickle(paths["active_pkl"])
        persist_metadata(user_id=user_id, file_name=safe_name, df=df, raw_size_bytes=len(raw), original_filename=filename)
        return df
    return _load_active_dataset_df(user_id)


def _load_working_dataframe(user_id: str) -> pd.DataFrame:
    """Load from user's data_clean.pkl if available, fallback to data_raw.pkl."""
    paths = get_user_paths(user_id)
    try:
        if paths["clean_pkl"].exists():
            return pd.read_pickle(paths["clean_pkl"])
        elif paths["raw_pkl"].exists():
            return pd.read_pickle(paths["raw_pkl"])
        else:
            raise HTTPException(status_code=404, detail="No dataset found. Upload data first.")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f"Dataset file not found: {e}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset: {e}")


# ─── Existing endpoints ───────────────────────────────────────────────────────

@app.get("/api/current-dataset")
async def current_dataset(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    empty_payload: Dict[str, Any] = {
        "status": "success", "activated": False, "dataset": None,
        "preview": None, "numeric_columns": [], "categorical_columns": [],
    }
    try:
        paths = get_user_paths(user_id)
        if not paths["active_pkl"].exists() or not paths["active_meta"].exists():
            return empty_payload
        df = pd.read_pickle(paths["active_pkl"])
        with paths["active_meta"].open("r", encoding="utf-8") as f:
            meta = json.load(f)
        preview_data = build_dataset_preview(df, n_head=10)
        return {
            "status": "success", "activated": True,
            "dataset": {
                "fileName": meta.get("fileName", ""), "originalFilename": meta.get("originalFilename", ""),
                "rows": meta.get("rows", int(len(df))), "columns": meta.get("columns", int(len(df.columns))),
                "fileSize": meta.get("fileSize", ""), "uploadedAt": meta.get("uploadedAt", ""),
            },
            "preview": preview_data,
            "numeric_columns": get_numeric_columns(df),
            "categorical_columns": get_categorical_columns(df),
        }
    except Exception as e:
        return {**empty_payload, "_error": str(e)}


@app.post("/api/reset")
async def reset_dataset(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    try:
        paths = get_user_paths(user_id)
        deleted: list[str] = []
        for p in [paths["raw_pkl"], paths["active_pkl"], paths["active_meta"], paths["clean_pkl"]]:
            if p.exists():
                p.unlink()
                deleted.append(p.name)
        if deleted:
            return {"status": "success", "message": f"Dataset reset. Deleted: {', '.join(deleted)}", "deleted": deleted}
        return {"status": "info", "message": "No active data to reset.", "deleted": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {e}")


@app.post("/api/upload")
async def upload(
    file: UploadFile = File(...),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    filename = file.filename or ""
    if not filename.strip():
        raise HTTPException(status_code=400, detail="No file name provided.")
    if not is_supported_upload(filename):
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use {supported}")
    try:
        df, raw = read_dataframe_and_raw(file)
        safe_name = os.path.basename(filename)
        paths = get_user_paths(user_id)

        # Create backup of existing raw file before overwriting
        if paths["raw_pkl"].exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_backup_name = os.path.splitext(safe_name)[0].replace(" ", "_")
            backup_path = paths["raw_pkl"].parent / f"data_raw_{safe_backup_name}_{timestamp}.pkl"
            paths["raw_pkl"].rename(backup_path)

        save_path = paths["raw_pkl"].parent / safe_name
        with save_path.open("wb") as f:
            f.write(raw)
        df.to_pickle(paths["raw_pkl"])
        if paths["clean_pkl"].exists():
            paths["clean_pkl"].unlink()
        df.to_pickle(paths["active_pkl"])
        persist_metadata(user_id=user_id, file_name=safe_name, df=df, raw_size_bytes=len(raw), original_filename=file.filename)

        # Track upload history
        _save_upload_history(paths, filename, df, len(raw))

        return {
            "status": "success",
            "metadata": {"fileName": safe_name, "rows": int(len(df)), "columns": int(len(df.columns)),
                         "fileSize": _format_file_size(len(raw)), "savedTo": str(save_path)},
            "cleaning": {"original_rows": int(len(df)), "cleaned_rows": int(len(df)), "duplicates_removed": 0,
                         "rows_deleted_missing_data": 0, "columns_standardized": [str(c) for c in df.columns]},
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


class CleanActionRequest(BaseModel):
    action: str


@app.post("/api/data/clean")
async def api_data_clean(
    req: CleanActionRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Interactive data cleaning. Reads clean→raw fallback, saves to data_clean.pkl."""
    try:
        df = _load_working_dataframe(user_id)
        original_rows = int(len(df))
        original_missing = int(df.isna().sum().sum())
        original_duplicated = int(df.duplicated().sum())
        action = req.action.strip()

        if action == "drop_duplicates":
            df = df.drop_duplicates().reset_index(drop=True)
        elif action == "impute_mean":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
        elif action == "impute_median":
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
        elif action == "drop_missing_rows":
            df = df.dropna().reset_index(drop=True)
        elif action == "impute_mode":
            for col in df.columns:
                mode_vals = df[col].mode()
                if len(mode_vals) > 0:
                    df[col] = df[col].fillna(mode_vals.iloc[0])
        elif action == "standardize_text":
            text_cols = df.select_dtypes(include=["object", "string"]).columns
            for col in text_cols:
                df[col] = df[col].astype(str).str.strip().str.lower()
                df[col] = df[col].replace("nan", pd.NA)
                df[col] = df[col].replace({"none": pd.NA, "": pd.NA})
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: '{action}'. Valid: drop_duplicates, impute_mean, impute_median, impute_mode, drop_missing_rows, standardize_text")

        paths = get_user_paths(user_id)
        df.to_pickle(paths["clean_pkl"])
        df.to_pickle(paths["active_pkl"])

        existing_meta: dict[str, Any] = {}
        if paths["active_meta"].exists():
            try:
                with paths["active_meta"].open("r", encoding="utf-8") as f:
                    existing_meta = json.load(f) or {}
            except Exception:
                existing_meta = {}

        meta_payload = {
            "fileName": existing_meta.get("fileName", "dataset.pkl"),
            "originalFilename": existing_meta.get("originalFilename", existing_meta.get("fileName", "dataset.pkl")),
            "rows": int(len(df)), "columns": int(len(df.columns)),
            "fileSize": existing_meta.get("fileSize", "0 B"),
            "uploadedAt": existing_meta.get("uploadedAt", ""),
        }
        with paths["active_meta"].open("w", encoding="utf-8") as f:
            json.dump(meta_payload, f, ensure_ascii=False, indent=2)

        dataset_meta = _compute_dataset_meta(df)
        return clean_json_payload({
            "status": "success", "action": action, "dataset_meta": dataset_meta,
            "changes": {
                "rows_before": original_rows, "rows_after": int(len(df)),
                "rows_removed": original_rows - int(len(df)),
                "missing_before": original_missing, "missing_after": int(df.isna().sum().sum()),
                "duplicated_before": original_duplicated, "duplicated_after": int(df.duplicated().sum()),
            },
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


class ExecuteCleaningRequest(BaseModel):
    action: str


@app.get("/api/data/cleaning-summary")
async def api_cleaning_summary(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    """Return cleaning diagnostics with per-column missing value counts."""
    try:
        df = _load_working_dataframe(user_id)
        missing_per_col: List[Dict[str, Any]] = []
        for col in df.columns:
            missing_per_col.append({"column": str(col), "type": str(df[col].dtype), "missing_count": int(df[col].isna().sum())})
        return clean_json_payload({
            "status": "success", "total_rows": int(len(df)), "total_columns": int(len(df.columns)),
            "total_duplicated_rows": int(df.duplicated().sum()), "total_missing_cells": int(df.isna().sum().sum()),
            "columns_detail": missing_per_col,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


@app.post("/api/data/execute-cleaning")
async def api_execute_cleaning(
    req: ExecuteCleaningRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Execute a cleaning action and persist result to user's data_clean.pkl."""
    try:
        action = req.action.strip()
        if action == "reset_raw":
            paths = get_user_paths(user_id)
            if paths["raw_pkl"].exists():
                import shutil
                shutil.copy2(paths["raw_pkl"], paths["clean_pkl"])
                df = pd.read_pickle(paths["clean_pkl"])
            elif paths["clean_pkl"].exists():
                df = pd.read_pickle(paths["clean_pkl"])
            else:
                raise HTTPException(status_code=404, detail="No dataset found.")
            return clean_json_payload({
                "status": "success", "message": "Dataset reset to raw data.",
                "total_rows": int(len(df)), "total_columns": int(len(df.columns)),
                "total_duplicated_rows": int(df.duplicated().sum()), "total_missing_cells": int(df.isna().sum().sum()),
            })

        df = _load_working_dataframe(user_id)
        msg = ""
        if action == "drop_duplicates":
            before = int(len(df))
            df = df.drop_duplicates()
            removed = before - int(len(df))
            msg = f"Removed {removed} duplicate row(s). {int(len(df))} rows remaining."
        elif action == "impute_missing":
            before_missing = int(df.isna().sum().sum())
            num_cols = df.select_dtypes(include=["number"]).columns
            if len(num_cols) > 0:
                df[num_cols] = df[num_cols].fillna(df[num_cols].median())
            cat_cols = df.select_dtypes(include=["object", "string", "category"]).columns
            for col in cat_cols:
                df[col] = df[col].fillna("Unknown")
            after_missing = int(df.isna().sum().sum())
            msg = f"Imputed {before_missing - after_missing} missing cell(s). Remaining: {after_missing}."
        else:
            raise HTTPException(status_code=400, detail=f"Unknown action: '{action}'. Valid: drop_duplicates, impute_missing, reset_raw")

        paths = get_user_paths(user_id)
        df.to_pickle(paths["clean_pkl"])
        return clean_json_payload({
            "status": "success", "message": msg,
            "total_rows": int(len(df)), "total_columns": int(len(df.columns)),
            "total_duplicated_rows": int(df.duplicated().sum()), "total_missing_cells": int(df.isna().sum().sum()),
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}") from e


@app.post("/api/preview")
async def api_preview(
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        preview_data = build_dataset_preview(df, n_head=10)
        return clean_json_payload({"status": "success", "result": preview_data})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/numeric")
async def analysis_numeric(
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        return clean_json_payload({"status": "success", "result": describe_numeric(df)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/analysis/categorical")
async def analysis_categorical(
    file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        return clean_json_payload({"status": "success", "result": describe_categorical(df)})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")




# ── AI Schema & Chart Render Endpoints ────────────────────────────────────────

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
    """Alias for clean_json_payload for backward compatibility."""
    return clean_json_payload(obj)


@app.get("/api/data/ai-schema")
async def api_data_ai_schema(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    """Load active dataset, classify columns, and query AI engine for validation."""
    try:
        df = _load_working_dataframe(user_id)

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
            rule_baseline[col] = {"type": ctype, "recommended_charts": recommended, "reason": reason}

        columns_info = {}
        for col in df.columns:
            nunique = int(df[col].dropna().nunique())
            dtype_str = str(df[col].dtype)
            sample_vals = df[col].dropna().head(3).tolist()
            columns_info[col] = {"dtype": dtype_str, "unique_count": nunique, "sample_values": sample_vals}

        sample_dict = df.head(3).to_dict(orient="records")

        system_instruction = (
            "You are a Senior Statistician and Data Science Consultant. Classify each column under Intro Statistics rules:\n"
            "- 'Categorical (Qualitative)': strings, objects, categories, booleans.\n"
            "- 'Discrete Numeric': numeric with <= 10 unique values.\n"
            "- 'Continuous Numeric': numeric with > 10 unique values.\n\n"
            "Recommended Charts: ['Bar Chart', 'Histogram', 'Boxplot', 'Scatter Plot', 'Grouped Comparison']\n"
            "Return JSON: {\"columns\": {\"col_name\": {\"type\": str, \"recommended_charts\": [], \"reason\": str}}}"
        )

        prompt_payload = {"columns_schema": columns_info, "3_row_sample": sample_dict, "rule_based_baseline": rule_baseline}
        prompt_content = (
            f"Dataset metadata, 3-row sample, and rule-based baseline:\n"
            f"{json.dumps(prompt_payload, indent=2, default=str)}\n\n"
            f"Review each column. Provide a concise 1-sentence reason. Return JSON only."
        )

        ai_result = None
        gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
        groq_key = os.getenv("GROQ_API_KEY", "").strip()

        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_instruction)
                response = model.generate_content(prompt_content, generation_config={"response_mime_type": "application/json"})
                ai_result = safe_parse_json(response.text)
            except Exception as e:
                print(f"Gemini schema generation failed: {e}")

        if not ai_result and groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                response = client.chat.completions.create(
                    model="llama-3.1-70b-versatile",
                    messages=[{"role": "system", "content": system_instruction}, {"role": "user", "content": prompt_content}],
                    response_format={"type": "json_object"}
                )
                ai_result = safe_parse_json(response.choices[0].message.content)
            except Exception as e:
                print(f"Groq schema generation failed: {e}")

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
                final_columns[col] = {"type": ctype, "recommended_charts": recommended, "reason": reason}
            else:
                final_columns[col] = baseline

        return clean_json_payload({"status": "success", "columns": final_columns})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error in ai-schema: {e}")


@app.get("/api/data/me")
async def get_my_data_status(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    """Return current user's dataset status (has raw, has clean, metadata)."""
    try:
        paths = get_user_paths(user_id)
        metadata = None
        if paths["active_meta"].exists():
            try:
                with paths["active_meta"].open("r", encoding="utf-8") as f:
                    metadata = json.load(f)
            except Exception:
                metadata = None
        return {
            "status": "success",
            "has_raw_data": paths["raw_pkl"].exists(),
            "has_clean_data": paths["clean_pkl"].exists(),
            "metadata": metadata,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


class ChartRenderRequest(BaseModel):
    scope: str  # "univariate" | "bivariate" | "multivariate" | "timeseries"
    var_x: Optional[str] = None
    var_y: Optional[str] = None
    var_z: Optional[str] = None
    granularity: Optional[str] = "D"  # "D" | "W" | "M" | None


@app.post("/api/data/chart-render")
async def api_data_chart_render(
    req: ChartRenderRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Advanced statistical computation engine for 4 distinct visualization scopes."""
    try:
        df = _load_working_dataframe(user_id)
        scope = req.scope.strip().lower()
        var_x = (req.var_x or "").strip() or None
        var_y = (req.var_y or "").strip() or None
        var_z = (req.var_z or "").strip() or None
        granularity = (req.granularity or "D").strip()

        # ── UNIVARIATE ─────────────────────────────────────────────────────
        if scope == "univariate":
            if not var_x or var_x not in df.columns:
                raise HTTPException(status_code=400, detail=f"var_x '{var_x}' not found in dataset.")
            
            col_type = _classify_column_type(df, var_x)
            clean = df[var_x].dropna()
            
            if col_type in ("continuous_numeric", "discrete_numeric"):
                # Histogram: 10 bins
                if len(clean) == 0:
                    hist_data = {"categories": [], "values": []}
                else:
                    counts, bin_edges = np.histogram(clean, bins=10)
                    bin_labels = [f"{bin_edges[i]:.2f} - {bin_edges[i+1]:.2f}" for i in range(len(bin_edges) - 1)]
                    hist_data = {"categories": bin_labels, "values": [int(c) for c in counts.tolist()]}
                
                # Boxplot: five-number summary
                if len(clean) == 0:
                    box_data = {"min": 0, "q1": 0, "median": 0, "q3": 0, "max": 0, "lower_whisker": 0, "upper_whisker": 0, "outliers": []}
                else:
                    q1 = float(np.percentile(clean, 25))
                    median = float(np.percentile(clean, 50))
                    q3 = float(np.percentile(clean, 75))
                    iqr = q3 - q1
                    w_lo = max(float(clean.min()), q1 - 1.5 * iqr)
                    w_hi = min(float(clean.max()), q3 + 1.5 * iqr)
                    outliers = clean[(clean < w_lo) | (clean > w_hi)]
                    box_data = {
                        "min": float(clean.min()), "q1": q1, "median": median, "q3": q3, "max": float(clean.max()),
                        "lower_whisker": w_lo, "upper_whisker": w_hi, "outliers": [float(v) for v in outliers.tolist()]
                    }
                
                # Summary statistics
                summary = {
                    "count": int(len(clean)), "mean": float(clean.mean()), "median": float(clean.median()),
                    "std": float(clean.std()), "min": float(clean.min()), "max": float(clean.max()),
                    "q1": q1, "q3": q3, "skewness": float(clean.skew()), "kurtosis": float(clean.kurt()),
                }
                
                return clean_json_payload({
                    "status": "success", "scope": "univariate", "var_x": var_x, "column_type": col_type,
                    "histogram": hist_data, "boxplot": box_data, "summary": summary,
                })
            else:
                # Categorical: value counts
                counts = df[var_x].value_counts().head(20)
                value_counts = [{"category": str(c), "count": int(v)} for c, v in zip(counts.index.tolist(), counts.values.tolist())]
                return clean_json_payload({
                    "status": "success", "scope": "univariate", "var_x": var_x, "column_type": col_type,
                    "value_counts": value_counts, "unique_count": int(df[var_x].nunique()),
                })

        # ── BIVARIATE ──────────────────────────────────────────────────────
        elif scope == "bivariate":
            if not var_x or var_x not in df.columns:
                raise HTTPException(status_code=400, detail=f"var_x '{var_x}' not found.")
            if not var_y or var_y not in df.columns:
                raise HTTPException(status_code=400, detail=f"var_y '{var_y}' not found.")
            
            type_x = _classify_column_type(df, var_x)
            type_y = _classify_column_type(df, var_y)
            pair = df[[var_x, var_y]].dropna()
            
            # Continuous vs Continuous
            if type_x in ("continuous_numeric", "discrete_numeric") and type_y in ("continuous_numeric", "discrete_numeric"):
                x_vals = pd.to_numeric(pair[var_x], errors="coerce").dropna()
                y_vals = pd.to_numeric(pair[var_y], errors="coerce").dropna()
                valid_pair = pd.DataFrame({var_x: x_vals, var_y: y_vals}).dropna()
                
                if len(valid_pair) < 2:
                    return clean_json_payload({"status": "success", "scope": "bivariate", "var_x": var_x, "var_y": var_y, "type": "continuous_continuous", "points": [], "regression": None})
                
                x_arr = valid_pair[var_x].values
                y_arr = valid_pair[var_y].values
                points = [[float(x), float(y)] for x, y in zip(x_arr, y_arr)]
                
                # Linear regression
                slope, intercept = np.polyfit(x_arr, y_arr, 1)
                y_pred = slope * x_arr + intercept
                ss_res = np.sum((y_arr - y_pred) ** 2)
                ss_tot = np.sum((y_arr - np.mean(y_arr)) ** 2)
                r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0.0
                
                return clean_json_payload({
                    "status": "success", "scope": "bivariate", "var_x": var_x, "var_y": var_y,
                    "type": "continuous_continuous", "points": points,
                    "regression": {"slope": float(slope), "intercept": float(intercept), "r_squared": float(r_squared)},
                })
            
            # Categorical vs Continuous
            elif (type_x == "categorical" and type_y in ("continuous_numeric", "discrete_numeric")) or \
                 (type_y == "categorical" and type_x in ("continuous_numeric", "discrete_numeric")):
                cat_col = var_x if type_x == "categorical" else var_y
                num_col = var_y if type_x == "categorical" else var_x
                
                pair_clean = pair.copy()
                pair_clean[num_col] = pd.to_numeric(pair_clean[num_col], errors="coerce")
                pair_clean = pair_clean.dropna()
                
                group_means = pair_clean.groupby(cat_col, observed=True)[num_col].mean().sort_values(ascending=False)
                means_data = [{"category": str(c), "mean": float(v)} for c, v in zip(group_means.index.tolist(), group_means.values.tolist())]
                
                # Comparative boxplots
                boxplots = {}
                for cat_val in pair_clean[cat_col].unique():
                    subset = pair_clean[pair_clean[cat_col] == cat_val][num_col]
                    if len(subset) > 0:
                        q1 = float(np.percentile(subset, 25))
                        q3 = float(np.percentile(subset, 75))
                        boxplots[str(cat_val)] = {
                            "min": float(subset.min()), "q1": q1, "median": float(np.percentile(subset, 50)),
                            "q3": q3, "max": float(subset.max()), "count": int(len(subset)),
                        }
                
                return clean_json_payload({
                    "status": "success", "scope": "bivariate", "var_x": var_x, "var_y": var_y,
                    "type": "categorical_continuous", "cat_col": cat_col, "num_col": num_col,
                    "group_means": means_data, "boxplots": boxplots,
                })
            
            # Categorical vs Categorical
            else:
                contingency = pd.crosstab(pair[var_x], pair[var_y], normalize="index") * 100
                ct_dict = {}
                for idx_val in contingency.index:
                    ct_dict[str(idx_val)] = {str(col_val): float(contingency.loc[idx_val, col_val]) for col_val in contingency.columns}
                
                return clean_json_payload({
                    "status": "success", "scope": "bivariate", "var_x": var_x, "var_y": var_y,
                    "type": "categorical_categorical", "contingency_table": ct_dict,
                })

        # ── MULTIVARIATE ───────────────────────────────────────────────────
        elif scope == "multivariate":
            # Pearson Correlation Matrix
            numeric_df = df.select_dtypes(include=[np.number])
            if numeric_df.empty or len(numeric_df.columns) < 2:
                return clean_json_payload({"status": "success", "scope": "multivariate", "correlation_matrix": {}, "scatter_3d": []})
            
            corr = numeric_df.corr(method="pearson")
            corr_dict = {str(row): {str(col): float(corr.loc[row, col]) for col in corr.columns} for row in corr.index}
            
            # 3-variable scatter if var_x, var_y, var_z provided
            scatter_3d = []
            if var_x and var_y and var_z and all(v in df.columns for v in [var_x, var_y, var_z]):
                subset = df[[var_x, var_y, var_z]].dropna()
                for _, row in subset.head(500).iterrows():
                    scatter_3d.append({
                        "x": float(row[var_x]) if pd.notna(row[var_x]) else None,
                        "y": float(row[var_y]) if pd.notna(row[var_y]) else None,
                        "z": str(row[var_z]) if not pd.api.types.is_numeric_dtype(df[var_z]) else float(row[var_z]),
                    })
            
            return clean_json_payload({
                "status": "success", "scope": "multivariate",
                "correlation_matrix": corr_dict, "scatter_3d": scatter_3d,
            })

        # ── TIMESERIES ─────────────────────────────────────────────────────
        elif scope == "timeseries":
            if not var_x or var_x not in df.columns:
                raise HTTPException(status_code=400, detail=f"var_x (datetime column) '{var_x}' not found.")
            if not var_y or var_y not in df.columns:
                raise HTTPException(status_code=400, detail=f"var_y (value column) '{var_y}' not found.")
            
            try:
                df_ts = df[[var_x, var_y]].copy()
                df_ts[var_x] = pd.to_datetime(df_ts[var_x], errors="coerce")
                df_ts = df_ts.dropna()
                df_ts = df_ts.sort_values(var_x)
                df_ts = df_ts.set_index(var_x)
                
                # Resample by granularity
                gran = granularity if granularity in ("D", "W", "M") else "D"
                resampled = df_ts[var_y].resample(gran).mean()
                
                ts_data = [{"date": str(idx.date()), "value": float(v)} for idx, v in zip(resampled.index, resampled.values) if pd.notna(v)]
                
                return clean_json_payload({
                    "status": "success", "scope": "timeseries", "var_x": var_x, "var_y": var_y,
                    "granularity": gran, "timeseries": ts_data,
                })
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Timeseries processing failed: {e}")

        else:
            raise HTTPException(status_code=400, detail=f"Unknown scope: '{scope}'. Valid: univariate, bivariate, multivariate, timeseries")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error in chart-render: {e}")




# ── Visualization Endpoints (Highcharts) ──────────────────────────────────────

@app.post("/api/visualization/numerical")
async def visualization_numerical(
    col: str = Form(...), chart_type: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        options = generate_numerical_plot(df, col, chart_type)
        return clean_json_payload({"status": "success", "chart_type": chart_type, "column": col, "options": options})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/visualization/categorical")
async def visualization_categorical(
    col: str = Form(...), chart_type: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        options = generate_categorical_plot(df, col, chart_type)
        return clean_json_payload({"status": "success", "chart_type": chart_type, "column": col, "options": options})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/visualization/bivariate")
async def visualization_bivariate(
    x_col: str = Form(...), y_col: str = Form(...), chart_type: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        options = generate_bivariate_plot(df, x_col, y_col, chart_type)
        return clean_json_payload({"status": "success", "chart_type": chart_type, "x_col": x_col, "y_col": y_col, "options": options})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/visualization/time-series")
async def visualization_time_series(
    date_col: str = Form(...), value_col: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        options = generate_time_series_plot(df, date_col, value_col)
        return clean_json_payload({
            "status": "success", 
            "date_col": date_col, 
            "value_col": value_col, 
            "options": options
        })
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")

# ── Insights Endpoints ────────────────────────────────────────────────────────

@app.post("/api/insights/univariate")
async def insights_univariate(
    col: str = Form(...), type: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        col_type = type.lower().strip()
        stats = _extract_column_stats(df, col, col_type)
        stats["column"] = col
        context = f"univariate_{col_type}"
        insight = generate_ai_insight(stats, context)
        return clean_json_payload({"status": "success", "column": col, "type": col_type, "stats": stats, "insight": insight})
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/insights/bivariate")
async def insights_bivariate(
    x_col: str = Form(...), y_col: str = Form(...), file: Optional[UploadFile] = File(None),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _resolve_dataframe(file, user_id)
        summary = _build_bivariate_summary(df, x_col, y_col)
        insight = generate_ai_insight(summary, "bivariate")
        return clean_json_payload({"status": "success", "x_col": x_col, "y_col": y_col, "stats": summary, "insight": insight})
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
        return clean_json_payload({"status": "success", "insight": insight})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.post("/api/insights/recommend-chart")
async def recommend_chart(
    payload: ChartRecommendationRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    try:
        df = _load_active_dataset_df(user_id)
        col = payload.column_name
        if col not in df.columns:
            raise HTTPException(status_code=400, detail=f"Column '{col}' not found in dataset.")
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
        recommendation = get_chart_recommendation(column_name=col, data_type=data_type, unique_count=unique_count, sample_values=sample_values)
        return clean_json_payload({
            "status": "success", "column_name": col, "data_type": data_type,
            "unique_count": unique_count, "sample_values": sample_values, "recommendation": recommendation,
        })
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


# ── Report & Export Endpoints ─────────────────────────────────────────────────

@app.post("/api/export/report")
async def export_report(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    try:
        df = _load_active_dataset_df(user_id)
        paths = get_user_paths(user_id)
        dataset_meta = {}
        if paths["active_meta"].exists():
            try:
                with paths["active_meta"].open("r", encoding="utf-8") as f:
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
        if numeric_cols:
            num_inspect = numeric_cols[:3]
            num_summary = describe_numeric(df)
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
            cat_summary = describe_categorical(df)
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
        return clean_json_payload({"status": "success", "report_text": report_text})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


def _active_dataset_or_404(user_id: str) -> pd.DataFrame:
    try:
        return _load_active_dataset_df(user_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"No active dataset: {e}")


@app.get("/api/interpretation")
async def api_interpretation(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    try:
        df = _active_dataset_or_404(user_id)
        result = build_interpretation(df)
        return clean_json_payload({"status": "success", "result": result})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/reports")
async def api_reports(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    try:
        df = _active_dataset_or_404(user_id)
        report = build_full_report(df)
        return clean_json_payload({"status": "success", "result": report})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/csv")
async def download_csv(user_id: str = Depends(require_user_id)) -> StreamingResponse:
    try:
        df = _active_dataset_or_404(user_id)
        paths = get_user_paths(user_id)
        meta = {}
        if paths["active_meta"].exists():
            with paths["active_meta"].open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        content = dataframe_to_csv_bytes(df)
        return StreamingResponse(iter([content]), media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_export.csv"'})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/xlsx")
async def download_xlsx(user_id: str = Depends(require_user_id)) -> StreamingResponse:
    try:
        df = _active_dataset_or_404(user_id)
        paths = get_user_paths(user_id)
        meta = {}
        if paths["active_meta"].exists():
            with paths["active_meta"].open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        numeric_stats, categorical_stats = build_stats_bundle(df)
        content = dataframe_to_xlsx_bytes(df, numeric_stats, categorical_stats)
        return StreamingResponse(iter([content]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_report.xlsx"'})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


@app.get("/api/download/pdf")
async def download_pdf(user_id: str = Depends(require_user_id)) -> StreamingResponse:
    try:
        df = _active_dataset_or_404(user_id)
        paths = get_user_paths(user_id)
        meta = {}
        if paths["active_meta"].exists():
            with paths["active_meta"].open("r", encoding="utf-8") as f:
                meta = json.load(f)
        base_name = Path(meta.get("fileName", "dataset")).stem
        report = build_full_report(df)
        content = report_to_pdf_bytes(report)
        return StreamingResponse(iter([content]), media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{base_name}_report.pdf"'})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")




# ── Notebook EDA Core ─────────────────────────────────────────────────────────

def _compute_dataset_meta(df: pd.DataFrame) -> Dict[str, Any]:
    """Notebook-level data integrity checks. Returns 4 key health metrics."""
    return {
        "total_rows": int(len(df)),
        "total_columns": int(len(df.columns)),
        "total_duplicated_rows": int(df.duplicated().sum()),
        "total_missing_cells": int(df.isna().sum().sum()),
    }


def _compute_summary_stats(df: pd.DataFrame) -> Dict[str, Any]:
    """Descriptive statistics for every numeric column."""
    result: Dict[str, Any] = {}
    for col in df.select_dtypes(include=["number"]).columns:
        series = df[col]
        total = len(series)
        missing_count = int(series.isna().sum())
        valid = series.dropna()
        n = len(valid)

        if n == 0:
            result[str(col)] = {
                "count": 0, "missing": missing_count,
                "missing_percentage": _safe(missing_count / total * 100 if total else 0),
                "mean": None, "median": None, "mode": None,
                "std": None, "variance": None, "min": None, "max": None,
                "q1": None, "q3": None, "iqr": None,
                "skewness": None, "kurtosis": None, "distribution": None, "n_outliers": None,
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
            "count": n, "missing": missing_count,
            "missing_percentage": _safe(missing_count / total * 100 if total else 0),
            "mean": _safe(valid.mean()), "median": _safe(valid.median()), "mode": mode_val,
            "std": _safe(valid.std()), "variance": _safe(valid.var()),
            "min": _safe(valid.min()), "max": _safe(valid.max()),
            "q1": q1, "q3": q3, "iqr": _safe(iqr_val),
            "skewness": skewness_val, "kurtosis": kurtosis_val,
            "distribution": distribution, "n_outliers": n_outliers,
        }
    return result


def _compute_pearson_matrix(df: pd.DataFrame) -> Dict[str, Any]:
    """Full Pearson correlation matrix → JSON-serialisable nested dict."""
    numeric_df = df.select_dtypes(include=["number"])
    corr = numeric_df.corr(method="pearson")
    cols = [str(c) for c in corr.columns.tolist()]
    matrix = {str(row_col): {str(col_col): _safe(corr.loc[row_col, col_col]) for col_col in corr.columns} for row_col in corr.columns}
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


def _run_eda(df: pd.DataFrame) -> Dict[str, Any]:
    """Orchestrates the analytical pipeline (no AI engine)."""
    dataset_meta = _compute_dataset_meta(df)
    summary_stats = _compute_summary_stats(df)
    pearson_matrix = _compute_pearson_matrix(df)
    cramers_v_matrix = _compute_cramers_v_matrix(df)

    return {
        "dataset_meta": dataset_meta,
        "metadata": {
            "rows": dataset_meta["total_rows"], "columns": dataset_meta["total_columns"],
            "column_names": [str(c) for c in df.columns.tolist()],
        },
        "summary_stats": summary_stats,
        "pearson_matrix": pearson_matrix,
        "cramers_v_matrix": cramers_v_matrix,
    }


# ── File-parsing helper ───────────────────────────────────────────────────────

def _parse_uploaded_bytes(raw_bytes: bytes, filename: str) -> pd.DataFrame:
    """Parse raw file bytes into a Pandas DataFrame."""
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
            df = pd.DataFrame(payload_json) if isinstance(payload_json, list) else pd.DataFrame([payload_json])
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
async def analyze_data_post(
    file: UploadFile = File(...),
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Upload a file → parse raw DataFrame → save to user's data_raw.pkl → run EDA + health metrics."""
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

        df_raw = _parse_uploaded_bytes(raw_bytes, filename)
        paths = get_user_paths(user_id)

        # Create backup of existing raw file before overwriting
        if paths["raw_pkl"].exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_backup_name = os.path.splitext(os.path.basename(filename))[0].replace(" ", "_")
            backup_path = paths["raw_pkl"].parent / f"data_raw_{safe_backup_name}_{timestamp}.pkl"
            paths["raw_pkl"].rename(backup_path)

        df_raw.to_pickle(paths["raw_pkl"])

        if paths["clean_pkl"].exists():
            paths["clean_pkl"].unlink()

        # Persist active dataset and metadata so other pages can access the data
        df_raw.to_pickle(paths["active_pkl"])
        persist_metadata(
            user_id=user_id,
            file_name=os.path.basename(filename),
            df=df_raw,
            raw_size_bytes=len(raw_bytes),
            original_filename=filename,
        )

        # Track upload history
        _save_upload_history(paths, filename, df_raw, len(raw_bytes))

        payload = _run_eda(df_raw)
        payload["status"] = "success"
        payload["metadata"]["fileName"] = filename
        payload["metadata"]["fileSize"] = _format_file_size(len(raw_bytes))

        sample_n = min(10, len(df_raw))
        preview_records = df_raw.sample(n=sample_n, random_state=42).to_dict(orient="records")
        payload["data_preview"] = _sanitize_preview_records(preview_records)

        return clean_json_payload(payload)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Server error: {exc}") from exc


# ── Upload History Helpers ─────────────────────────────────────────────────────

_UPLOAD_HISTORY_MAX = 10
_BACKUP_MAX = 10


def _save_upload_history(paths: dict, filename: str, df: pd.DataFrame, raw_size: int) -> None:
    """Append an upload entry to the user's history file and cleanup old backups."""
    history_file = paths["raw_pkl"].parent / "upload_history.json"
    history: list[dict] = []
    if history_file.exists():
        try:
            with history_file.open("r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []

    history.append({
        "fileName": filename,
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "fileSize": raw_size,
    })

    # Keep only last N entries
    history = history[-_UPLOAD_HISTORY_MAX:]

    with history_file.open("w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    # Cleanup old backup pickle files (keep only most recent _BACKUP_MAX)
    user_dir = paths["raw_pkl"].parent
    backups = sorted(user_dir.glob("data_raw_*.pkl"))
    while len(backups) > _BACKUP_MAX:
        backups[0].unlink(missing_ok=True)
        backups = backups[1:]


@app.get("/api/data/history")
async def get_upload_history(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    """Return last 10 uploads for the current user."""
    paths = get_user_paths(user_id)
    history_file = paths["raw_pkl"].parent / "upload_history.json"

    if not history_file.exists():
        return {"status": "success", "history": []}

    try:
        with history_file.open("r", encoding="utf-8") as f:
            history = json.load(f)
        return {"status": "success", "history": history}
    except Exception:
        return {"status": "success", "history": []}


class RestoreRequest(BaseModel):
    fileName: str


class DeleteRequest(BaseModel):
    fileName: str


@app.post("/api/data/restore")
async def restore_dataset(
    req: RestoreRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Restore a dataset from history by filename."""
    paths = get_user_paths(user_id)
    history_file = paths["raw_pkl"].parent / "upload_history.json"

    if not history_file.exists():
        raise HTTPException(status_code=404, detail="No upload history found.")

    with history_file.open("r", encoding="utf-8") as f:
        history = json.load(f)

    entry = next((h for h in history if h["fileName"] == req.fileName), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Dataset '{req.fileName}' not found in history.")

    # Find the corresponding backup file (pattern: data_raw_{safe_name}_{timestamp}.pkl)
    safe_name = os.path.splitext(req.fileName)[0].replace(" ", "_")
    user_dir = paths["raw_pkl"].parent
    backup_files = sorted(user_dir.glob(f"data_raw_{safe_name}_*.pkl"))

    if not backup_files:
        raise HTTPException(status_code=404, detail="Backup file not found.")

    backup_file = backup_files[-1]  # Most recent backup

    shutil.copy2(backup_file, paths["raw_pkl"])
    shutil.copy2(backup_file, paths["active_pkl"])

    # Clean the clean_pkl since we're restoring raw data
    if paths["clean_pkl"].exists():
        paths["clean_pkl"].unlink()

    return {
        "status": "success",
        "message": f"Restored '{req.fileName}'",
        "fileName": entry["fileName"],
        "rows": entry["rows"],
        "columns": entry["columns"],
    }


@app.delete("/api/data/history")
async def delete_from_history(
    req: DeleteRequest,
    user_id: str = Depends(require_user_id),
) -> Dict[str, Any]:
    """Delete a dataset from upload history and remove its backup file."""
    paths = get_user_paths(user_id)
    history_file = paths["raw_pkl"].parent / "upload_history.json"

    if not history_file.exists():
        raise HTTPException(status_code=404, detail="No upload history found.")

    with history_file.open("r", encoding="utf-8") as f:
        history = json.load(f)

    entry = next((h for h in history if h["fileName"] == req.fileName), None)
    if not entry:
        raise HTTPException(status_code=404, detail=f"Dataset '{req.fileName}' not found in history.")

    # Check if trying to delete active dataset
    active_meta = {}
    if paths["active_meta"].exists():
        with paths["active_meta"].open("r", encoding="utf-8") as f:
            active_meta = json.load(f)
    
    if active_meta.get("fileName") == req.fileName:
        raise HTTPException(status_code=400, detail="Cannot delete the currently active dataset. Please upload or restore a different dataset first.")

    # Remove from history
    history = [h for h in history if h["fileName"] != req.fileName]
    with history_file.open("w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    # Remove backup files
    safe_name = os.path.splitext(req.fileName)[0].replace(" ", "_")
    user_dir = paths["raw_pkl"].parent
    backup_files = list(user_dir.glob(f"data_raw_{safe_name}_*.pkl"))
    for backup_file in backup_files:
        backup_file.unlink(missing_ok=True)

    return {
        "status": "success",
        "message": f"Deleted '{req.fileName}' from history",
    }


# ── GET /api/data/analyze ─────────────────────────────────────────────────────

@app.get("/api/data/analyze")
async def analyze_data_get(user_id: str = Depends(require_user_id)) -> Dict[str, Any]:
    """
    Cross-page auto-fetch endpoint.
    Used by data-cleaning page to fetch diagnostics on mount.
    Returns: {"status": "success", "dataset_meta": {"total_rows": int, "total_columns": int, "total_duplicated_rows": int, "total_missing_cells": int}}
    """
    paths = get_user_paths(user_id)
    if not paths["raw_pkl"].exists():
        return {"status": "no_data"}

    try:
        df_source = pd.read_pickle(paths["clean_pkl"]) if paths["clean_pkl"].exists() else pd.read_pickle(paths["raw_pkl"])
        payload = _run_eda(df_source)
        payload["status"] = "success"

        sample_n = min(10, len(df_source))
        preview_records = df_source.sample(n=sample_n, random_state=42).to_dict(orient="records")
        payload["data_preview"] = _sanitize_preview_records(preview_records)

        return clean_json_payload(payload)

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Server error: {exc}") from exc

