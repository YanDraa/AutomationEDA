from __future__ import annotations

import io
import json
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

import pandas as pd
import numpy as np
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from jinja2 import Template

from backend.categorical_analysis import describe_categorical
from backend.descriptive_stats import describe_numeric
from insights import generate_ai_insight, generate_intelligent_insights

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


def compile_report_data(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Computes all advanced statistics, performs physical domain anomaly scan,
    and returns a structured data payload containing journal-style narratives.
    """
    meta = _load_meta()
    
    # Dimensions & cells
    total_rows = len(df)
    total_columns = len(df.columns)
    total_cells = total_rows * total_columns
    
    # Missing cells
    total_missing_cells = int(df.isna().sum().sum())
    global_missing_pct = (total_missing_cells / total_cells * 100.0) if total_cells > 0 else 0.0

    # Anomaly scan & Row-level Integrity auditing
    anomalies = []
    compromised_row_mask = df.isna().any(axis=1)  # start with rows containing any missing value
    
    for col in df.columns:
        col_lower = col.lower()
        if pd.api.types.is_numeric_dtype(df[col]):
            if "salary" in col_lower:
                salary_anomaly_mask = df[col] < 0
                neg_count = int(salary_anomaly_mask.sum())
                if neg_count > 0:
                    compromised_row_mask |= salary_anomaly_mask
                    anomalies.append({
                        "variable": col,
                        "anomaly_type": f"Negative Salary Value ({neg_count} baris)",
                        "threat": "Nilai negatif pada gaji (salary) secara fisik tidak valid dan merusak analisis kesejahteraan pegawai.",
                        "recommendation": "Gunakan imputasi dengan nilai median gaji, atau lakukan eliminasi baris abnormal."
                    })
            elif "experience" in col_lower:
                exp_anomaly_mask = df[col] < 0
                neg_count = int(exp_anomaly_mask.sum())
                if neg_count > 0:
                    compromised_row_mask |= exp_anomaly_mask
                    anomalies.append({
                        "variable": col,
                        "anomaly_type": f"Negative Experience Value ({neg_count} baris)",
                        "threat": "Masa kerja atau pengalaman bernilai negatif tidak memiliki makna logis.",
                        "recommendation": "Imputasi ke nilai nol atau nilai rata-rata masa kerja positif."
                    })
            elif "attendance" in col_lower:
                att_anomaly_mask = df[col] > 100
                pct_count = int(att_anomaly_mask.sum())
                if pct_count > 0:
                    compromised_row_mask |= att_anomaly_mask
                    anomalies.append({
                        "variable": col,
                        "anomaly_type": f"Attendance > 100% ({pct_count} baris)",
                        "threat": "Rasio kehadiran melebihi kapasitas maksimum teoritis 100%.",
                        "recommendation": "Lakukan pembatasan (capping) nilai pada 100% atau audit log absensi."
                    })

    compromised_rows_count = int(compromised_row_mask.sum())
    integrity_score = (1.0 - (compromised_rows_count / total_rows)) * 100.0 if total_rows > 0 else 100.0

    # Table 3.1: Numeric stats
    numeric_stats = {}
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        series = df[col].dropna()
        if len(series) == 0:
            continue
        mean_val = float(series.mean())
        median_val = float(series.median())
        std_val = float(series.std())
        var_val = float(series.var())
        skew_val = float(series.skew()) if len(series) > 2 else 0.0
        kurt_val = float(series.kurt()) if len(series) > 3 else 0.0
        
        normality_status = "Normal" if abs(skew_val) <= 0.5 else "Tidak Normal"
        
        q1 = float(series.quantile(0.25))
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        outliers_count = int(((series < lower_bound) | (series > upper_bound)).sum())
        
        numeric_stats[col] = {
            "mean": mean_val,
            "median": median_val,
            "std": std_val,
            "variance": var_val,
            "skewness": skew_val,
            "kurtosis": kurt_val,
            "normality": normality_status,
            "outliers_count": outliers_count
        }

    # Table 3.2: Categorical stats
    categorical_stats = {}
    cat_cols = df.select_dtypes(include=["object", "category", "string", "bool"]).columns
    for col in cat_cols:
        series = df[col]
        total_count = len(series)
        missing_count = int(series.isna().sum())
        missing_pct = (missing_count / total_count * 100.0) if total_count > 0 else 0.0
        valid_series = series.dropna()
        valid_count = len(valid_series)
        
        unique_categories = int(valid_series.nunique())
        
        if valid_count > 0:
            mode_series = valid_series.mode()
            mode_val = str(mode_series.iloc[0]) if len(mode_series) > 0 else "N/A"
            mode_freq = int((valid_series == mode_val).sum()) if mode_val != "N/A" else 0
            mode_pct = (mode_freq / valid_count * 100.0) if valid_count > 0 else 0.0
        else:
            mode_val = "N/A"
            mode_freq = 0
            mode_pct = 0.0
            
        categorical_stats[col] = {
            "count": total_count,
            "missing_count": missing_count,
            "missing_pct": missing_pct,
            "unique_categories": unique_categories,
            "mode": mode_val,
            "mode_freq": mode_freq,
            "mode_pct": mode_pct
        }

    # Dispersion Prose
    dispersion_insight = ""
    if numeric_stats:
        max_disp_col = max(numeric_stats.keys(), key=lambda k: numeric_stats[k]["std"])
        max_disp_val = numeric_stats[max_disp_col]["std"]
        dispersion_insight = (
            f"Analisis dispersi data menunjukkan bahwa variabel <strong>{max_disp_col}</strong> memiliki standar deviasi "
            f"tertinggi sebesar <strong>{max_disp_val:.4f}</strong>. Hal ini mencerminkan sebaran data yang lebar dengan tingkat "
            f"variabilitas observasi yang tinggi di sekitar nilai rata-rata sampel."
        )
    else:
        dispersion_insight = "Analisis tingkat dispersi tidak dapat disimpulkan karena tidak ditemukannya kolom berjenis data numerik."

    # Skewness Prose
    skewed_cols = []
    for col, stats in numeric_stats.items():
        skew_val = stats["skewness"]
        if abs(skew_val) > 0.5:
            skewed_cols.append((col, skew_val))
    
    if skewed_cols:
        skewed_details = ", ".join([f"<strong>{col}</strong> (skewness = <strong>{val:.4f}</strong>)" for col, val in skewed_cols])
        skewness_narrative = (
            f"Berdasarkan pengujian bentuk sebaran data, variabel-variabel berikut terdeteksi memiliki nilai skewness "
            f"absolut melampaui batas teoretis 0.5 untuk sebaran normal, yaitu: {skewed_details}. Oleh karena itu, variabel tersebut "
            f"diklasifikasikan secara formal sebagai variabel berdistribusi <strong>Tidak Normal</strong>. Nilai skewness yang tinggi "
            f"menunjukkan asimetri sebaran data akibat konsentrasi frekuensi pada rentang nilai tertentu atau keberadaan pencilan ekstrim."
        )
    else:
        skewness_narrative = (
            "Hasil uji bentuk distribusi menunjukkan bahwa seluruh variabel numerik memiliki koefisien skewness absolut di bawah 0.5. "
            "Hal ini mengindikasikan bahwa sebaran data cenderung simetris dan memenuhi asumsi distribusi normal."
        )

    # Categorical Stats Narrative
    categorical_narrative = ""
    if categorical_stats:
        max_cat_col = max(categorical_stats.keys(), key=lambda k: categorical_stats[k]["unique_categories"])
        max_cat_uniq = categorical_stats[max_cat_col]["unique_categories"]
        
        mode_parts = []
        for col, stats in list(categorical_stats.items())[:3]:
            mode_parts.append(f"variabel <strong>{col}</strong> dengan modus <strong>'{stats['mode']}'</strong> ({stats['mode_pct']:.2f}%)")
        mode_desc = ", ".join(mode_parts)
        
        categorical_narrative = (
            f"Pada variabel kategorikal, sebaran kategori menunjukkan bahwa variabel <strong>{max_cat_col}</strong> "
            f"mempunyai jumlah kelas unik terbanyak, yaitu <strong>{max_cat_uniq}</strong> kategori. Distribusi frekuensi modus "
            f"tercatat dominan pada {mode_desc}. Hal ini mengindikasikan struktur konsentrasi kategori yang bervariasi di dalam dataset."
        )
    else:
        categorical_narrative = "Analisis deskriptif variabel kategorikal tidak dapat dilakukan karena tidak ada data kategorikal."

    # Correlation Prose
    correlation_insight = ""
    numeric_df = df.select_dtypes(include=[np.number])
    pairs = []
    top_col1, top_col2, top_r, top_abs_r = None, None, 0.0, 0.0
    strength_label, direction = "", ""
    if len(numeric_df.columns) >= 2:
        corr_matrix = numeric_df.corr(method="pearson")
        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                col1 = corr_matrix.columns[i]
                col2 = corr_matrix.columns[j]
                r_val = corr_matrix.iloc[i, j]
                if pd.notna(r_val):
                    pairs.append((col1, col2, r_val, abs(r_val)))
        if pairs:
            pairs.sort(key=lambda x: x[3], reverse=True)
            top_col1, top_col2, top_r, top_abs_r = pairs[0]
            
            if top_abs_r < 0.3:
                strength_label = "Korelasi Lemah"
            elif top_abs_r <= 0.5:
                strength_label = "Korelasi Moderat"
            else:
                strength_label = "Korelasi Kuat"
                
            direction = "positif" if top_r > 0 else "negatif"
            correlation_insight = (
                f"Korelasi linear tertinggi terdeteksi antara variabel <strong>{top_col1}</strong> dan <strong>{top_col2}</strong> "
                f"dengan nilai r = <strong>{top_r:.4f}</strong>. Berdasarkan kerangka acuan statistik, tingkat hubungan "
                f"linear ini diklasifikasikan sebagai <strong>{strength_label}</strong> dengan arah kecenderungan <strong>{direction}</strong>."
            )
        else:
            correlation_insight = "Hasil komputasi menunjukkan tidak adanya pasangan variabel numerik dengan korelasi linear yang valid."
    else:
        correlation_insight = "Jumlah variabel numerik kurang dari batas minimum (dua variabel) untuk menjalankan komputasi korelasi Pearson."

    # Strategic Verdict Summary
    has_errors = (len(anomalies) > 0) or (total_missing_cells > 0)
    if has_errors:
        verdict_status = "BUTUH INTERVENSI"
        verdict_class = "error"
        verdict_desc = "STATUS DATASET: BUTUH INTERVENSI (Tidak layak masuk fase predictive modelling sebelum dibersihkan)"
        verdict_conclusion = (
            "menunjukkan adanya masalah kualitas struktural. Ditemukannya sel kosong (missing data) atau ketidaksesuaian logis "
            "domain fisik mengharuskan dilakukannya proses intervensi pembersihan data secara komprehensif sebelum dataset layak digunakan "
            "untuk estimasi statistik formal maupun permodelan prediktif lanjutan."
        )
    else:
        verdict_status = "SIAP"
        verdict_class = "success"
        verdict_desc = "STATUS DATASET: SIAP (Layak untuk analisis lanjutan)"
        verdict_conclusion = (
            "menunjukkan konsistensi logis yang tinggi dan bersih dari anomali struktural maupun kehilangan sel data. Oleh karena itu, "
            "seluruh variabel dinyatakan siap dan layak untuk diikutsertakan dalam permodelan statistik, inferensi teoritis, maupun estimasi analitik lanjutan."
        )

    # ABSTRAK Generator
    abstrak_text = (
        f"Penelitian ini melakukan audit komputasional terhadap dataset yang memiliki {total_rows} observasi dan {total_columns} variabel. "
        f"Analisis sistematis mendeteksi tingkat kehilangan sel (missing cells) sebesar {global_missing_pct:.2f}% secara global, "
        f"dengan skor integritas data keseluruhan berada di tingkat {integrity_score:.2f}%. Berdasarkan kriteria kelayakan akademis, "
        f"dataset disimpulkan berada dalam status kelayakan: {verdict_status}. "
        f"Hasil evaluasi audit ini menjadi landasan keputusan metodologis bagi kelayakan model prediktif yang akan dibangun selanjutnya."
    )

    # 2-Paragraph Cohesive Narrative Conclusion
    best_corr_prose = ""
    if len(numeric_df.columns) >= 2 and pairs:
        best_corr_prose = (
            f"Hubungan linear terkuat terdeteksi antara variabel <strong>{top_col1}</strong> dan <strong>{top_col2}</strong> "
            f"dengan nilai r = <strong>{top_r:.4f}</strong>. Hubungan linear ini diklasifikasikan sebagai korelasi dengan kekuatan "
            f"<strong>{strength_label.lower()}</strong> berarah <strong>{direction}</strong>."
        )
    else:
        best_corr_prose = "Tidak ditemukan pasangan variabel numerik dengan korelasi linear yang kuat untuk disimpulkan secara statistik."

    conclusion_paragraph_1 = (
        f"Sebagai kesimpulan akhir dari audit komputasional, dataset yang dievaluasi memiliki tingkat integritas data keseluruhan sebesar "
        f"<strong>{integrity_score:.2f}%</strong> dengan persentase kehilangan sel data (missing cells) secara global mencapai "
        f"<strong>{global_missing_pct:.2f}%</strong>. {best_corr_prose} Pengenalan dini atas parameter linearitas ini "
        f"membantu peneliti merumuskan spesifikasi model yang akurat dan mencegah terjadinya bias spesifikasi."
    )
    
    if verdict_status == "BUTUH INTERVENSI":
        conclusion_paragraph_2 = (
            f"Dengan mempertimbangkan status dataset yaitu <strong>'{verdict_status}'</strong>, maka dataset ini direkomendasikan untuk tidak "
            f"digunakan secara langsung dalam analisis statistika inferensial sebelum melalui proses intervensi pembersihan data yang tepat. "
            f"Langkah pembersihan seperti imputasi data hilang menggunakan median, eliminasi baris duplikat, dan capping outlier harus "
            f"dilakukan terlebih dahulu. Implementasi pre-processing ini bertujuan menjaga keabsahan model prediktif dan memastikan luaran "
            f"analisis bebas dari distorsi data."
        )
    else:
        conclusion_paragraph_2 = (
            f"Memperhatikan status kelayakan dataset yang tergolong <strong>'{verdict_status}'</strong>, dataset ini dinyatakan sepenuhnya layak "
            f"dan siap untuk diikutsertakan ke dalam permodelan statistik, inferensi teoritis, maupun estimasi analitik tingkat lanjut. "
            f"Kebersihan data dari anomali logika fisik serta ketiadaan kehilangan sel data (missing data) memberikan kepastian "
            f"bahwa model prediktif yang diuji tidak akan terdistorsi oleh gangguan noise data abnormal."
        )

    return {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "dataset": {
            "fileName": meta.get("fileName", "Dataset"),
            "originalFilename": meta.get("originalFilename", meta.get("fileName", "Dataset")),
            "rows": total_rows,
            "columns": total_columns,
            "fileSize": meta.get("fileSize", "-"),
            "uploadedAt": meta.get("uploadedAt", "-"),
        },
        "health_metrics": {
            "total_rows": total_rows,
            "total_columns": total_columns,
            "global_missing_pct": round(global_missing_pct, 2),
            "integrity_score": round(integrity_score, 2),
            "compromised_rows": compromised_rows_count
        },
        "anomalies": anomalies,
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "dispersion_insight": dispersion_insight,
        "skewness_narrative": skewness_narrative,
        "categorical_narrative": categorical_narrative,
        "correlation_insight": correlation_insight,
        "verdict_status": verdict_status,
        "verdict_class": verdict_class,
        "verdict_desc": verdict_desc,
        "verdict_conclusion": verdict_conclusion,
        "abstrak": abstrak_text,
        "conclusion_paragraph_1": conclusion_paragraph_1,
        "conclusion_paragraph_2": conclusion_paragraph_2
    }


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
    legacy_numeric, legacy_categorical = build_stats_bundle(df)
    legacy_interpretation = build_interpretation(df)
    compiled = compile_report_data(df)
    return {
        **compiled,
        "numeric_stats": legacy_numeric,
        "categorical_stats": legacy_categorical,
        "interpretation": legacy_interpretation,
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


def _generate_html_jinja(report_data: Dict[str, Any], included_sections: list) -> bytes:
    html_template = """<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Laporan Praktikum: Automation Exploratory Data Analysis (EDA)</title>
    <style>
        body { 
            font-family: 'Times New Roman', Times, serif; 
            color: #111111; 
            background-color: #ffffff; 
            margin: 0; 
            padding: 50px; 
            line-height: 1.6;
            font-size: 11pt;
            text-align: justify;
        }
        .container { 
            max-width: 800px; 
            margin: auto; 
            background: #ffffff; 
        }
        
        /* Academic Header Layout */
        .academic-title { 
            font-size: 24pt; 
            font-weight: bold; 
            color: #0f172a; 
            text-align: center; 
            margin-bottom: 5px;
            font-family: 'Times New Roman', Times, serif;
        }
        .academic-subtitle {
            font-size: 13pt;
            font-style: italic;
            text-align: center;
            margin-bottom: 25px;
            color: #334155;
        }
        .meta-grid {
            display: table;
            width: 100%;
            margin-bottom: 30px;
            border-bottom: 1px solid #111111;
            padding-bottom: 15px;
            font-size: 10pt;
        }
        .meta-row {
            display: table-row;
        }
        .meta-col {
            display: table-cell;
            padding: 4px 0;
            width: 50%;
        }

        /* Abstract Section styling */
        .abstrak-container {
            margin: 0 40px 30px 40px;
            font-size: 10pt;
            text-align: justify;
            line-height: 1.6;
            font-family: 'Times New Roman', Times, serif;
        }
        .abstrak-header {
            font-weight: bold;
            text-align: center;
            font-size: 11pt;
            margin-bottom: 5px;
        }
        .abstrak-body {
            font-style: italic;
            text-indent: 0;
            margin: 0;
        }

        /* Section Headings */
        h2 { 
            font-size: 13pt; 
            font-weight: bold; 
            color: #000000; 
            text-transform: uppercase; 
            margin-top: 35px; 
            margin-bottom: 15px; 
            text-align: left;
            border-bottom: none;
            padding-bottom: 0;
        }
        h3 { 
            font-size: 11pt; 
            font-weight: bold; 
            color: #000000; 
            margin-top: 20px; 
            margin-bottom: 8px;
            text-align: left;
        }
        p { 
            margin-top: 0; 
            margin-bottom: 15px; 
            text-indent: 30px; /* First line indent for academic papers */
            font-size: 11pt;
            line-height: 1.6;
            text-align: justify;
            font-family: 'Times New Roman', Times, serif;
        }
        p.no-indent {
            text-indent: 0;
        }
        
        /* Math formulas block styling */
        .math-block {
            text-align: center;
            margin: 15px auto;
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            display: block;
            font-style: italic;
        }

        /* Journal Style Academic Tables */
        table.academic-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
            font-size: 9.5pt;
            page-break-inside: avoid;
            text-align: center;
        }
        table.academic-table th, table.academic-table td { 
            padding: 6px 8px; 
            border-top: 1px solid #111111; 
            border-bottom: 1px solid #111111; 
            border-left: none;
            border-right: none;
        }
        table.academic-table th { 
            font-weight: bold; 
            color: #000000; 
        }
        table.academic-table thead tr:first-child th {
            border-top: 2px solid #111111;
        }
        table.academic-table tbody tr:last-child td {
            border-bottom: 2px solid #111111;
        }
        
        /* Strategic Verdict Block in Academic Prose style */
        .academic-verdict-box {
            border: 1px solid #111111;
            padding: 15px;
            margin: 25px 0;
            font-size: 10.5pt;
            background-color: #fafafa;
            page-break-inside: avoid;
        }

        .footer { 
            margin-top: 60px; 
            font-size: 9pt; 
            color: #666666; 
            text-align: center; 
            border-top: 1px dashed #cccccc;
            padding-top: 15px;
        }

        /* Print Page Layout */
        @page { 
            size: A4; 
            margin: 25mm 20mm; 
        }
        @media print {
            body {
                padding: 0;
            }
            .container {
                width: 100%;
            }
            .page-break-before {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="academic-title">LAPORAN PRAKTIKUM: Automation Exploratory Data Analysis (EDA)</div>
        <div class="academic-subtitle">Course Code: SD-1306 - Data Science Programming</div>
        
        <div class="meta-grid">
            <div class="meta-row">
                <div class="meta-col"><strong>Dosen Pengampu:</strong> Bakti Siregar, M.Sc.</div>
                <div class="meta-col"><strong>Waktu Audit:</strong> {{ report.generated_at }}</div>
            </div>
            <div class="meta-row">
                <div class="meta-col"><strong>Nama Dataset:</strong> {{ report.dataset.fileName }}</div>
                <div class="meta-col"><strong>Dimensi Data:</strong> {{ report.health_metrics.total_rows }} baris &times; {{ report.health_metrics.total_columns }} kolom</div>
            </div>
        </div>

        <!-- ABSTRAK -->
        <div class="abstrak-container">
            <div class="abstrak-header">ABSTRAK</div>
            <p class="abstrak-body">{{ report.abstrak }}</p>
        </div>

        <!-- I. PENDAHULUAN -->
        <h2>I. PENDAHULUAN</h2>
        <p>Analisis Data Eksploratif (Exploratory Data Analysis atau EDA) merupakan instrumen metodologi fundamental dalam alur kerja sains data komputasional kontemporer. Sebelum melangkah ke estimasi parameter model atau penerapan algoritma pembelajaran mesin yang kompleks, pemahaman mendalam tentang kualitas intrinsik, distribusi statistik, dan kebersihan data mentah mutlak diperlukan. Mengabaikan tahapan audit data awal ini sering kali memicu bias statistik yang fatal, estimasi parameter model yang meleset, dan penurunan daya generalisasi model (overfitting).</p>
        
        <p>Prosedur pre-processing data dan pemindaian anomali bertindak sebagai filter integritas struktural pertama yang sangat penting untuk melindungi model statistik dari bias "garbage in, garbage out". Melalui pembersihan pencilan secara teoretis dan penanganan data hilang (missing values), peneliti dapat meminimalkan distorsi informasi dalam dataset. Laporan ini mendokumentasikan hasil audit logis-kalkulatif berbasis aturan baku untuk mengevaluasi kelayakan dataset demi memitigasi deviasi estimasi pada fase pemodelan prediktif lanjutan.</p>

        <!-- II. METODOLOGI PENELITIAN -->
        <h2>II. METODOLOGI PENELITIAN</h2>
        <p>Pengujian data hilang secara sistematis dievaluasi berdasarkan persentase sel kosong (missing cells) dari keseluruhan observasi. Deteksi pencilan (outliers) menggunakan pendekatan kuartil melalui metode Interquartile Range (IQR). Perhitungan jangkauan antarkuartil didefinisikan secara matematis sebagai:</p>
        <span class="math-block">IQR = Q<sub>3</sub> - Q<sub>1</sub></span>
        <p class="no-indent">di mana Q<sub>3</sub> mewakili nilai persentil ke-75 dan Q<sub>1</sub> mewakili nilai persentil ke-25 dari distribusi sampel. Batas interval sebaran logis ditentukan sebagai [Batas Bawah, Batas Atas] dengan persamaan:</p>
        <span class="math-block">Batas Bawah = Q<sub>1</sub> - 1.5 &times; IQR</span>
        <span class="math-block">Batas Atas = Q<sub>3</sub> + 1.5 &times; IQR</span>
        <p class="no-indent">Setiap nilai observasi yang berada di luar batas interval di atas diidentifikasi sebagai pencilan matematis.</p>
        
        <p>Aproksimasi normalitas sebaran variabel dihitung menggunakan koefisien skewness (kemiringan). Kriteria sebaran normal yang diadopsi adalah sebaran yang memenuhi persyaratan nilai skewness absolut (|skewness|) kurang dari atau sama dengan 0.5. Variabel yang memiliki |skewness| di atas nilai ambang batas tersebut diklasifikasikan sebagai variabel berdistribusi tidak normal. Kekuatan hubungan linear antar variabel numerik ditentukan oleh nilai absolut koefisien korelasi Pearson (r), dengan klasifikasi batas kekuatan korelasi lemah pada |r| &lt; 0.3, korelasi moderat pada 0.3 &le; |r| &le; 0.5, dan korelasi kuat pada |r| &gt; 0.5.</p>

        <!-- III. HASIL DAN PEMBAHASAN -->
        <h2 class="page-break-before">III. HASIL DAN PEMBAHASAN</h2>
        
        {% if "missing_data" in included_sections or "outliers" in included_sections %}
        <h3>A. Audit Validitas Data dan Anomali Fisik</h3>
        {% if report.anomalies %}
        <p>Pemeriksaan otomatis pada domain logika fisik dilakukan untuk menyaring data input yang tidak konsisten secara riil. Rincian variabel yang gagal melewati audit kepatuhan fisik dijabarkan pada Tabel I.</p>
        
        <table class="academic-table">
            <thead>
                <tr>
                    <th style="width: 25%;">Nama Variabel</th>
                    <th style="width: 25%;">Tipe Anomali</th>
                    <th style="width: 25%;">Operational Threat</th>
                    <th style="width: 25%;">Rekomendasi Pembersihan</th>
                </tr>
            </thead>
            <tbody>
                {% for anomaly in report.anomalies %}
                <tr>
                    <td><strong>{{ anomaly.variable }}</strong></td>
                    <td>{{ anomaly.anomaly_type }}</td>
                    <td>{{ anomaly.threat }}</td>
                    <td>{{ anomaly.recommendation }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
        {% else %}
        <p>Berdasarkan hasil audit komputasional terhadap batasan logika fisik, dataset menunjukkan tingkat integritas yang sempurna sebesar 100%. Tidak ditemukan adanya anomali data (seperti nilai negatif pada domain curah hujan atau aliran air), sehingga seluruh variabel dinyatakan valid secara fisik dan aman untuk digunakan pada analisis prediktif lanjutan.</p>
        {% endif %}
        {% endif %}

        {% if "statistical_profile" in included_sections %}
        <h3>B. Matriks Statistik Deskriptif Variabel</h3>
        <p>Profil distribusi data deskriptif dianalisis secara terpisah untuk kolom bertipe numerik dan kategorikal untuk menangkap karakteristik struktural sampel.</p>
        
        <div style="font-weight: bold; font-style: italic; margin-top: 15px; font-size: 9.5pt; text-align: center;">
            Tabel 3.1. Parameter Distribusi dan Statistik Deskriptif Variabel Numerik
        </div>
        <table class="academic-table">
            <thead>
                <tr>
                    <th>Kolom</th>
                    <th>Mean</th>
                    <th>Median</th>
                    <th>Std Dev</th>
                    <th>Variance</th>
                    <th>Skewness</th>
                    <th>Kurtosis</th>
                    <th>Normalitas</th>
                    <th>Outliers</th>
                </tr>
            </thead>
            <tbody>
                {% if report.numeric_stats %}
                    {% for col, stats in report.numeric_stats.items() %}
                    <tr>
                        <td><strong>{{ col }}</strong></td>
                        <td>{{ "%.4f"|format(stats.mean) }}</td>
                        <td>{{ "%.4f"|format(stats.median) }}</td>
                        <td>{{ "%.4f"|format(stats.std) }}</td>
                        <td>{{ "%.4f"|format(stats.variance) }}</td>
                        <td>{{ "%.4f"|format(stats.skewness) }}</td>
                        <td>{{ "%.4f"|format(stats.kurtosis) }}</td>
                        <td>{{ stats.normality }}</td>
                        <td>{{ stats.outliers_count }}</td>
                    </tr>
                    {% endfor %}
                {% else %}
                    <tr>
                        <td colspan="9" style="font-style: italic;">Tidak ditemukan variabel numerik untuk ditampilkan.</td>
                    </tr>
                {% endif %}
            </tbody>
        </table>
        
        <p>{{ report.dispersion_insight }}</p>
        <p>{{ report.skewness_narrative }}</p>

        <div style="font-weight: bold; font-style: italic; margin-top: 25px; font-size: 9.5pt; text-align: center;">
            Tabel 3.2. Parameter Distribusi dan Statistik Deskriptif Variabel Kategorikal
        </div>
        <table class="academic-table">
            <thead>
                <tr>
                    <th>Kolom</th>
                    <th>Count</th>
                    <th>Missing</th>
                    <th>Missing %</th>
                    <th>Kategori</th>
                    <th>Modus</th>
                    <th>Freq Mode</th>
                    <th>Mode %</th>
                </tr>
            </thead>
            <tbody>
                {% if report.categorical_stats %}
                    {% for col, stats in report.categorical_stats.items() %}
                    <tr>
                        <td><strong>{{ col }}</strong></td>
                        <td>{{ stats.count }}</td>
                        <td>{{ stats.missing_count }}</td>
                        <td>{{ "%.2f"|format(stats.missing_pct) }}%</td>
                        <td>{{ stats.unique_categories }}</td>
                        <td>{{ stats.mode }}</td>
                        <td>{{ stats.mode_freq }}</td>
                        <td>{{ "%.2f"|format(stats.mode_pct) }}%</td>
                    </tr>
                    {% endfor %}
                {% else %}
                    <tr>
                        <td colspan="8" style="font-style: italic;">Tidak ditemukan variabel kategorikal untuk ditampilkan.</td>
                    </tr>
                {% endif %}
            </tbody>
        </table>
        
        <p>{{ report.categorical_narrative }}</p>
        {% endif %}

        {% if "executive_insights" in included_sections %}
        <h3>C. Pembahasan Akademis Temuan Utama</h3>
        <p>{{ report.correlation_insight }} Kekuatan korelasi linear ini menjadi salah satu penentu penting dalam seleksi fitur sebelum pemodelan statistik formal dilakukan.</p>
        {% endif %}

        <!-- IV. KESIMPULAN -->
        <h2>IV. KESIMPULAN</h2>
        <p>{{ report.conclusion_paragraph_1 }}</p>
        <p>{{ report.conclusion_paragraph_2 }}</p>
        
        <div class="academic-verdict-box">
            <strong>REKOMENDASI KELAYAKAN STRATEGIS DATASET:</strong><br/>
            {{ report.verdict_desc }}
        </div>

        <div class="footer">
            Program Studi Sains Data | Jurnal Audit Komputasional Otomatis | SD-1306
        </div>
    </div>
</body>
</html>
"""
    template = Template(html_template)
    html_content = template.render(report=report_data, included_sections=included_sections)
    return html_content.encode("utf-8")


def _generate_pdf_reportlab(report_data: Dict[str, Any], included_sections: list) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4, 
        rightMargin=20*mm, 
        leftMargin=20*mm, 
        topMargin=25*mm, 
        bottomMargin=25*mm
    )
    
    styles = getSampleStyleSheet()
    
    # Times New Roman Academic styles
    title_style = ParagraphStyle(
        name='JournalTitle', 
        parent=styles['Heading1'], 
        fontName='Times-Bold',
        fontSize=18, 
        leading=22,
        alignment=1, # Center
        spaceAfter=10, 
        textColor=colors.black
    )
    
    subtitle_style = ParagraphStyle(
        name='JournalSub',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=11,
        leading=14,
        alignment=1,
        spaceAfter=15,
        textColor=colors.HexColor("#334155")
    )
    
    meta_style = ParagraphStyle(
        name='JournalMeta',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )
    
    abstrak_header_style = ParagraphStyle(
        name='JournalAbstrakHeader',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10.5,
        leading=14,
        alignment=1,
        spaceAfter=4,
        textColor=colors.black
    )
    
    abstrak_style = ParagraphStyle(
        name='JournalAbstrak',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=9.5,
        leading=13.5,
        alignment=4, # Justified
        spaceAfter=20,
        leftIndent=25,
        rightIndent=25,
        textColor=colors.black
    )
    
    heading_style = ParagraphStyle(
        name='JournalHeading', 
        parent=styles['Heading2'], 
        fontName='Times-Bold',
        fontSize=12, 
        leading=15,
        spaceBefore=18, 
        spaceAfter=8, 
        keepWithNext=True,
        textColor=colors.black
    )
    
    sub_heading_style = ParagraphStyle(
        name='JournalSubHeading',
        parent=styles['Heading3'],
        fontName='Times-Bold',
        fontSize=10,
        leading=13,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
        textColor=colors.black
    )
    
    body_style = ParagraphStyle(
        name='JournalBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=11,
        leading=17.6,
        spaceAfter=8,
        alignment=4, # Justified
        firstLineIndent=20, # Academic paragraph indentation
        textColor=colors.black
    )
    
    body_no_indent = ParagraphStyle(
        name='JournalBodyNoIndent',
        parent=body_style,
        firstLineIndent=0
    )
    
    formula_style = ParagraphStyle(
        name='JournalFormula',
        parent=styles['Normal'],
        fontName='Times-Italic',
        fontSize=10,
        leading=13,
        alignment=1, # Center
        spaceBefore=5,
        spaceAfter=5,
        textColor=colors.black
    )

    verdict_title_style = ParagraphStyle(
        name='JournalVerdictTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.black
    )
    
    verdict_body_style = ParagraphStyle(
        name='JournalVerdictBody',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9.5,
        leading=13,
        textColor=colors.black
    )

    elements = []
    
    # Title & Subtitle
    elements.append(Paragraph("LAPORAN PRAKTIKUM: Automation Exploratory Data Analysis (EDA)", title_style))
    elements.append(Paragraph("Course Code: SD-1306 - Data Science Programming", subtitle_style))
    
    # Metadata Block
    meta_data = [
        [
            Paragraph(f"<b>Dosen Pengampu:</b> Bakti Siregar, M.Sc.", meta_style),
            Paragraph(f"<b>Waktu Audit:</b> {report_data['generated_at']}", meta_style)
        ],
        [
            Paragraph(f"<b>Nama Dataset:</b> {report_data['dataset']['fileName']}", meta_style),
            Paragraph(f"<b>Dimensi Data:</b> {report_data['health_metrics']['total_rows']} baris x {report_data['health_metrics']['total_columns']} kolom", meta_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[85*mm, 85*mm])
    meta_table.setStyle(TableStyle([
        ('LINEBELOW', (0, 1), (-1, 1), 0.75, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))
    
    # ABSTRAK
    elements.append(Paragraph("ABSTRAK", abstrak_header_style))
    elements.append(Paragraph(report_data["abstrak"], abstrak_style))

    # I. PENDAHULUAN
    elements.append(Paragraph("I. PENDAHULUAN", heading_style))
    elements.append(Paragraph(
        "Analisis Data Eksploratif (Exploratory Data Analysis atau EDA) merupakan instrumen metodologi fundamental dalam alur kerja sains data komputasional kontemporer. "
        "Sebelum melangkah ke estimasi parameter model atau penerapan algoritma pembelajaran mesin yang kompleks, pemahaman mendalam tentang kualitas intrinsik, "
        "distribusi statistik, dan kebersihan data mentah mutlak diperlukan. Mengabaikan tahapan audit data awal ini sering kali memicu bias statistik yang fatal, "
        "estimasi parameter model yang meleset, dan penurunan daya generalisasi model (overfitting).", body_style
    ))
    elements.append(Paragraph(
        "Prosedur pre-processing data dan pemindaian anomali bertindak sebagai filter integritas struktural pertama yang sangat penting untuk melindungi model statistik dari bias \"garbage in, garbage out\". "
        "Melalui pembersihan pencilan secara teoretis dan penanganan data hilang (missing values), peneliti dapat meminimalkan distorsi informasi dalam dataset. "
        "Laporan ini mendokumentasikan hasil audit logis-kalkulatif berbasis aturan baku untuk mengevaluasi kelayakan dataset demi memitigasi deviasi estimasi pada "
        "fase pemodelan prediktif lanjutan.", body_style
    ))

    # II. METODOLOGI PENELITIAN
    elements.append(Paragraph("II. METODOLOGI PENELITIAN", heading_style))
    elements.append(Paragraph(
        "Pengujian data hilang secara sistematis dievaluasi berdasarkan persentase sel kosong (missing cells) dari keseluruhan observasi. "
        "Deteksi pencilan (outliers) menggunakan pendekatan kuartil melalui metode Interquartile Range (IQR). Perhitungan jangkauan antarkuartil "
        "didefinisikan secara matematis sebagai:", body_style
    ))
    elements.append(Paragraph("IQR = Q3 - Q1", formula_style))
    elements.append(Paragraph("di mana Q3 mewakili nilai persentil ke-75 dan Q1 mewakili nilai persentil ke-25 dari distribusi sampel. Batas interval sebaran logis ditentukan sebagai [Batas Bawah, Batas Atas] dengan persamaan:", body_no_indent))
    elements.append(Paragraph("Batas Bawah = Q1 - 1.5 * IQR", formula_style))
    elements.append(Paragraph("Batas Atas = Q3 + 1.5 * IQR", formula_style))
    
    elements.append(Paragraph(
        "Setiap nilai observasi yang berada di luar batas interval di atas diidentifikasi sebagai pencilan matematis.", body_no_indent
    ))
    
    elements.append(Paragraph(
        "Aproksimasi normalitas sebaran variabel dihitung menggunakan koefisien skewness (kemiringan). Kriteria sebaran normal yang diadopsi adalah sebaran yang memenuhi persyaratan nilai skewness absolut (|skewness|) kurang dari atau sama dengan 0.5. Variabel yang memiliki |skewness| di atas nilai ambang batas tersebut diklasifikasikan sebagai variabel berdistribusi tidak normal. Kekuatan hubungan linear antar variabel numerik ditentukan oleh nilai absolut koefisien korelasi Pearson (r), dengan klasifikasi batas kekuatan korelasi lemah pada |r| < 0.3, korelasi moderat pada 0.3 <= |r| <= 0.5, dan korelasi kuat pada |r| > 0.5.", body_style
    ))

    # III. HASIL DAN PEMBAHASAN
    elements.append(PageBreak())
    elements.append(Paragraph("III. HASIL DAN PEMBAHASAN", heading_style))
    
    # Section A
    if "missing_data" in included_sections or "outliers" in included_sections:
        elements.append(Paragraph("A. Audit Validitas Data dan Anomali Fisik", sub_heading_style))
        if report_data["anomalies"]:
            elements.append(Paragraph(
                "Pemeriksaan otomatis pada domain logika fisik dilakukan untuk menyaring data input yang tidak konsisten secara riil. Rincian variabel yang gagal melewati audit kepatuhan fisik dijabarkan pada Tabel I.", body_style
            ))
            
            table_data = [[
                Paragraph("<b>Nama Variabel</b>", meta_style),
                Paragraph("<b>Tipe Anomali</b>", meta_style),
                Paragraph("<b>Operational Threat</b>", meta_style),
                Paragraph("<b>Rekomendasi Pembersihan</b>", meta_style)
            ]]
            for anomaly in report_data["anomalies"]:
                table_data.append([
                    Paragraph(f"<b>{anomaly['variable']}</b>", meta_style),
                    Paragraph(anomaly['anomaly_type'], meta_style),
                    Paragraph(anomaly['threat'], meta_style),
                    Paragraph(anomaly['recommendation'], meta_style)
                ])
            
            t = Table(table_data, colWidths=[35*mm, 45*mm, 50*mm, 40*mm])
            t.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.black),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(t)
            elements.append(Spacer(1, 10))
        else:
            elements.append(Paragraph(
                "Berdasarkan hasil audit komputasional terhadap batasan logika fisik, dataset menunjukkan tingkat integritas yang sempurna sebesar 100%. Tidak ditemukan adanya anomali data (seperti nilai negatif pada domain curah hujan atau aliran air), sehingga seluruh variabel dinyatakan valid secara fisik dan aman untuk digunakan pada analisis prediktif lanjutan.", body_style
            ))
            elements.append(Spacer(1, 10))

    # Section B
    if "statistical_profile" in included_sections:
        elements.append(Paragraph("B. Matriks Statistik Deskriptif Variabel", sub_heading_style))
        elements.append(Paragraph(
            "Profil distribusi data deskriptif dianalisis secara terpisah untuk kolom bertipe numerik dan kategorikal untuk menangkap karakteristik struktural sampel.", body_style
        ))
        
        # Table 3.1 (Numerical)
        elements.append(Paragraph("Tabel 3.1. Parameter Distribusi dan Statistik Deskriptif Variabel Numerik", formula_style))
        num_header = [
            Paragraph("<b>Kolom</b>", meta_style),
            Paragraph("<b>Mean</b>", meta_style),
            Paragraph("<b>Median</b>", meta_style),
            Paragraph("<b>Std Dev</b>", meta_style),
            Paragraph("<b>Variance</b>", meta_style),
            Paragraph("<b>Skew</b>", meta_style),
            Paragraph("<b>Kurt</b>", meta_style),
            Paragraph("<b>Norm</b>", meta_style),
            Paragraph("<b>Out</b>", meta_style)
        ]
        table_num_data = [num_header]
        
        if report_data["numeric_stats"]:
            for col, stats in report_data["numeric_stats"].items():
                table_num_data.append([
                    Paragraph(f"<b>{col}</b>", meta_style),
                    Paragraph(f"{stats['mean']:.4f}", meta_style),
                    Paragraph(f"{stats['median']:.4f}", meta_style),
                    Paragraph(f"{stats['std']:.4f}", meta_style),
                    Paragraph(f"{stats['variance']:.4f}", meta_style),
                    Paragraph(f"{stats['skewness']:.4f}", meta_style),
                    Paragraph(f"{stats['kurtosis']:.4f}", meta_style),
                    Paragraph(stats['normality'], meta_style),
                    Paragraph(str(stats['outliers_count']), meta_style),
                ])
            t_num = Table(table_num_data, colWidths=[30*mm, 17*mm, 17*mm, 17*mm, 17*mm, 17*mm, 17*mm, 23*mm, 15*mm])
            t_num.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
        else:
            table_num_data.append([Paragraph("Tidak ada data numerik.", meta_style)] + [Paragraph("", meta_style)] * 8)
            t_num = Table(table_num_data, colWidths=[170*mm])
            t_num.setStyle(TableStyle([
                ('SPAN', (0, 1), (8, 1)),
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.black),
            ]))
        elements.append(t_num)
        elements.append(Spacer(1, 10))
        
        # Add dynamic numerical narratives below the table
        elements.append(Paragraph(report_data["dispersion_insight"], body_style))
        elements.append(Paragraph(report_data["skewness_narrative"], body_style))
        elements.append(Spacer(1, 12))

        # Table 3.2 (Categorical)
        elements.append(Paragraph("Tabel 3.2. Parameter Distribusi dan Statistik Deskriptif Variabel Categorikal", formula_style))
        cat_header = [
            Paragraph("<b>Kolom</b>", meta_style),
            Paragraph("<b>Count</b>", meta_style),
            Paragraph("<b>Missing</b>", meta_style),
            Paragraph("<b>Miss %</b>", meta_style),
            Paragraph("<b>Kategori</b>", meta_style),
            Paragraph("<b>Modus</b>", meta_style),
            Paragraph("<b>Freq Mode</b>", meta_style),
            Paragraph("<b>Mode %</b>", meta_style)
        ]
        table_cat_data = [cat_header]
        
        if report_data["categorical_stats"]:
            for col, stats in report_data["categorical_stats"].items():
                table_cat_data.append([
                    Paragraph(f"<b>{col}</b>", meta_style),
                    Paragraph(str(stats['count']), meta_style),
                    Paragraph(str(stats['missing_count']), meta_style),
                    Paragraph(f"{stats['missing_pct']:.2f}%", meta_style),
                    Paragraph(str(stats['unique_categories']), meta_style),
                    Paragraph(stats['mode'], meta_style),
                    Paragraph(str(stats['mode_freq']), meta_style),
                    Paragraph(f"{stats['mode_pct']:.2f}%", meta_style),
                ])
            t_cat = Table(table_cat_data, colWidths=[30*mm, 15*mm, 15*mm, 20*mm, 20*mm, 35*mm, 18*mm, 17*mm])
            t_cat.setStyle(TableStyle([
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
        else:
            table_cat_data.append([Paragraph("Tidak ada data kategorikal.", meta_style)] + [Paragraph("", meta_style)] * 7)
            t_cat = Table(table_cat_data, colWidths=[170*mm])
            t_cat.setStyle(TableStyle([
                ('SPAN', (0, 1), (7, 1)),
                ('LINEABOVE', (0, 0), (-1, 0), 1.5, colors.black),
                ('LINEBELOW', (0, -1), (-1, -1), 1.5, colors.black),
            ]))
        elements.append(t_cat)
        elements.append(Spacer(1, 10))
        
        # Add dynamic categorical narrative below the table
        elements.append(Paragraph(report_data["categorical_narrative"], body_style))
        elements.append(Spacer(1, 12))

    # Section C
    if "executive_insights" in included_sections:
        elements.append(Paragraph("C. Pembahasan Akademis Temuan Utama", sub_heading_style))
        elements.append(Paragraph(f"{report_data['correlation_insight']} Kekuatan korelasi linear ini menjadi salah satu penentu penting dalam seleksi fitur sebelum pemodelan statistik formal dilakukan.", body_style))

    # IV. KESIMPULAN
    elements.append(Paragraph("IV. KESIMPULAN", heading_style))
    elements.append(Paragraph(report_data["conclusion_paragraph_1"], body_style))
    elements.append(Paragraph(report_data["conclusion_paragraph_2"], body_style))
    elements.append(Spacer(1, 10))
    
    # Verdict Panel
    verdict_card = [
        [Paragraph("<b>REKOMENDASI KELAYAKAN STRATEGIS DATASET:</b>", verdict_title_style)],
        [Paragraph(report_data["verdict_desc"], verdict_body_style)]
    ]
    vt = Table(verdict_card, colWidths=[170*mm])
    vt.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fafafa")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(vt)

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def report_to_pdf_bytes(report: Dict[str, Any]) -> bytes:
    sections = ["missing_data", "outliers", "statistical_profile", "executive_insights"]
    if "health_metrics" not in report:
        meta = report.get("dataset", {})
        total_rows = meta.get("rows", 0)
        total_cols = meta.get("columns", 0)
        global_missing_pct = 0.0
        
        legacy_numeric = report.get("numeric_stats", {})
        if legacy_numeric:
            missing_pcts = [float(s.get("missing_%", 0)) for s in legacy_numeric.values()]
            if missing_pcts:
                global_missing_pct = sum(missing_pcts) / len(missing_pcts)
                
        report["health_metrics"] = {
            "total_rows": total_rows,
            "total_columns": total_cols,
            "global_missing_pct": round(global_missing_pct, 2),
            "integrity_score": round(100.0 - global_missing_pct, 2),
            "compromised_rows": int(total_rows * (global_missing_pct / 100.0))
        }
    if "anomalies" not in report:
        report["anomalies"] = []
    if "dispersion_insight" not in report:
        report["dispersion_insight"] = "Analisis dispersi sebaran standar deviasi."
    if "correlation_insight" not in report:
        report["correlation_insight"] = "Analisis korelasi linear Pearson."
    if "verdict_status" not in report:
        report["verdict_status"] = "SIAP"
        report["verdict_desc"] = "STATUS DATASET: SIAP (Layak untuk analisis lanjutan)"
        report["verdict_conclusion"] = "menunjukkan konsistensi logis tinggi."
    if "abstrak" not in report:
        report["abstrak"] = "Abstrak—Laporan audit data menyajikan kualitas statistika dari dataset."
        
    return _generate_pdf_reportlab(report, sections)


def generate_eda_report(df: pd.DataFrame, report_format: str, included_sections: list) -> bytes:
    """
    Generate an executive academic journal EDA report,
    outputting as either HTML or PDF based on user selections.
    """
    report_data = compile_report_data(df)
    
    if report_format.lower() == "html":
        return _generate_html_jinja(report_data, included_sections)
    elif report_format.lower() == "pdf":
        return _generate_pdf_reportlab(report_data, included_sections)
    else:
        raise ValueError("Unsupported format. Use 'html' or 'pdf'.")
