from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(_ENV_PATH)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

SYSTEM_PROMPT = (
    "Kamu Senior Data Analyst. Berikan wawasan bisnis singkat, tajam, maksimal 3-4 poin markdown "
    "dari ringkasan statistik yang diberikan. Jangan mengarang angka di luar data."
)

SYSTEM_CHART_PROMPT = (
    "Kamu adalah AI Chart Recommender dan Senior Data Analyst. Tugasmu adalah memberikan rekomendasi grafik terbaik "
    "untuk memvisualisasikan variabel berdasarkan prinsip dasar statistika:\n"
    "- Line Chart: Hanya untuk data Kontinu/Time-series (Tren dari waktu ke waktu).\n"
    "- Bar Chart: Untuk data Kategorikal/Diskret untuk membandingkan antar grup.\n"
    "- Histogram: Untuk data Numerik Kontinu untuk melihat sebaran/distribusi frekuensi.\n"
    "- Pie Chart: Hanya untuk Kategorikal dengan jumlah unik sedikit (< 5) untuk melihat proporsi/persentase dari total 100%.\n"
    "- Box Plot: Untuk melihat sebaran data numerik kontinu, nilai kuartil, dan deteksi outlier berdasarkan kelompok tertentu.\n"
    "- Scatter Plot: Untuk melihat korelasi/hubungan antara dua data numerik kontinu.\n\n"
    "Wajib mengembalikan rekomendasi dalam format JSON murni (TANPA pembungkus markdown seperti ```json atau ```) dengan struktur:\n"
    "{\n"
    "  \"recommended_chart\": \"Line Chart/Bar Chart/Histogram/Pie Chart/Box Plot/Scatter Plot\",\n"
    "  \"reason\": \"Alasan ilmiah dalam Bahasa Indonesia berdasarkan tipe datanya.\"\n"
    "}"
)

_model: Optional[Any] = None
_chart_model: Optional[Any] = None


def _init_gemini_model() -> Optional[Any]:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        return genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
    except Exception:
        return None


def _get_model() -> Optional[Any]:
    global _model
    if _model is None:
        _model = _init_gemini_model()
    return _model


def _init_gemini_chart_model() -> Optional[Any]:
    if not GEMINI_API_KEY:
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=GEMINI_API_KEY)
        return genai.GenerativeModel(
            "gemini-1.5-flash",
            system_instruction=SYSTEM_CHART_PROMPT,
        )
    except Exception:
        return None


def _get_chart_model() -> Optional[Any]:
    global _chart_model
    if _chart_model is None:
        _chart_model = _init_gemini_chart_model()
    return _chart_model


def generate_ai_insight(stats_summary: dict, context_type: str) -> str:
    model = _get_model()
    if model is not None:
        try:
            user_prompt = (
                f"Jenis analisis: {context_type}\n\n"
                f"Ringkasan statistik (JSON):\n"
                f"{json.dumps(stats_summary, ensure_ascii=False, indent=2)}\n\n"
                "Berikan insight bisnis berdasarkan data di atas."
            )
            response = model.generate_content(user_prompt)
            text = (response.text or "").strip()
            if text:
                return text
        except Exception:
            pass
    return _fallback_insight(stats_summary, context_type)


def get_chart_recommendation(
    column_name: str,
    data_type: str,
    unique_count: int,
    sample_values: list
) -> dict:
    """
    Kirim metadata kolom ke Gemini. Paksa Gemini mengembalikan format JSON murni
    tanpa hiasan markdown (```json) dengan struktur:
    {
      "recommended_chart": "Nama Grafik (Line Chart/Bar Chart/Histogram/Pie Chart/Box Plot/Scatter Plot)",
      "reason": "Alasan ilmiah dalam Bahasa Indonesia berdasarkan tipe datanya."
    }
    Jika gagal, gunakan logika fallback berbasis aturan statistika.
    """
    model = _get_chart_model()
    if model is not None:
        try:
            prompt = (
                f"Rekomendasikan grafik untuk kolom berikut:\n"
                f"- Nama Kolom: {column_name}\n"
                f"- Tipe Data: {data_type}\n"
                f"- Jumlah Nilai Unik: {unique_count}\n"
                f"- Sampel Nilai: {sample_values}\n"
            )
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            res_text = (response.text or "").strip()
            
            # Clean markdown code blocks if present
            if res_text.startswith("```"):
                lines = res_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                res_text = "\n".join(lines).strip()
                
            data = json.loads(res_text)
            if "recommended_chart" in data and "reason" in data:
                return {
                    "recommended_chart": data["recommended_chart"],
                    "reason": data["reason"]
                }
        except Exception:
            pass
            
    # LOGIKA FALLBACK (Rule-based) sesuai prinsip dasar statistika
    dt_lower = data_type.lower()
    is_temporal = any(x in dt_lower for x in ["date", "time", "temporal", "datetime"]) or \
                  any(x in column_name.lower() for x in ["date", "time", "tahun", "bulan", "hari", "tanggal", "year", "month", "day", "hour", "minute", "second", "tgl", "created_at", "updated_at"])
    
    if is_temporal:
        return {
            "recommended_chart": "Line Chart",
            "reason": f"Kolom '{column_name}' diidentifikasi sebagai data temporal/deret waktu (time-series). Line Chart paling cocok digunakan untuk menunjukkan tren atau perubahan dari waktu ke waktu secara berkelanjutan."
        }
    
    if "categorical" in dt_lower or "object" in dt_lower or "string" in dt_lower or "str" in dt_lower or "bool" in dt_lower:
        if unique_count < 5:
            return {
                "recommended_chart": "Pie Chart",
                "reason": f"Kolom '{column_name}' adalah data kategorikal dengan jumlah kategori unik yang sedikit ({unique_count} < 5). Pie Chart sangat ideal untuk menunjukkan proporsi atau kontribusi persentase setiap kategori terhadap keseluruhan (100%)."
            }
        else:
            return {
                "recommended_chart": "Bar Chart",
                "reason": f"Kolom '{column_name}' adalah data kategorikal/diskret dengan {unique_count} kategori unik. Bar Chart adalah opsi terbaik untuk membandingkan frekuensi, jumlah, atau ukuran antar grup yang berbeda."
            }
            
    # Default numeric and continuous
    return {
        "recommended_chart": "Histogram",
        "reason": f"Kolom '{column_name}' diidentifikasi sebagai data numerik kontinu. Histogram sangat tepat untuk memvisualisasikan bentuk sebaran data, frekuensi kemunculan nilai, serta kepadatan distribusi data tersebut."
    }


def _fallback_insight(stats_summary: dict, context_type: str) -> str:
    ctx = context_type.lower().strip()
    if "overview" in ctx or ctx == "dataset_overview":
        return _fallback_overview(stats_summary)
    if "summary" in ctx or ctx == "dataset_summary":
        return _fallback_summary(stats_summary)
    if "numerical" in ctx:
        return _fallback_numerical(stats_summary)
    if "categorical" in ctx:
        return _fallback_categorical(stats_summary)
    if "bivariate" in ctx:
        return _fallback_bivariate(stats_summary)
    return _fallback_generic(stats_summary)


def _fallback_overview(s: Dict[str, Any]) -> str:
    file_name = s.get("file_name", "dataset")
    rows = s.get("rows", 0)
    cols = s.get("columns", 0)
    num_cols = s.get("numeric_columns", 0)
    cat_cols = s.get("categorical_columns", 0)
    return (
        f"- Dataset **{file_name}** memiliki **{rows:,}** baris dan **{cols}** kolom.\n"
        f"- Terdapat **{num_cols}** kolom numerikal dan **{cat_cols}** kolom kategorikal.\n"
        f"- Gunakan visualisasi dan statistik deskriptif untuk eksplorasi lebih lanjut.\n"
        f"- Perhatikan kolom dengan missing value tinggi sebelum analisis lanjutan."
    )


def _fallback_summary(s: Dict[str, Any]) -> str:
    high_missing = s.get("high_missing_columns", [])
    points = [
        f"- Dataset siap dianalisis dengan **{s.get('numeric_columns', 0)}** kolom numerikal "
        f"dan **{s.get('categorical_columns', 0)}** kolom kategorikal."
    ]
    if high_missing:
        points.append(
            f"- Kolom dengan missing >10%: **{', '.join(high_missing[:5])}** "
            f"— pertimbangkan pembersihan data."
        )
    else:
        points.append("- Tidak ada kolom dengan missing value di atas 10%.")
    points.append("- Lanjutkan eksplorasi dengan visualisasi bivariat untuk menemukan pola hubungan.")
    return "\n".join(points[:4])


def _fallback_numerical(s: Dict[str, Any]) -> str:
    points: list[str] = []
    col = s.get("column", "variabel numerik")
    count = s.get("count", 0)
    missing = s.get("missing", 0)
    missing_pct = s.get("missing_%", 0.0)

    if missing_pct > 5:
        points.append(
            f"- Kolom **{col}** memiliki **{missing_pct}%** data hilang "
            f"({missing} baris), yang dapat mengurangi reliabilitas analisis."
        )
    elif missing > 0:
        points.append(
            f"- Data hilang pada **{col}** relatif rendah (**{missing_pct}%**, "
            f"{missing} baris) dan masih dalam batas wajar."
        )

    mean = s.get("mean")
    median = s.get("median")
    if mean is not None and median is not None:
        diff_ratio = abs(mean - median) / (abs(median) + 1e-9)
        if diff_ratio > 0.15:
            skew_dir = "kanan (positif)" if mean > median else "kiri (negatif)"
            points.append(
                f"- Rata-rata (**{mean}**) dan median (**{median}**) berbeda cukup jauh, "
                f"mengindikasikan distribusi condong ke **{skew_dir}**."
            )
        else:
            points.append(
                f"- Distribusi relatif simetris: rata-rata **{mean}**, median **{median}**, "
                f"menunjukkan pusat data yang konsisten."
            )

    skew = s.get("skewness")
    if skew is not None and abs(skew) > 0.5:
        level = "sangat" if abs(skew) > 1 else "cukup"
        direction = "positif (ekor kanan)" if skew > 0 else "negatif (ekor kiri)"
        points.append(
            f"- Skewness **{skew}** menunjukkan kemiringan distribusi **{level} {direction}**."
        )

    n_outliers = s.get("n_outliers", 0)
    if n_outliers > 0:
        points.append(
            f"- Terdeteksi **{n_outliers}** outlier (metode IQR) yang berpotensi "
            f"mempengaruhi rata-rata dan perlu ditinjau lebih lanjut."
        )

    distribution = s.get("distribution")
    if distribution and len(points) < 4:
        points.append(
            f"- Uji Shapiro-Wilk mengklasifikasikan distribusi sebagai **{distribution}** "
            f"(berdasarkan sampel hingga 5.000 baris)."
        )

    if len(points) < 3:
        std = s.get("std")
        min_val = s.get("min")
        max_val = s.get("max")
        if std is not None and min_val is not None and max_val is not None:
            points.append(
                f"- Rentang nilai **{min_val}** hingga **{max_val}** dengan "
                f"standar deviasi **{std}** (n={count} observasi valid)."
            )

    if not points:
        return (
            f"- Kolom **{col}** memiliki {count} observasi valid.\n"
            f"- Tidak cukup informasi statistik untuk menghasilkan insight mendalam."
        )
    return "\n".join(points[:4])


def _fallback_categorical(s: Dict[str, Any]) -> str:
    points: list[str] = []
    col = s.get("column", "variabel kategorikal")
    count = s.get("count", 0)
    n_unique = s.get("unique", 0)
    missing_pct = s.get("missing_%", 0.0)
    mode = s.get("mode", "N/A")
    mode_pct = s.get("mode_%", 0.0)
    mode_freq = s.get("mode_freq", 0)

    if missing_pct > 5:
        points.append(
            f"- Kolom **{col}** memiliki **{missing_pct}%** data hilang; "
            f"pertimbangkan imputasi atau eksklusi sebelum analisis lanjutan."
        )

    points.append(
        f"- Terdapat **{n_unique}** kategori unik pada **{count}** observasi valid."
    )

    if mode_pct >= 50:
        points.append(
            f"- Kategori dominan adalah **{mode}** dengan **{mode_pct}%** "
            f"({mode_freq} kasus), menunjukkan konsentrasi respon yang tinggi."
        )
    elif mode_pct >= 30:
        points.append(
            f"- Kategori terbanyak adalah **{mode}** (**{mode_pct}%**, {mode_freq} kasus), "
            f"namun distribusi masih relatif tersebar di {n_unique} kategori."
        )
    else:
        points.append(
            f"- Tidak ada kategori yang sangat dominan; kategori terbanyak **{mode}** "
            f"hanya **{mode_pct}%**, mengindikasikan variasi respon yang luas."
        )

    if n_unique > 20 and len(points) < 4:
        points.append(
            f"- Jumlah kategori (**{n_unique}**) cukup banyak; pertimbangkan "
            f"pengelompokan (grouping) untuk analisis yang lebih actionable."
        )

    return "\n".join(points[:4])


def _fallback_bivariate(s: Dict[str, Any]) -> str:
    points: list[str] = []
    x_col = s.get("x_column", "X")
    y_col = s.get("y_column", "Y")
    n_pairs = s.get("n_valid_pairs", 0)
    measure = s.get("measure", "")

    points.append(
        f"- Analisis hubungan antara **{x_col}** dan **{y_col}** "
        f"berdasarkan **{n_pairs}** pasang data valid."
    )

    if measure == "pearson_correlation":
        r = s.get("pearson_r", 0.0)
        strength = s.get("strength_label", "tidak diketahui")
        direction = s.get("direction", "netral")
        points.append(
            f"- Korelasi Pearson **r = {r}** menunjukkan hubungan **{strength}** "
            f"berarah **{direction}**."
        )
        if abs(r) >= 0.7:
            points.append(
                "- Korelasi kuat ini layak dieksplorasi lebih lanjut untuk "
                "identifikasi pola bisnis atau prediksi."
            )
        elif abs(r) < 0.2:
            points.append(
                "- Hubungan linear antara kedua variabel sangat lemah; "
                "faktor lain mungkin lebih determinan."
            )
    elif measure == "cramers_v":
        v = s.get("cramers_v", 0.0)
        strength = s.get("strength_label", "tidak diketahui")
        points.append(
            f"- Cramér's V **{v}** mengindikasikan asosiasi **{strength}** "
            f"antar kategori kedua variabel."
        )
        if v >= 0.3:
            points.append(
                "- Asosiasi cukup signifikan; periksa kombinasi kategori "
                "yang paling sering muncul bersamaan."
            )
        else:
            points.append(
                "- Asosiasi relatif lemah; kedua variabel kategorikal "
                "cenderung independen satu sama lain."
            )
    elif measure == "numeric_by_category":
        group_stats = s.get("group_stats", {})
        means = group_stats.get("mean", {})
        num_col = s.get("numeric_column", y_col)
        if means:
            sorted_means = sorted(means.items(), key=lambda kv: kv[1], reverse=True)
            top_cat, top_mean = sorted_means[0]
            bot_cat, bot_mean = sorted_means[-1]
            points.append(
                f"- Rata-rata **{num_col}** tertinggi pada kategori "
                f"**{top_cat}** ({top_mean}), terendah pada **{bot_cat}** ({bot_mean})."
            )
            if len(sorted_means) >= 2 and top_mean != bot_mean:
                gap = round(abs(top_mean - bot_mean), 4)
                points.append(
                    f"- Selisih rata-rata antar kategori sebesar **{gap}**, "
                    f"menandakan perbedaan performa/nilai yang perlu ditindaklanjuti."
                )
    else:
        points.append(
            "- Tipe hubungan tidak teridentifikasi; pastikan kedua kolom "
            "memiliki tipe data yang sesuai."
        )

    return "\n".join(points[:4])


def _fallback_generic(s: Dict[str, Any]) -> str:
    keys_preview = ", ".join(list(s.keys())[:5])
    return (
        f"- Ringkasan statistik tersedia untuk variabel terkait ({keys_preview}).\n"
        f"- AI insight tidak tersedia saat ini; gunakan angka di atas sebagai acuan.\n"
        f"- Pertimbangkan visualisasi grafik untuk konteks tambahan."
    )
