import pandas as pd
import numpy as np
from typing import List, Tuple

def detect_datetime_columns(df: pd.DataFrame) -> List[str]:
    """Return a list of column names that can be parsed as datetime.
    Uses pandas to_datetime with errors='coerce' and checks non‑null results.
    """
    datetime_cols = []
    for col in df.columns:
        try:
            parsed = pd.to_datetime(df[col], errors='coerce')
            if parsed.notna().any():
                datetime_cols.append(col)
        except Exception:
            continue
    return datetime_cols

def compute_trend_line(df: pd.DataFrame, date_col: str, value_col: str) -> Tuple[List[int], List[float]]:
    """Return timestamps (ms) and fitted linear trend values.
    Simple linear regression using numpy.polyfit on numeric dates.
    """
    temp = df[[date_col, value_col]].dropna()
    temp[date_col] = pd.to_datetime(temp[date_col])
    x = temp[date_col].astype('int64') // 10**6  # milliseconds
    y = pd.to_numeric(temp[value_col], errors='coerce')
    mask = ~np.isnan(y)
    x, y = x[mask], y[mask]
    if len(x) < 2:
        return [], []
    coeffs = np.polyfit(x, y, 1)
    trend_y = np.polyval(coeffs, x)
    return list(x), list(trend_y)

def moving_average(series: pd.Series, window: int) -> pd.Series:
    """Calculate simple moving average.
    Returns series aligned to the right (standard pandas behavior).
    """
    if window <= 0:
        raise ValueError("window must be > 0")
    return series.rolling(window=window, min_periods=1).mean()

def rolling_mean(series: pd.Series, window: int) -> pd.Series:
    """Alias for moving_average – kept for API compatibility."""
    return moving_average(series, window)

def forecast_series(series: pd.Series, horizon: int) -> List[float]:
    """Very naive forecast: repeat the last observed value for `horizon` steps.
    Placeholder for more sophisticated models.
    """
    if horizon <= 0:
        return []
    last = series.dropna().iloc[-1] if not series.dropna().empty else np.nan
    return [float(last)] * horizon
