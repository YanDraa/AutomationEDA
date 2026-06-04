from __future__ import annotations

from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
import scipy.stats as scipy_stats

from backend.utils import sanitize_obj, sanitize_value


def _manual_covariance(x: pd.Series, y: pd.Series) -> float:
    x_arr = x.to_numpy(dtype=float)
    y_arr = y.to_numpy(dtype=float)
    n = len(x_arr)
    if n < 2:
        return 0.0
    mean_x = x_arr.mean()
    mean_y = y_arr.mean()
    return float(np.sum((x_arr - mean_x) * (y_arr - mean_y)) / (n - 1))


def _manual_pearson(x: pd.Series, y: pd.Series) -> float:
    x_arr = x.to_numpy(dtype=float)
    y_arr = y.to_numpy(dtype=float)
    n = len(x_arr)
    if n < 2:
        return 0.0
    mean_x = x_arr.mean()
    mean_y = y_arr.mean()
    numerator = float(np.sum((x_arr - mean_x) * (y_arr - mean_y)))
    std_x = float((np.sum((x_arr - mean_x) ** 2) / (n - 1)) ** 0.5)
    std_y = float((np.sum((y_arr - mean_y) ** 2) / (n - 1)) ** 0.5)
    if std_x == 0 or std_y == 0:
        return 0.0
    return numerator / ((n - 1) * std_x * std_y)


def _manual_cramers_v(x: pd.Series, y: pd.Series) -> float:
    table = pd.crosstab(x.fillna("NA"), y.fillna("NA"))
    chi2 = float(scipy_stats.chi2_contingency(table)[0])
    n = float(table.values.sum())
    r, k = table.shape
    denom = n * (min(r, k) - 1)
    if denom == 0:
        return 0.0
    return float(np.sqrt(chi2 / denom))


def association_matrix(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    num_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
    cat_cols = df.select_dtypes(include=["object", "string"]).columns.tolist()

    cov_mat = pd.DataFrame(np.zeros((len(num_cols), len(num_cols))), index=num_cols, columns=num_cols)
    for i, c1 in enumerate(num_cols):
        for j, c2 in enumerate(num_cols):
            valid = df[[c1, c2]].dropna()
            if valid.empty:
                cov_mat.iloc[i, j] = 0.0
            else:
                cov_mat.iloc[i, j] = round(_manual_covariance(valid[c1], valid[c2]), 4)

    pearson_mat = pd.DataFrame(np.zeros((len(num_cols), len(num_cols))), index=num_cols, columns=num_cols)
    for i, c1 in enumerate(num_cols):
        for j, c2 in enumerate(num_cols):
            valid = df[[c1, c2]].dropna()
            if valid.empty:
                pearson_mat.iloc[i, j] = 0.0
            else:
                pearson_mat.iloc[i, j] = round(_manual_pearson(valid[c1], valid[c2]), 4)

    cramers_mat = pd.DataFrame(np.eye(len(cat_cols)), index=cat_cols, columns=cat_cols)
    for i, c1 in enumerate(cat_cols):
        for j in range(i + 1, len(cat_cols)):
            v = round(_manual_cramers_v(df[c1], df[cat_cols[j]]), 4)
            cramers_mat.iloc[i, j] = v
            cramers_mat.iloc[j, i] = v

    return cov_mat, pearson_mat, cramers_mat


def describe_categorical(df: pd.DataFrame) -> Dict[str, Any]:
    cat_cols = df.select_dtypes(include=["object", "string"]).columns
    results: Dict[str, Dict[str, Any]] = {}

    for col in cat_cols:
        series = df[col]
        n_total = len(series)
        n_missing = int(series.isna().sum())
        clean = series.dropna()
        n_valid = len(clean)
        n_unique = int(clean.nunique())

        mode_series = clean.mode()
        mode_val = mode_series.iloc[0] if not mode_series.empty else "N/A"
        mode_freq = int((clean == mode_val).sum()) if n_valid else 0
        mode_pct = round((mode_freq / n_valid) * 100, 2) if n_valid > 0 else 0.0
        pct_missing = round((n_missing / n_total) * 100, 2) if n_total else 0.0

        results[col] = {
            "count": int(n_valid),
            "missing": int(n_missing),
            "missing_%": pct_missing,
            "unique": n_unique,
            "mode": sanitize_value(mode_val),
            "mode_freq": mode_freq,
            "mode_%": mode_pct,
        }

    return {"table": sanitize_obj(pd.DataFrame(results).T)}
