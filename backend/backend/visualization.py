from __future__ import annotations

import numpy as np
from scipy import stats
import pandas as pd
from scipy import stats

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

    # New chart types
    if chart_type == "density":
        # Kernel Density Estimate using Gaussian kernel
        kde = stats.gaussian_kde(values)
        x_grid = np.linspace(values.min(), values.max(), 200)
        y_vals = kde.evaluate(x_grid)
        options = _base_options(f"Density Plot — {col}", "area")
        options["xAxis"] = {"title": {"text": col}}
        options["yAxis"] = {"title": {"text": "Density"}}
        options["tooltip"] = {
            "pointFormat": "Density: <b>{point.y:.4f}</b>",
        }
        options["series"] = [{"name": col, "data": list(zip(x_grid.tolist(), y_vals.tolist()))}]
        return options

    if chart_type == "qq-plot":
        # Generate Q-Q plot data against a normal distribution
        (osm, osr), (slope, intercept, r) = stats.probplot(values, dist="norm")
        # osm: theoretical quantiles, osr: ordered sample values
        options = _base_options(f"QQ Plot — {col}", "scatter")
        options["xAxis"] = {"title": {"text": "Theoretical Quantiles"}}
        options["yAxis"] = {"title": {"text": "Ordered Values"}}
        options["tooltip"] = {
            "pointFormat": "Theoretical: <b>{point.x:.4f}</b><br/>Sample: <b>{point.y:.4f}</b>",
        }
        options["series"] = [{"name": "QQ", "data": list(zip(osm.tolist(), osr.tolist()))}]
        return options

    if chart_type == "violin":
        # Approximate violin plot using kernel density mirrored
        kde = stats.gaussian_kde(values)
        x_grid = np.linspace(values.min(), values.max(), 200)
        y_vals = kde.evaluate(x_grid)
        # Create mirrored data for violin shape
        data = []
        for x, y in zip(x_grid, y_vals):
            data.append([x, y])
            data.append([x, -y])
        options = _base_options(f"Violin Plot — {col}", "area")
        options["xAxis"] = {"title": {"text": col}}
        options["yAxis"] = {"title": {"text": "Density"}, "opposite": True}
        options["plotOptions"] = {"area": {"fillOpacity": 0.5}}
        options["series"] = [{"name": col, "data": data}]
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

    if chart_type in ("countplot", "count plot"):
        # Count Plot is essentially the same as Bar Chart for categorical data
        options = _base_options(f"Count Plot — {col}", "column")
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

    if chart_type == "pareto":
        # Pareto chart: bar chart of frequencies with cumulative line
        total = sum(values)
        cumulative = []
        cum_sum = 0
        for v in values:
            cum_sum += v
            cumulative.append(round(cum_sum / total * 100, 2))
        options = _base_options(f"Pareto Chart — {col}", "column")
        options["xAxis"] = {
            "categories": labels,
            "title": {"text": col},
            "crosshair": True,
        }
        options["yAxis"] = [{"title": {"text": "Count"}}, {"opposite": True, "title": {"text": "% Cumulative"}, "max": 100}]
        options["plotOptions"] = {
            "column": {
                "borderRadius": 3,
                "colorByPoint": True,
            },
            "spline": {
                "marker": {"enabled": True},
                "tooltip": {"valueSuffix": "%"},
            }
        }
        options["series"] = [
            {"type": "column", "name": "Count", "data": values},
            {"type": "spline", "name": "Cumulative %", "yAxis": 1, "data": cumulative},
        ]
        return options
    raise ValueError(
        f"Unsupported chart_type '{chart_type}'. Use: barchart, piechart."
    )


def generate_bivariate_plot(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    chart_type: str | None = None,
    size_col: str | None = None,
) -> dict:
    # Ensure column existence
    _require_column(df, x_col)
    _require_column(df, y_col)

    # Determine data types
    is_x_num = pd.api.types.is_numeric_dtype(df[x_col])
    is_y_num = pd.api.types.is_numeric_dtype(df[y_col])

    # Auto-select chart_type if not provided
    if not chart_type:
        # Determine if size column is numeric for bubble chart
        is_size_num = False
        if size_col:
            is_size_num = pd.api.types.is_numeric_dtype(df[size_col])
        if is_x_num and is_y_num and is_size_num:
            chart_type = "bubble"
        elif is_x_num and is_y_num:
            chart_type = "scatter"
        elif not is_x_num and not is_y_num:
            chart_type = "heatmap-crosstab"
        else:
            chart_type = "bar-aggregation"

    chart_type = chart_type.lower().strip()

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

    _require_column(df, x_col)
    _require_column(df, y_col)

    is_x_num = pd.api.types.is_numeric_dtype(df[x_col])
    is_y_num = pd.api.types.is_numeric_dtype(df[y_col])

    if is_x_num and is_y_num:
        

        points = [
            [float(row[x_col]), float(row[y_col])]
            for _, row in plot_df.iterrows()
        ]

        if chart_type == "regression":
            # Linear regression line over scatter data
            # Prepare numeric arrays
            x_vals = plot_df[x_col].to_numpy(dtype=float)
            y_vals = plot_df[y_col].to_numpy(dtype=float)
            # Compute linear regression coefficients
            slope, intercept, r_value, p_value, std_err = stats.linregress(x_vals, y_vals)
            # Generate regression line points (using min and max of x)
            x_min, x_max = x_vals.min(), x_vals.max()
            reg_line = [[x_min, slope * x_min + intercept], [x_max, slope * x_max + intercept]]
            # Scatter points series
            scatter_series = {
                "type": "scatter",
                "name": f"{y_col} vs {x_col}",
                "data": points,
                "marker": {"radius": 4, "symbol": "circle"},
            }
            # Regression line series
            line_series = {
                "type": "line",
                "name": "Regression Line",
                "data": reg_line,
                "marker": {"enabled": False},
                "dashStyle": "ShortDot",
                "color": "#FF0000",
                "tooltip": {"pointFormat": "Regression: y = {point.y:.2f}"},
            }
            options = _base_options(f"Regression Plot — {y_col} vs {x_col}", "scatter")
            options["xAxis"] = {"title": {"text": x_col}}
            options["yAxis"] = {"title": {"text": y_col}}
            options["tooltip"] = {
                "headerFormat": "<b>{series.name}</b><br/>",
                "pointFormat": f"{x_col}: <b>{{point.x}}</b><br/>{y_col}: <b>{{point.y}}</b>",
            }
            options["series"] = [scatter_series, line_series]
            return options

        # Bubble chart handling
        if chart_type == "bubble":
            if not size_col:
                raise ValueError("Bubble chart requires 'size_col' parameter.")
            _require_column(df, size_col)
            if not pd.api.types.is_numeric_dtype(df[size_col]):
                raise ValueError(f"Size column '{size_col}' must be numeric.")
            # Ensure size column is present in plot_df
            if size_col not in plot_df.columns:
                # Add size column to plot_df
                plot_df[size_col] = pd.to_numeric(df[size_col], errors="coerce")
                plot_df = plot_df.dropna()
            points = [
                [float(row[x_col]), float(row[y_col]), float(row[size_col])]
                for _, row in plot_df.iterrows()
            ]
            options = _base_options(f"Bubble Plot — {y_col} vs {x_col}", "bubble")
            options["xAxis"] = {"title": {"text": x_col}}
            options["yAxis"] = {"title": {"text": y_col}}
            options["tooltip"] = {
                "headerFormat": "<b>{point.key}</b><br/>",
                "pointFormat": f"{x_col}: <b>{{point.x}}</b><br/>{y_col}: <b>{{point.y}}</b><br/>{size_col}: <b>{{point.z}}</b>",
            }
            options["series"] = [{"type": "bubble", "name": f"{y_col} vs {x_col}", "data": points}]
            return options

        # Default scatter plot
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

    elif not is_x_num and not is_y_num:
        plot_df = df[[x_col, y_col]].copy().dropna()
        if plot_df.empty:
            raise ValueError("No valid overlapping rows for categorical analysis.")
        
        cross = pd.crosstab(plot_df[x_col], plot_df[y_col])
        categories = cross.index.astype(str).tolist()
        
        if chart_type in ("heatmap-crosstab", "crosstab-heatmap", "crosstab"):
            x_categories = cross.index.astype(str).tolist()
            y_categories = cross.columns.astype(str).tolist()
            
            heatmap_data = []
            for y_idx, col_name in enumerate(cross.columns):
                for x_idx, row_name in enumerate(cross.index):
                    val = int(cross.loc[row_name, col_name])
                    heatmap_data.append([float(x_idx), float(y_idx), float(val)])
            
            options = _base_options(f"Crosstab Heatmap — {x_col} vs {y_col}", "heatmap")
            options["xAxis"] = {"categories": x_categories, "title": {"text": x_col}}
            options["yAxis"] = {
                "categories": y_categories,
                "title": {"text": y_col},
                "reversed": True,
            }
            # Find min/max values for colorAxis
            all_vals = cross.values.flatten()
            min_val = int(all_vals.min()) if len(all_vals) else 0
            max_val = int(all_vals.max()) if len(all_vals) else 1
            options["colorAxis"] = {
                "min": min_val,
                "max": max_val,
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
                    "name": "Count",
                    "borderWidth": 1,
                    "borderColor": "#e6e6e6",
                    "data": heatmap_data,
                    "dataLabels": {
                        "enabled": True,
                        "color": "#000000",
                        "format": "{point.value}",
                    },
                }
            ]
            return options
            
        elif chart_type in ("grouped-bar", "grouped_bar", "grouped"):
            series_data = []
            for col in cross.columns:
                series_data.append({
                    "name": str(col),
                    "data": cross[col].tolist()
                })
            
            options = _base_options(f"Grouped Bar Chart — {x_col} by {y_col}", "column")
            options["xAxis"] = {"categories": categories, "title": {"text": x_col}}
            options["yAxis"] = {"title": {"text": "Count"}}
            options["plotOptions"] = {
                "column": {
                    "stacking": None
                }
            }
            options["series"] = series_data
            return options
            
        else:
            # Default to Stacked Bar Chart
            series_data = []
            for col in cross.columns:
                series_data.append({
                    "name": str(col),
                    "data": cross[col].tolist()
                })
            
            options = _base_options(f"Stacked Bar Chart — {x_col} by {y_col}", "column")
            options["xAxis"] = {"categories": categories, "title": {"text": x_col}}
            options["yAxis"] = {"title": {"text": "Count"}}
            options["plotOptions"] = {
                "column": {
                    "stacking": "normal"
                }
            }
            options["series"] = series_data
            return options

    else:
        if is_x_num:
            num_col = x_col
            cat_col = y_col
        else:
            num_col = y_col
            cat_col = x_col
        
        plot_df = df[[cat_col, num_col]].copy()
        plot_df[num_col] = pd.to_numeric(plot_df[num_col], errors="coerce")
        plot_df = plot_df.dropna()
        if plot_df.empty:
            raise ValueError(f"No valid overlapping rows between {cat_col} and {num_col}.")

        if chart_type in ("bar-aggregation", "bar"):
            means = plot_df.groupby(cat_col)[num_col].mean().sort_values(ascending=False)
            categories = means.index.astype(str).tolist()
            data = means.tolist()

            options = _base_options(f"Bar Aggregation — Mean of {num_col} by {cat_col}", "column")
            options["xAxis"] = {"categories": categories, "title": {"text": cat_col}}
            options["yAxis"] = {"title": {"text": f"Mean {num_col}"}}
            options["plotOptions"] = {
                "column": {
                    "colorByPoint": True
                }
            }
            options["series"] = [{"name": f"Mean {num_col}", "data": data}]
            return options
        else:
            groups = plot_df.groupby(cat_col)
            categories = []
            boxplot_data = []
            
            for cat_name, group in groups:
                series = group[num_col]
                if len(series) == 0:
                    continue
                q1 = float(series.quantile(0.25))
                median = float(series.median())
                q3 = float(series.quantile(0.75))
                iqr = q3 - q1
                lower_whisker = float(series[series >= q1 - 1.5 * iqr].min()) if len(series) else float(series.min())
                upper_whisker = float(series[series <= q3 + 1.5 * iqr].max()) if len(series) else float(series.max())
                min_val = lower_whisker
                max_val = upper_whisker
                
                categories.append(str(cat_name))
                boxplot_data.append([min_val, q1, median, q3, max_val])

            options = _base_options(f"Grouped Box Plot — {num_col} by {cat_col}", "boxplot")
            options["xAxis"] = {"categories": categories, "title": {"text": cat_col}}
            options["yAxis"] = {"title": {"text": num_col}}
            options["legend"] = {"enabled": False}
            options["series"] = [{"name": num_col, "data": boxplot_data}]
            return options

def generate_time_series_plot(df: pd.DataFrame, date_col: str, value_col: str) -> dict:
    _require_column(df, date_col)
    _require_column(df, value_col)

    plot_df = df[[date_col, value_col]].copy()
    plot_df[date_col] = pd.to_datetime(plot_df[date_col], errors="coerce")
    plot_df[value_col] = pd.to_numeric(plot_df[value_col], errors="coerce")
    plot_df = plot_df.dropna()

    if plot_df.empty:
        raise ValueError(f"No valid time-series data after parsing {date_col} and {value_col}.")

    plot_df = plot_df.sort_values(by=date_col)

    points = [
        [int(row[date_col].timestamp() * 1000), float(row[value_col])]
        for _, row in plot_df.iterrows()
    ]

    # Initialize chart options
    options = _base_options(f"Time Series — {value_col} over {date_col}", "line")
    options["xAxis"] = {"type": "datetime", "title": {"text": date_col}}
    options["yAxis"] = {"title": {"text": value_col}}
    options["series"] = [{
        "name": value_col,
        "type": "line",
        "data": points,
        "marker": {"enabled": True},
    }]
# Compute trend line using linear regression
    if len(plot_df) >= 2:
        # Convert timestamps to ordinal for regression
        timestamps = plot_df[date_col].astype('int64') // 10**9  # seconds since epoch
        values = plot_df[value_col].astype(float)
        coeffs = np.polyfit(timestamps, values, 1)
        trend_vals = np.polyval(coeffs, timestamps)
        options["series"].append({
            "name": f"Trend ({value_col})",
            "type": "line",
            "data": list(zip(plot_df[date_col].astype('int64') // 10**9 * 1000, trend_vals.astype(float))),
            "marker": {"enabled": True},
            "dashStyle": "ShortDash",
            "color": "#FF0000",
        })
    # Moving average (window=5)
    if len(plot_df) >= 5:
        ma_series = plot_df[value_col].rolling(window=5).mean()
        options["series"].append({
            "name": f"Moving Avg ({value_col})",
            "type": "line",
            "data": list(zip(plot_df[date_col].astype('int64') // 10**9 * 1000, ma_series.fillna(method='bfill').astype(float))),
            "marker": {"enabled": False},
            "dashStyle": "Dot",
            "color": "#00AA00",
        })
    # Rolling mean (window=10)
    if len(plot_df) >= 10:
        rm_series = plot_df[value_col].rolling(window=10).mean()
        options["series"].append({
            "name": f"Rolling Mean ({value_col})",
            "type": "line",
            "data": list(zip(plot_df[date_col].astype('int64') // 10**9 * 1000, rm_series.fillna(method='bfill').astype(float))),
            "marker": {"enabled": False},
            "dashStyle": "Dash",
            "color": "#0000FF",
        })
    # Simple forecasting: extend last trend for next 10 points (daily frequency)
    if len(plot_df) >= 2:
        last_timestamp = plot_df[date_col].max()
        freq = pd.infer_freq(plot_df[date_col]) or 'D'
        future_dates = pd.date_range(start=last_timestamp, periods=11, freq=freq)
        future_ts = future_dates.astype('int64') // 10**9 * 1000
        # Use same linear coeffs for forecast
        future_vals = np.polyval(coeffs, future_dates.astype('int64') // 10**9)
        options["series"].append({
            "name": f"Forecast ({value_col})",
            "type": "line",
            "data": list(zip(future_ts, future_vals.astype(float))),
            "marker": {"enabled": False, "symbol": "circle"},
            "dashStyle": "ShortDot",
            "color": "#FF9900",
        })
    return options
