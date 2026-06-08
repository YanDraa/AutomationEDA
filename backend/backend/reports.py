from __future__ import annotations

import io
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import pandas as pd

from backend.categorical_analysis import describe_categorical
from backend.descriptive_stats import describe_numeric
from insights import generate_ai_insight

MAX_COLUMN_INSIGHTS = 8


def _table_to_row_dict(result: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    table = result["table"]
    parsed: Dict[str, Dict[str, Any]] = {}
    for i, col_name in enumerate(table["index"]):
        parsed[col_name] = dict(zip(table["columns"], table["data"][i]))
    return parsed


def _load_meta() -> Dict[str, Any]:
    from backend.utils import ACTIVE_DATASET_META_JSON

    if not ACTIVE_DATASET_META_JSON.exists():
        return {}
    with ACTIVE_DATASET_META_JSON.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_stats_bundle(df: pd.DataFrame) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    numeric_stats = _table_to_row_dict(describe_numeric(df))
    categorical_stats = _table_to_row_dict(describe_categorical(df))
    return numeric_stats, categorical_stats


def build_interpretation(df: pd.DataFrame) -> Dict[str, Any]:
    meta = _load_meta()
    numeric_stats, categorical_stats = build_stats_bundle(df)

    overview_stats = {
        "file_name": meta.get("fileName", "dataset"),
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "numeric_columns": len(numeric_stats),
        "categorical_columns": len(categorical_stats),
    }
    overview_insight = generate_ai_insight(overview_stats, "dataset_overview")

    column_insights: List[Dict[str, str]] = []
    for col, stats in list(numeric_stats.items())[:MAX_COLUMN_INSIGHTS]:
        stats_with_col = {**stats, "column": col}
        column_insights.append(
            {
                "column": col,
                "type": "numerical",
                "insight": generate_ai_insight(stats_with_col, "univariate_numerical"),
            }
        )

    for col, stats in list(categorical_stats.items())[:MAX_COLUMN_INSIGHTS]:
        stats_with_col = {**stats, "column": col}
        column_insights.append(
            {
                "column": col,
                "type": "categorical",
                "insight": generate_ai_insight(stats_with_col, "univariate_categorical"),
            }
        )

    high_missing = [
        col
        for col, stats in {**numeric_stats, **categorical_stats}.items()
        if float(stats.get("missing_%", 0)) > 10
    ]
    summary_stats = {
        "high_missing_columns": high_missing,
        "numeric_columns": len(numeric_stats),
        "categorical_columns": len(categorical_stats),
        "rows": int(len(df)),
    }
    summary_insight = generate_ai_insight(summary_stats, "dataset_summary")

    return {
        "overview": {
            "stats": overview_stats,
            "insight": overview_insight,
        },
        "column_insights": column_insights,
        "summary": {
            "stats": summary_stats,
            "insight": summary_insight,
        },
    }


def build_full_report(df: pd.DataFrame) -> Dict[str, Any]:
    meta = _load_meta()
    numeric_stats, categorical_stats = build_stats_bundle(df)
    interpretation = build_interpretation(df)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "fileName": meta.get("fileName", ""),
            "rows": meta.get("rows", int(len(df))),
            "columns": meta.get("columns", int(len(df.columns))),
            "fileSize": meta.get("fileSize", ""),
            "uploadedAt": meta.get("uploadedAt", ""),
        },
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "interpretation": interpretation,
    }


def dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    buffer = io.StringIO()
    df.to_csv(buffer, index=False)
    return buffer.getvalue().encode("utf-8-sig")


def dataframe_to_xlsx_bytes(
    df: pd.DataFrame,
    numeric_stats: Dict[str, Dict[str, Any]],
    categorical_stats: Dict[str, Dict[str, Any]],
) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="Data", index=False)
        if numeric_stats:
            pd.DataFrame(numeric_stats).T.to_excel(writer, sheet_name="Numeric Stats")
        if categorical_stats:
            pd.DataFrame(categorical_stats).T.to_excel(writer, sheet_name="Categorical Stats")
    buffer.seek(0)
    return buffer.read()


def _strip_markdown(text: str) -> str:
    return text.replace("**", "").replace("*", "").strip()


def report_to_pdf_bytes(report: Dict[str, Any]) -> bytes:
    from fpdf import FPDF

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)

    dataset = report.get("dataset", {})
    pdf.set_font("Helvetica", style="B", size=16)
    pdf.cell(0, 10, "Automation EDA Report", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, f"Dataset: {dataset.get('fileName', '-')}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(
        0,
        8,
        f"Rows: {dataset.get('rows', '-')} | Columns: {dataset.get('columns', '-')}",
        new_x="LMARGIN",
        new_y="NEXT",
    )
    pdf.cell(0, 8, f"Generated: {report.get('generated_at', '-')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    interpretation = report.get("interpretation", {})
    overview = interpretation.get("overview", {})
    if overview.get("insight"):
        pdf.set_font("Helvetica", style="B", size=13)
        pdf.cell(0, 8, "Ringkasan Dataset", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        pdf.multi_cell(0, 6, _strip_markdown(str(overview["insight"])))
        pdf.ln(2)

    column_insights = interpretation.get("column_insights", [])
    if column_insights:
        pdf.set_font("Helvetica", style="B", size=13)
        pdf.cell(0, 8, "Interpretasi per Kolom", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        for item in column_insights:
            title = f"{item.get('column', '-')} ({item.get('type', '-')})"
            pdf.set_font("Helvetica", style="B", size=10)
            pdf.cell(0, 6, title, new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", size=10)
            pdf.multi_cell(0, 6, _strip_markdown(str(item.get("insight", ""))))
            pdf.ln(1)

    summary = interpretation.get("summary", {})
    if summary.get("insight"):
        pdf.set_font("Helvetica", style="B", size=13)
        pdf.cell(0, 8, "Kesimpulan", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", size=10)
        pdf.multi_cell(0, 6, _strip_markdown(str(summary["insight"])))

    output = pdf.output()
    if isinstance(output, str):
        return output.encode("latin-1")
    return bytes(output)
