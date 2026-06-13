"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Database,
  Upload,
  X,
  Sparkles,
  HelpCircle,
  TrendingUp,
  Sliders,
  AlertTriangle,
  CheckCircle,
  Info
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import type { HighchartsOptions } from "@/lib/visualization-client";

// ─── Constants ──────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";

type ColumnClassification = {
  type: "Categorical (Qualitative)" | "Discrete Numeric" | "Continuous Numeric";
  recommended_charts: string[];
  reason: string;
};

type SchemaMap = Record<string, ColumnClassification>;

// ─── Highcharts Option Builders ──────────────────────────────────────────────

function buildBarChartOptions(payload: any): HighchartsOptions {
  const { chart_data, var_x } = payload;
  return {
    chart: { type: "column", backgroundColor: "transparent" },
    title: { text: `Frequency of ${var_x}`, style: { color: "var(--foreground)" } },
    xAxis: {
      categories: chart_data.categories || [],
      title: { text: var_x },
      labels: { style: { color: "var(--muted-foreground)" } },
    },
    yAxis: {
      title: { text: "Frequency" },
      labels: { style: { color: "var(--muted-foreground)" } },
      allowDecimals: false
    },
    legend: { enabled: false },
    tooltip: {
      headerFormat: "<b>{point.key}</b><br/>",
      pointFormat: "Count: <b>{point.y}</b>",
    },
    series: [
      {
        name: "Count",
        type: "column",
        data: chart_data.values || [],
        color: "#3b82f6",
      }
    ],
    plotOptions: {
      column: { borderRadius: 4, borderWidth: 0 }
    }
  };
}

function buildHistogramOptions(payload: any): HighchartsOptions {
  const { chart_data, var_x } = payload;
  return {
    chart: { type: "column", backgroundColor: "transparent" },
    title: { text: `Histogram of ${var_x}`, style: { color: "var(--foreground)" } },
    subtitle: { text: "Shape & distribution analysis (10 bins)", style: { color: "var(--muted-foreground)" } },
    xAxis: {
      categories: chart_data.categories || [],
      title: { text: var_x },
      labels: { style: { color: "var(--muted-foreground)" } },
    },
    yAxis: {
      title: { text: "Frequency" },
      labels: { style: { color: "var(--muted-foreground)" } },
      allowDecimals: false
    },
    legend: { enabled: false },
    tooltip: {
      headerFormat: "<b>{point.key}</b><br/>",
      pointFormat: "Count: <b>{point.y}</b>",
    },
    series: [
      {
        name: "Frequency",
        type: "column",
        data: chart_data.values || [],
        color: "#8b5cf6",
      }
    ],
    plotOptions: {
      column: { borderRadius: 2, borderWidth: 1, borderColor: "#7c3aed" }
    }
  };
}

function buildBoxplotOptions(payload: any): HighchartsOptions {
  const { box_data, var_x } = payload;
  return {
    chart: { type: "boxplot", backgroundColor: "transparent" },
    title: { text: `Box Plot of ${var_x}`, style: { color: "var(--foreground)" } },
    subtitle: { text: "Min, Q1, Median, Q3, Max + Outliers", style: { color: "var(--muted-foreground)" } },
    xAxis: { categories: [var_x], visible: false },
    yAxis: {
      title: { text: var_x },
      labels: { style: { color: "var(--muted-foreground)" } }
    },
    legend: { enabled: false },
    tooltip: {
      headerFormat: `<b>${var_x}</b><br/>`,
      pointFormat:
        "Max: <b>{point.high}</b><br/>" +
        "Q3: <b>{point.q3}</b><br/>" +
        "Median: <b>{point.median}</b><br/>" +
        "Q1: <b>{point.q1}</b><br/>" +
        "Min: <b>{point.low}</b>",
    },
    series: [
      {
        name: "Distribution",
        type: "boxplot",
        data: [
          [
            box_data.lower_whisker,
            box_data.q1,
            box_data.median,
            box_data.q3,
            box_data.upper_whisker,
          ]
        ],
        color: "#3b82f6",
        fillColor: "rgba(59, 130, 246, 0.1)",
        medianColor: "#2563eb",
        stemColor: "#3b82f6",
        whiskerColor: "#3b82f6",
      },
      ...(box_data.outliers && box_data.outliers.length > 0
        ? [
            {
              name: "Outliers",
              type: "scatter",
              data: box_data.outliers.map((v: number) => [0, v]),
              color: "#ef4444",
              marker: { symbol: "circle", radius: 4 },
              tooltip: { pointFormat: "Outlier: <b>{point.y}</b>" }
            }
          ]
        : [])
    ]
  };
}

function buildScatterOptions(payload: any): HighchartsOptions {
  const { chart_data, var_x, var_y } = payload;
  return {
    chart: { type: "scatter", zoomType: "xy", backgroundColor: "transparent" },
    title: { text: `${var_x} vs ${var_y} Scatter Plot`, style: { color: "var(--foreground)" } },
    subtitle: { text: "Bivariate correlation analysis", style: { color: "var(--muted-foreground)" } },
    xAxis: {
      title: { text: var_x },
      labels: { style: { color: "var(--muted-foreground)" } }
    },
    yAxis: {
      title: { text: var_y },
      labels: { style: { color: "var(--muted-foreground)" } }
    },
    legend: { enabled: false },
    tooltip: {
      headerFormat: "",
      pointFormat: `${var_x}: <b>{point.x}</b><br/>${var_y}: <b>{point.y}</b>`
    },
    series: [
      {
        name: "Points",
        type: "scatter",
        data: chart_data.points || [],
        color: "#10b981",
        marker: { radius: 4, symbol: "circle" }
      }
    ]
  };
}

function buildGroupedComparisonOptions(payload: any): HighchartsOptions {
  const { chart_data } = payload;
  const catCol = chart_data.cat_col || "";
  const numCol = chart_data.num_col || "";
  return {
    chart: { type: "column", backgroundColor: "transparent" },
    title: { text: `Mean of ${numCol} by ${catCol}`, style: { color: "var(--foreground)" } },
    subtitle: { text: "Grouped comparison across categories", style: { color: "var(--muted-foreground)" } },
    xAxis: {
      categories: chart_data.categories || [],
      title: { text: catCol },
      labels: { style: { color: "var(--muted-foreground)" } }
    },
    yAxis: {
      title: { text: `Average ${numCol}` },
      labels: { style: { color: "var(--muted-foreground)" } }
    },
    legend: { enabled: false },
    tooltip: {
      headerFormat: "<b>{point.key}</b><br/>",
      pointFormat: `Mean ${numCol}: <b>{point.y:,.2f}</b>`,
    },
    series: [
      {
        name: `Mean ${numCol}`,
        type: "column",
        data: chart_data.values || [],
        color: "#f59e0b",
      }
    ],
    plotOptions: {
      column: { borderRadius: 4, borderWidth: 0 }
    }
  };
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center gap-6 py-20 text-center overflow-x-hidden">
      <div className="rounded-full bg-muted p-5 shadow-inner">
        <Database className="size-10 text-muted-foreground" />
      </div>
      <div>
        <p className="text-lg font-semibold tracking-tight">No dataset loaded</p>
        <p className="mt-1.5 text-muted-foreground text-sm max-w-sm">
          Please upload a data file first to activate the AI-Guided Statistical Chart Builder.
        </p>
      </div>
      <Button asChild size="default" className="shadow-md">
        <Link href="/dashboard/upload-data">
          <Upload className="mr-2 size-4" />
          Upload Dataset
        </Link>
      </Button>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();

  // Initialization states
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [schemaData, setSchemaData] = useState<SchemaMap | null>(null);

  // Selections
  const [varX, setVarX] = useState<string>("");
  const [varY, setVarY] = useState<string>("");
  const [selectedChartType, setSelectedChartType] = useState<string>("");

  // Chart Rendering
  const [chartLoading, setChartLoading] = useState(false);
  const [chartPayload, setChartPayload] = useState<any | null>(null);

  // Notification / Toast state
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  // 10-Second Toast Auto-dismiss effect
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 10000); // 10,000ms = exactly 10 seconds
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch AI schemas on mount
  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/data/ai-schema`, { credentials: "include" });
        if (!res.ok) {
          setNotification({
            message: "Failed to connect to backend schema service. Redirecting to upload page in 10 seconds...",
            type: "error"
          });
          setTimeout(() => {
            router.replace("/dashboard/upload-data");
          }, 10000);
          return;
        }
        const data = await res.json();
        if (data.status === "no_data") {
          setNotification({
            message: "Warning: No active dataset available. Redirecting to upload page in 10 seconds...",
            type: "warning"
          });
          setTimeout(() => {
            router.replace("/dashboard/upload-data");
          }, 10000);
          return;
        }
        if (data.status === "success" && data.columns) {
          setSchemaData(data.columns);
          setHasData(true);
          const colsList = Object.keys(data.columns);
          if (colsList.length > 0) {
            setVarX(colsList[0]);
          }
        }
      } catch (err) {
        setNotification({
          message: "Network error loading dataset metadata. Redirecting to upload page in 10 seconds...",
          type: "error"
        });
        setTimeout(() => {
          router.replace("/dashboard/upload-data");
        }, 10000);
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [router]);

  // Determine recommended charts for the current combination of variables
  const getRecommendedCharts = (): string[] => {
    if (!varX || !schemaData) return [];
    const infoX = schemaData[varX];
    if (!infoX) return [];

    if (!varY) {
      // Univariate recommendations from AI
      return infoX.recommended_charts || [];
    }

    const infoY = schemaData[varY];
    if (!infoY) return [];

    // Bivariate statistical classification rules (Intro Stat Ch. 2 & 3)
    const typeX = infoX.type;
    const typeY = infoY.type;

    if (typeX === "Continuous Numeric" && typeY === "Continuous Numeric") {
      return ["Scatter Plot"];
    } else if (
      (typeX === "Continuous Numeric" && (typeY === "Discrete Numeric" || typeY === "Categorical (Qualitative)")) ||
      (typeY === "Continuous Numeric" && (typeX === "Discrete Numeric" || typeX === "Categorical (Qualitative)"))
    ) {
      return ["Grouped Comparison"];
    } else {
      // Categorical vs Categorical or Discrete vs Discrete
      return ["Bar Chart"];
    }
  };

  const recommendedCharts = getRecommendedCharts();

  // Auto-select first recommended chart when variable combinations change
  useEffect(() => {
    if (recommendedCharts.length > 0) {
      if (!recommendedCharts.includes(selectedChartType)) {
        setSelectedChartType(recommendedCharts[0]);
      }
    } else {
      setSelectedChartType("");
    }
  }, [varX, varY, recommendedCharts, selectedChartType]);

  // Fetch rendered chart data when selection changes
  useEffect(() => {
    if (!varX || !selectedChartType) {
      setChartPayload(null);
      return;
    }

    const fetchChart = async () => {
      setChartLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/data/chart-render`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            var_x: varX,
            var_y: varY || null,
            chart_type: selectedChartType,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          setNotification({
            message: err.detail || "Failed to calculate chart statistics",
            type: "error"
          });
          setChartPayload(null);
          return;
        }
        const data = await res.json();
        setChartPayload(data);
      } catch (err) {
        setNotification({
          message: "Failed to connect to data visualization server",
          type: "error"
        });
        setChartPayload(null);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChart();
  }, [varX, varY, selectedChartType]);

  // Resolve badges helper
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "Categorical (Qualitative)":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/30";
      case "Discrete Numeric":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/30";
      case "Continuous Numeric":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-800/30";
    }
  };

  // Build highcharts configuration
  const buildOptions = (): HighchartsOptions | null => {
    if (!chartPayload || chartPayload.status !== "success") return null;

    switch (chartPayload.type) {
      case "Bar Chart":
        return buildBarChartOptions(chartPayload);
      case "Histogram":
        return buildHistogramOptions(chartPayload);
      case "Boxplot":
        return buildBoxplotOptions(chartPayload);
      case "Scatter Plot":
        return buildScatterOptions(chartPayload);
      case "Grouped Comparison":
        return buildGroupedComparisonOptions(chartPayload);
      default:
        return null;
    }
  };

  const chartOptions = buildOptions();

  // Loading indicator for page setup
  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="border border-border">
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData || !schemaData) {
    return (
      <div className="w-full max-w-full overflow-x-hidden p-6 flex flex-col gap-4">
        {notification && (
          <div className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-700 dark:text-yellow-400 transition-all duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="size-5 shrink-0" />
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="hover:opacity-70">
              <X className="size-4" />
            </button>
          </div>
        )}
        <EmptyState />
      </div>
    );
  }

  const columnsList = Object.keys(schemaData);
  const infoX = varX ? schemaData[varX] : null;
  const infoY = varY ? schemaData[varY] : null;

  return (
    <div className="w-full max-w-full overflow-x-hidden flex flex-col gap-6 p-4 md:p-6 lg:p-8">
      
      {/* Toast Notification Bar */}
      {notification && (
        <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all duration-300 ${
          notification.type === "error"
            ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
            : notification.type === "warning"
            ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            : "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === "error" && <AlertTriangle className="size-5 shrink-0" />}
            {notification.type === "warning" && <AlertTriangle className="size-5 shrink-0" />}
            {notification.type === "success" && <CheckCircle className="size-5 shrink-0" />}
            <span className="text-sm font-medium leading-relaxed">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100 transition-opacity ml-4">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="size-6 text-indigo-500" />
          AI-Guided Statistical Chart Builder
        </h1>
        <p className="text-sm text-muted-foreground">
          Strictly classifies data types and recomends chart options under Intro Statistics Chapters 2 & 3 rules.
        </p>
      </div>

      {/* Main Form controls and Insight Badges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dropdowns Card */}
        <Card className="lg:col-span-2 border border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sliders className="size-4 text-indigo-500" />
              Variable Selection
            </CardTitle>
            <CardDescription>
              Select variables to analyze. Options adapt based on rule classifications.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Var X Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Variable X (Independent / Primary)
                </label>
                <select
                  value={varX}
                  onChange={(e) => setVarX(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200"
                >
                  {columnsList.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>

              {/* Var Y Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  Variable Y (Dependent / Secondary)
                  <span className="text-[10px] font-normal text-muted-foreground italic">Optional</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={varY}
                    onChange={(e) => setVarY(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all duration-200"
                  >
                    <option value="">— None (Univariate) —</option>
                    {columnsList.map((col) => (
                      <option key={col} value={col} disabled={col === varX}>
                        {col}
                      </option>
                    ))}
                  </select>
                  {varY && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setVarY("")}
                      className="size-10 rounded-xl border border-input shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

            </div>

            {/* Toggle trigger section */}
            <div className="border-t border-border pt-4">
              {recommendedCharts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-indigo-500" />
                    AI-Recommended Visualizations
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recommendedCharts.map((chart) => (
                      <button
                        key={chart}
                        onClick={() => setSelectedChartType(chart)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all duration-200 ${
                          selectedChartType === chart
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20 hover:bg-indigo-700"
                            : "bg-background text-muted-foreground border-input hover:text-foreground hover:bg-accent/40"
                        }`}
                      >
                        {chart === "Bar Chart" && <BarChart3 className="size-3.5" />}
                        {chart === "Histogram" && <BarChart3 className="size-3.5 rotate-90" />}
                        {chart === "Boxplot" && <Info className="size-3.5" />}
                        {chart === "Scatter Plot" && <Sparkles className="size-3.5" />}
                        {chart === "Grouped Comparison" && <TrendingUp className="size-3.5" />}
                        {chart}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Select a variable to view recommended statistical chart types.
                </span>
              )}
            </div>

          </CardContent>
        </Card>

        {/* AI Insight Badges Card */}
        <Card className="border border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-500" />
              AI Data Consultant
            </CardTitle>
            <CardDescription>
              Double-checks statistical columns and outputs reasons.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1 justify-center py-2">
            
            {/* Variable X Badge */}
            {infoX && (
              <div className="flex flex-col gap-2 rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 dark:border-blue-400/10 dark:bg-blue-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs tracking-tight text-foreground truncate max-w-[150px]">
                    Var X: {varX}
                  </span>
                  <Badge variant="outline" className={`${getTypeBadgeStyle(infoX.type)} text-[10px] uppercase font-bold shrink-0`}>
                    {infoX.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {infoX.reason}
                </p>
              </div>
            )}

            {/* Variable Y Badge */}
            {varY && infoY ? (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 dark:border-emerald-400/10 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-xs tracking-tight text-foreground truncate max-w-[150px]">
                    Var Y: {varY}
                  </span>
                  <Badge variant="outline" className={`${getTypeBadgeStyle(infoY.type)} text-[10px] uppercase font-bold shrink-0`}>
                    {infoY.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {infoY.reason}
                </p>
              </div>
            ) : varY ? (
              <div className="rounded-xl border border-dashed border-border p-4 flex items-center justify-center text-xs text-muted-foreground">
                Select variable Y to view classification
              </div>
            ) : null}

            {!infoX && (
              <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <HelpCircle className="size-8 mb-2 opacity-40" />
                <span className="text-xs">No variables selected</span>
              </div>
            )}

          </CardContent>
        </Card>

      </div>

      {/* Chart Canvas Rendering Section */}
      <div className="w-full max-w-full overflow-x-hidden">
        {chartLoading ? (
          <Card className="border border-border shadow-sm w-full max-w-full">
            <CardContent className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner className="size-8 text-indigo-600" />
              <p className="text-sm font-medium text-muted-foreground">
                Performing statistical computations...
              </p>
            </CardContent>
          </Card>
        ) : !chartPayload ? (
          <Card className="border border-border shadow-sm w-full max-w-full">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <BarChart3 className="size-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">No chart generated</p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Choose a recommended visualization option above to render the statistical chart.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border border-border shadow-sm w-full max-w-full overflow-hidden">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-indigo-500" />
                Rendered Visual Option: {chartPayload.type}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 w-full max-w-full overflow-x-hidden">
              {/* Anti-bug scroll wrapper specifically inside the canvas area */}
              <div className="w-full overflow-x-auto min-w-0">
                {chartOptions ? (
                  <HighchartsChart options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center p-12 text-sm text-red-500">
                    Failed to render Highcharts config options.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
