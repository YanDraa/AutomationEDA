from __future__ import annotations

import io
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import numpy as np
import pandas as pd
from fastapi import HTTPException, UploadFile

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
RAW_DIR = DATA_DIR / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

ACTIVE_DATASET_PKL = RAW_DIR / "active_dataset.pkl"
ACTIVE_DATASET_META_JSON = RAW_DIR / "active_dataset_meta.json"


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
    if size_bytes <= 0:
        return "0 B"
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.2f} KB"
    return f"{size_bytes / 1024 ** 2:.2f} MB"


def read_dataframe_and_raw(file: UploadFile) -> tuple[pd.DataFrame, bytes]:
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
        try:
            bio.seek(0)
            df = pd.read_csv(bio, sep="\t")
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


def _load_active_dataset_df() -> pd.DataFrame:
    if not ACTIVE_DATASET_PKL.exists():
        raise HTTPException(
            status_code=400,
            detail="No active dataset on server. Please upload data first via /api/upload.",
        )
    return pd.read_pickle(ACTIVE_DATASET_PKL)


def persist_metadata(
    *,
    file_name: str,
    df: pd.DataFrame,
    raw_size_bytes: int,
    original_filename: str | None = None,
) -> None:
    payload = {
        "fileName": file_name,
        "originalFilename": original_filename or file_name,
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "fileSize": _format_file_size(int(raw_size_bytes)),
        "uploadedAt": datetime.now(timezone.utc).isoformat(),
    }
    with ACTIVE_DATASET_META_JSON.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def get_numeric_columns(df: pd.DataFrame) -> list[str]:
    return [str(c) for c in df.select_dtypes(include=["int64", "float64"]).columns]


def get_categorical_columns(df: pd.DataFrame) -> list[str]:
    return [str(c) for c in df.select_dtypes(include=["object", "string"]).columns]


def build_dataset_preview(df: pd.DataFrame, n_head: int = 10) -> Dict[str, Any]:
    columns_info = []
    for col in df.columns:
        dtype = str(df[col].dtype)
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

    sample_rows = df.head(n_head).copy()
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
