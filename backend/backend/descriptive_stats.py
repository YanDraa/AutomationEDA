from __future__ import annotations

from typing import Any, Dict

import numpy as np
import pandas as pd
import scipy.stats as scipy_stats

from backend.utils import sanitize_obj


def describe_numeric(df: pd.DataFrame) -> Dict[str, Any]:
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns
    results: Dict[str, Dict[str, Any]] = {}

    for col in num_cols:
        series = df[col].dropna()
        n_total = len(df[col])
        n_valid = len(series)
        n_missing = n_total - n_valid
        pct_missing = (n_missing / n_total * 100) if n_total else 0.0

        mean_val = series.mean()
        median_val = series.median()
        mode_series = series.mode()
        mode_val = mode_series.iloc[0] if not mode_series.empty else np.nan
        std_val = series.std(ddof=1)
        var_val = series.var(ddof=1)
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        skew_val = series.skew()
        kurt_val = series.kurt()

        is_normal = "Not Normal"
        if len(series) >= 3:
            sample = series.sample(min(len(series), 5000), random_state=42)
            try:
                _, p_sw = scipy_stats.shapiro(sample)
                is_normal = "Normal" if p_sw >= 0.05 else "Not Normal"
            except Exception:
                is_normal = "Not Normal"

        n_outlier = 0
        if len(series) >= 1:
            lower = q1 - 1.5 * iqr
            upper = q3 + 1.5 * iqr
            n_outlier = int(((series < lower) | (series > upper)).sum())

        results[col] = {
            "count": int(n_valid),
            "missing": int(n_missing),
            "missing_%": round(float(pct_missing), 2),
            "mean": round(float(mean_val), 4) if pd.notna(mean_val) else None,
            "median": round(float(median_val), 4) if pd.notna(median_val) else None,
            "mode": round(float(mode_val), 4) if pd.notna(mode_val) else None,
            "std": round(float(std_val), 4) if pd.notna(std_val) else None,
            "variance": round(float(var_val), 4) if pd.notna(var_val) else None,
            "min": round(float(series.min()), 4) if len(series) else None,
            "Q1 (25%)": round(float(q1), 4) if pd.notna(q1) else None,
            "Q3 (75%)": round(float(q3), 4) if pd.notna(q3) else None,
            "max": round(float(series.max()), 4) if len(series) else None,
            "IQR": round(float(iqr), 4) if pd.notna(iqr) else None,
            "skewness": round(float(skew_val), 4) if pd.notna(skew_val) else None,
            "kurtosis": round(float(kurt_val), 4) if pd.notna(kurt_val) else None,
            "distribution": is_normal,
            "n_outliers": int(n_outlier),
        }

    return {"table": sanitize_obj(pd.DataFrame(results).T)}
