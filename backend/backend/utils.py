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
CLEAN_DIR = DATA_DIR / "clean"
RAW_DIR.mkdir(parents=True, exist_ok=True)
CLEAN_DIR.mkdir(parents=True, exist_ok=True)

RAW_DATASET_PKL = RAW_DIR / "data_raw.pkl"
CLEAN_DATASET_PKL = CLEAN_DIR / "data_clean.pkl"

ACTIVE_DATASET_PKL = RAW_DIR / "active_dataset.pkl"
ACTIVE_DATASET_META_JSON = RAW_DIR / "active_dataset_meta.json"

# Legacy path before clean/ folder existed.
_LEGACY_CLEAN_DATASET_PKL = RAW_DIR / "data_clean.pkl"


def migrate_legacy_clean_dataset() -> None:
    """Move data_clean.pkl from data/raw/ to data/clean/ if needed."""
    if _LEGACY_CLEAN_DATASET_PKL.exists() and not CLEAN_DATASET_PKL.exists():
        _LEGACY_CLEAN_DATASET_PKL.replace(CLEAN_DATASET_PKL)

SUPPORTED_UPLOAD_EXTENSIONS = (".csv", ".xlsx", ".xls", ".txt", ".json")
_CSV_ENCODINGS = ("utf-8-sig", "utf-8", "latin-1", "cp1252")


def is_supported_upload(filename: str) -> bool:
    lower = (filename or "").lower()
    return any(lower.endswith(ext) for ext in SUPPORTED_UPLOAD_EXTENSIONS)


def cleanup_orphaned_dataset_metadata() -> None:
    """Remove stale metadata when the pickled dataset file is missing."""
    if not ACTIVE_DATASET_PKL.exists() and ACTIVE_DATASET_META_JSON.exists():
        ACTIVE_DATASET_META_JSON.unlink(missing_ok=True)


def _read_csv_robust(bio: io.BytesIO, sep: str = ",") -> pd.DataFrame:
    last_error: Exception | None = None
    for encoding in _CSV_ENCODINGS:
        try:
            bio.seek(0)
            return pd.read_csv(bio, sep=sep, encoding=encoding)
        except Exception as exc:
            last_error = exc
    raise HTTPException(
        status_code=400,
        detail=f"Could not parse delimited file (tried encodings: {', '.join(_CSV_ENCODINGS)}): {last_error}",
    )


def _read_json_dataframe(bio: io.BytesIO) -> pd.DataFrame:
    try:
        bio.seek(0)
        text = bio.read().decode("utf-8-sig")
        payload = json.loads(text)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse JSON: {exc}") from exc

    if isinstance(payload, list):
        if not payload:
            raise HTTPException(status_code=400, detail="JSON array is empty.")
        return pd.DataFrame(payload)

    if isinstance(payload, dict):
        if not payload:
            raise HTTPException(status_code=400, detail="JSON object is empty.")
        if all(isinstance(v, list) for v in payload.values()):
            return pd.DataFrame(payload)
        return pd.DataFrame([payload])

    raise HTTPException(
        status_code=400,
        detail="Unsupported JSON structure. Use an array of objects or a column-oriented object.",
    )


def _read_excel_dataframe(bio: io.BytesIO, filename: str) -> pd.DataFrame:
    engines: list[str | None]
    if filename.endswith(".xlsx"):
        engines = ["openpyxl", None]
    else:
        engines = ["xlrd", None, "openpyxl"]

    last_error: Exception | None = None
    for engine in engines:
        try:
            bio.seek(0)
            if engine is None:
                return pd.read_excel(bio)
            return pd.read_excel(bio, engine=engine)
        except Exception as exc:
            last_error = exc

    raise HTTPException(
        status_code=400,
        detail=f"Could not parse Excel file: {last_error}",
    )


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

    if not is_supported_upload(filename):
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Use {supported}",
        )

    bio = io.BytesIO(raw)

    if filename.endswith(".csv"):
        df = _read_csv_robust(bio, sep=",")

    elif filename.endswith(".txt"):
        df = _read_csv_robust(bio, sep="\t")
        if df.shape[1] == 1:
            df = _read_csv_robust(bio, sep=",")

    elif filename.endswith(".xlsx") or filename.endswith(".xls"):
        df = _read_excel_dataframe(bio, filename)

    elif filename.endswith(".json"):
        df = _read_json_dataframe(bio)

    else:
        supported = ", ".join(SUPPORTED_UPLOAD_EXTENSIONS)
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Use {supported}",
        )

    if df.empty:
        raise HTTPException(status_code=400, detail="File parsed successfully but contains no data rows.")

    if len(df.columns) == 0:
        raise HTTPException(status_code=400, detail="File parsed successfully but contains no columns.")

    return df, raw


def _load_active_dataset_df() -> pd.DataFrame:
    cleanup_orphaned_dataset_metadata()
    if not ACTIVE_DATASET_PKL.exists():
        raise HTTPException(
            status_code=400,
            detail="No active dataset on server. Please upload data first via /api/upload.",
        )
    try:
        return pd.read_pickle(ACTIVE_DATASET_PKL)
    except Exception as exc:
        cleanup_orphaned_dataset_metadata()
        if ACTIVE_DATASET_PKL.exists():
            ACTIVE_DATASET_PKL.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Active dataset is corrupted. Please upload your file again. ({exc})",
        ) from exc


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
