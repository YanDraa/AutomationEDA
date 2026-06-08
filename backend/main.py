from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from pydantic import BaseModel

import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from backend.categorical_analysis import (
    _manual_cramers_v,
    _manual_pearson,
    describe_categorical,
)
from backend.descriptive_stats import describe_numeric
from insights import generate_ai_insight, get_chart_recommendation
from backend.utils import (
    ACTIVE_DATASET_META_JSON,
    ACTIVE_DATASET_PKL,
    RAW_DIR,
    SUPPORTED_UPLOAD_EXTENSIONS,
    build_dataset_preview,
    cleanup_orphaned_dataset_metadata,
    get_categorical_columns,
    get_numeric_columns,
    is_supported_upload,
    persist_metadata,
    read_dataframe_and_raw,
    sanitize_obj,
    _format_file_size,
    _load_active_dataset_df,
)
from backend.reports import (
    build_full_report,
    build_interpretation,
    build_stats_bundle,
    dataframe_to_csv_bytes,
    dataframe_to_xlsx_bytes,
    report_to_pdf_bytes,
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


@app.on_event("startup")
async def _on_startup() -> None:
    cleanup_orphaned_dataset_metadata()


@app.get("/")
async def health_check() -> Dict[str, Any]:
    cleanup_orphaned_dataset_metadata()
    return {
        "status": "ok",
        "service": "Automation EDA API",
        "dataset_active": ACTIVE_DATASET_PKL.exists(),
        "supported_uploads": list(SUPPORTED_UPLOAD_EXTENSIONS),
    }


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
        raise ValueError(
            f"Kolom '{col}' tidak ditemukan atau bukan tipe {col_type}."
        )

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
        top_combos = (
            pair.groupby([x_col, y_col]).size().sort_values(ascending=False).head(3)
        )
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
            "mean": {
                str(k): round(float(v), 4)
                for k, v in stats_df["mean"].items()
            },
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
        lower = (filename or "").lower()
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
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Use {supported}",
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


# Request schemas for AI Insights
class TextInsightRequest(BaseModel):
    stats_summary: Dict[str, Any]
    context_type: str


class ChartRecommendationRequest(BaseModel):
    column_name: str


@app.post("/api/insights/text")
async def get_text_insight(payload: TextInsightRequest) -> Dict[str, Any]:
    try:
        insight = generate_ai_insight(payload.stats_summary, payload.context_type)
        return {
            "status": "success",
            "insight": insight
        }
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
                detail=f"Kolom '{col}' tidak ditemukan dalam dataset aktif."
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
            sample_values=sample_values
        )
        
        return {
            "status": "success",
            "column_name": col,
            "data_type": data_type,
            "unique_count": unique_count,
            "sample_values": sample_values,
            "recommendation": recommendation
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {e}")
