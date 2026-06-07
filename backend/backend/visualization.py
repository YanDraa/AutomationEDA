from __future__ import annotations

import numpy as np
import pandas as pd

from backend.categorical_analysis import _manual_pearson


def _require_column(df: pd.DataFrame, col: str) -> None:
    if col not in df.columns:
        raise ValueError(f"Column '{col}' not found in dataset.")


def _numeric_series(df: pd.DataFrame, col: str) -> pd.Series:
    _require_column(df, col)
    series = pd.to_numeric(df[col], errors="coerce").dropna()
    if series.empty:
        raise ValueError(f"Column '{col}' has no valid numeric values.")
    return series


def _categorical_series(df: pd.DataFrame, col: str) -> pd.Series:
    _require_column(df, col)
    series = df[col].astype(str).replace("nan", np.nan).dropna()
    if series.empty:
        raise ValueError(f"Column '{col}' has no valid categorical values.")
    return series


def _base_options(title: str, chart_type: str) -> dict:
    return {
        "chart": {"type": chart_type, "zoomType": "xy"},
        "title": {"text": title},
        "credits": {"enabled": False},
        "accessibility": {"enabled": False},
        "exporting": {"enabled": True},
    }


def generate_numerical_plot(df: pd.DataFrame, col: str, chart_type: str) -> dict:
    chart_type = chart_type.lower().strip()
    series = _numeric_series(df, col)
    values = series.to_numpy(dtype=float)

    if chart_type == "histogram":
        n_bins = min(50, max(10, int(np.sqrt(len(values)))))
        counts, bin_edges = np.histogram(values, bins=n_bins)
        categories = [
            f"{bin_edges[i]:.2f} – {bin_edges[i + 1]:.2f}"
            for i in range(len(bin_edges) - 1)
        ]
        options = _base_options(f"Histogram — {col}", "column")
        options["xAxis"] = {
            "categories": categories,
            "title": {"text": col},
            "crosshair": True,
        }
        options["yAxis"] = {"title": {"text": "Frequency"}}
        options["tooltip"] = {
            "headerFormat": "<b>{point.key}</b><br/>",
            "pointFormat": "Frequency: <b>{point.y}</b>",
        }
        options["plotOptions"] = {
            "column": {
                "borderRadius": 3,
                "dataLabels": {"enabled": False},
            }
        }
        options["series"] = [{"name": "Frequency", "data": counts.tolist()}]
        return options

    if chart_type == "boxplot":
        q1 = float(series.quantile(0.25))
        median = float(series.median())
        q3 = float(series.quantile(0.75))
        iqr = q3 - q1
        lower_whisker = float(series[series >= q1 - 1.5 * iqr].min()) if len(series) else float(series.min())
        upper_whisker = float(series[series <= q3 + 1.5 * iqr].max()) if len(series) else float(series.max())
        min_val = lower_whisker
        max_val = upper_whisker

        options = _base_options(f"Box Plot — {col}", "boxplot")
        options["xAxis"] = {"categories": [col]}
        options["yAxis"] = {"title": {"text": col}}
        options["legend"] = {"enabled": False}
        options["series"] = [
            {
                "name": col,
                "data": [[min_val, q1, median, q3, max_val]],
            }
        ]
        return options

    raise ValueError(
        f"Unsupported chart_type '{chart_type}'. Use: histogram, boxplot."
    )


def generate_categorical_plot(df: pd.DataFrame, col: str, chart_type: str) -> dict:
    chart_type = chart_type.lower().strip()
    series = _categorical_series(df, col)
    counts = series.value_counts().sort_values(ascending=False)
    labels = counts.index.astype(str).tolist()
    values = [int(v) for v in counts.values.tolist()]

    if chart_type in ("barchart", "bar", "bar chart"):
        options = _base_options(f"Bar Chart — {col}", "column")
        options["xAxis"] = {
            "categories": labels,
            "title": {"text": col},
            "crosshair": True,
        }
        options["yAxis"] = {"title": {"text": "Count"}}
        options["plotOptions"] = {
            "column": {
                "borderRadius": 3,
                "colorByPoint": True,
            }
        }
        options["series"] = [{"name": "Count", "data": values}]
        return options

    if chart_type in ("piechart", "pie", "pie chart"):
        pie_data = [{"name": label, "y": val} for label, val in zip(labels, values)]
        options = _base_options(f"Pie Chart — {col}", "pie")
        options["tooltip"] = {"pointFormat": "<b>{point.percentage:.1f}%</b> ({point.y})"}
        options["plotOptions"] = {
            "pie": {
                "allowPointSelect": True,
                "cursor": "pointer",
                "dataLabels": {"enabled": True, "format": "<b>{point.name}</b>: {point.percentage:.1f} %"},
                "showInLegend": True,
            }
        }
        options["series"] = [{"name": col, "colorByPoint": True, "data": pie_data}]
        return options

    raise ValueError(
        f"Unsupported chart_type '{chart_type}'. Use: barchart, piechart."
    )


def generate_bivariate_plot(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    chart_type: str,
) -> dict:
    chart_type = chart_type.lower().strip()
    _require_column(df, x_col)
    _require_column(df, y_col)

    if chart_type in ("scatter", "scatter plot"):
        plot_df = df[[x_col, y_col]].copy()
        plot_df[x_col] = pd.to_numeric(plot_df[x_col], errors="coerce")
        plot_df[y_col] = pd.to_numeric(plot_df[y_col], errors="coerce")
        plot_df = plot_df.dropna()
        if plot_df.empty:
            raise ValueError("No overlapping numeric rows for scatter plot.")

        points = [
            [float(row[x_col]), float(row[y_col])]
            for _, row in plot_df.iterrows()
        ]

        options = _base_options(f"Scatter Plot — {y_col} vs {x_col}", "scatter")
        options["xAxis"] = {"title": {"text": x_col}}
        options["yAxis"] = {"title": {"text": y_col}}
        options["tooltip"] = {
            "headerFormat": "<b>{series.name}</b><br/>",
            "pointFormat": f"{x_col}: <b>{{point.x}}</b><br/>{y_col}: <b>{{point.y}}</b>",
        }
        options["series"] = [
            {
                "name": f"{y_col} vs {x_col}",
                "data": points,
                "marker": {"radius": 4, "symbol": "circle"},
            }
        ]
        return options

    if chart_type in ("linechart", "line", "line chart"):
        plot_df = df[[x_col, y_col]].copy()
        plot_df[x_col] = pd.to_numeric(plot_df[x_col], errors="coerce")
        plot_df[y_col] = pd.to_numeric(plot_df[y_col], errors="coerce")
        plot_df = plot_df.dropna().sort_values(x_col)
        if len(plot_df) < 2:
            raise ValueError("Line chart requires at least 2 numeric rows.")

        points = [
            [float(row[x_col]), float(row[y_col])]
            for _, row in plot_df.iterrows()
        ]

        options = _base_options(f"Line Chart — {y_col} vs {x_col}", "line")
        options["xAxis"] = {"title": {"text": x_col}}
        options["yAxis"] = {"title": {"text": y_col}}
        options["tooltip"] = {
            "headerFormat": "<b>{series.name}</b><br/>",
            "pointFormat": f"{x_col}: <b>{{point.x}}</b><br/>{y_col}: <b>{{point.y}}</b>",
        }
        options["plotOptions"] = {"line": {"marker": {"enabled": True, "radius": 3}}}
        options["series"] = [{"name": f"{y_col} vs {x_col}", "data": points}]
        return options

    if chart_type == "heatmap":
        num_cols = df.select_dtypes(include=["int64", "float64"]).columns.tolist()
        if len(num_cols) < 2:
            raise ValueError("Heatmap requires at least two numeric columns.")

        corr = pd.DataFrame(np.eye(len(num_cols)), index=num_cols, columns=num_cols, dtype=float)
        for i, c1 in enumerate(num_cols):
            for j, c2 in enumerate(num_cols):
                valid = df[[c1, c2]].dropna()
                if valid.empty:
                    corr.iloc[i, j] = 0.0
                else:
                    corr.iloc[i, j] = round(_manual_pearson(valid[c1], valid[c2]), 4)

        heatmap_data: list[list[float]] = []
        for y_idx, row_name in enumerate(num_cols):
            for x_idx, col_name in enumerate(num_cols):
                heatmap_data.append([float(x_idx), float(y_idx), float(corr.loc[row_name, col_name])])

        options = _base_options("Pearson Correlation Heatmap", "heatmap")
        options["xAxis"] = {"categories": num_cols, "title": {"text": None}}
        options["yAxis"] = {
            "categories": num_cols,
            "title": {"text": None},
            "reversed": True,
        }
        options["colorAxis"] = {
            "min": -1,
            "max": 1,
            "minColor": "#FFFFFF",
            "maxColor": "#7cb5ec",
        }
        options["legend"] = {
            "align": "right",
            "layout": "vertical",
            "margin": 0,
            "verticalAlign": "top",
            "y": 25,
            "symbolHeight": 280,
        }
        options["series"] = [
            {
                "name": "Pearson r",
                "borderWidth": 1,
                "borderColor": "#e6e6e6",
                "data": heatmap_data,
                "dataLabels": {
                    "enabled": True,
                    "color": "#000000",
                    "format": "{point.value:.2f}",
                },
            }
        ]
        return options

    raise ValueError(
        f"Unsupported chart_type '{chart_type}'. Use: scatter, linechart, heatmap."
    )
