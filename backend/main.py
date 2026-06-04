from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from backend.categorical_analysis import describe_categorical
from backend.descriptive_stats import describe_numeric
from backend.utils import (
    ACTIVE_DATASET_META_JSON,
    ACTIVE_DATASET_PKL,
    RAW_DIR,
    build_dataset_preview,
    get_categorical_columns,
    get_numeric_columns,
    persist_metadata,
    read_dataframe_and_raw,
    sanitize_obj,
    _format_file_size,
    _load_active_dataset_df,
)
from backend.visualization import (
    generate_bivariate_plot,
    generate_categorical_plot,
    generate_numerical_plot,
)

app = FastAPI(title="Automation EDA API")

FRONTEND_ORIGIN = "http://localhost:3000"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _latest_uploaded_file_path() -> Path | None:
    if not RAW_DIR.exists():
        return None

    candidates = []
    for p in RAW_DIR.iterdir():
        if p.is_file() and p.suffix.lower() in {".csv", ".txt", ".xlsx", ".xls"}:
            candidates.append(p)

    if not candidates:
        return None

    candidates.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    return candidates[0]


def _resolve_dataframe(file: Optional[UploadFile]) -> pd.DataFrame:
    if file is not None and file.filename:
        filename = file.filename
        lower = (filename or "").lower()
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
            original_filename=file.filename,
        )

        return {
            "status": "success",
            "metadata": {
                "fileName": safe_name,
                "rows": int(len(df)),
                "columns": int(len(df.columns)),
                "fileSize": _format_file_size(len(raw)),
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")


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
