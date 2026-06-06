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
    "Kamu adalah Senior Data Analyst yang bertugas memberikan wawasan bisnis (insight) "
    "singkat, tajam, dan mudah dipahami oleh eksekutif berdasarkan ringkasan data statistik "
    "yang diberikan. JANGAN PERNAH mengarang angka di luar data yang disediakan. "
    "Berikan output langsung dalam bentuk poin-poin ringkas menggunakan format Markdown "
    "(maksimal 3-4 poin)."
)

_model: Optional[Any] = None


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


def _fallback_insight(stats_summary: dict, context_type: str) -> str:
    ctx = context_type.lower().strip()
    if "numerical" in ctx:
        return _fallback_numerical(stats_summary)
    if "categorical" in ctx:
        return _fallback_categorical(stats_summary)
    if "bivariate" in ctx:
        return _fallback_bivariate(stats_summary)
    return _fallback_generic(stats_summary)


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
