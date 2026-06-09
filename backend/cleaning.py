from __future__ import annotations

from typing import Any

import pandas as pd


def clean_dataset(df: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Clean dataset by:

    1) Dropping duplicate rows.
    2) Dropping any row containing missing values (NaNs/Nulls).
    3) Standardizing column names.

    Returns:
        (cleaned_df, summary)
    """

    original_rows = int(len(df))

    # Step 1: drop duplicates (and keep counts)
    df_no_dupes = df.drop_duplicates()
    duplicates_removed = int(original_rows - len(df_no_dupes))

    # Step 2: drop rows with any missing values (NaNs/Nulls)
    # including common string placeholders.
    df_work = df_no_dupes.copy()
    df_work = df_work.replace(
        {
            "": pd.NA,
            "null": pd.NA,
            "none": pd.NA,
            "nan": pd.NA,
            "NaN": pd.NA,
            "NULL": pd.NA,
            "NONE": pd.NA,
            "NAN": pd.NA,
        }
    )

    df_no_missing = df_work.dropna(how="any")
    rows_deleted_missing_data = int(len(df_no_dupes) - len(df_no_missing))



    # Step 3: Standardize column names
    columns_standardized: list[str] = []
    standardized_names: list[str] = []
    for c in df_no_missing.columns:
        c_str = str(c)
        new_name = c_str.strip().lower().replace(" ", "_")
        standardized_names.append(new_name)
        columns_standardized.append(new_name)

    df_cleaned = df_no_missing.copy()
    df_cleaned.columns = standardized_names

    cleaned_rows = int(len(df_cleaned))

    summary = {
        "original_rows": original_rows,
        "cleaned_rows": cleaned_rows,
        "duplicates_removed": duplicates_removed,
        "rows_deleted_missing_data": rows_deleted_missing_data,
        "columns_standardized": columns_standardized,
    }

    return df_cleaned, summary

