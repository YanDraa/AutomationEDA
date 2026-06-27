"use client";

import { BACKEND_URL } from "@/lib/config";

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

const API_BASE = BACKEND_URL;

type ColumnClassification = {
  type: "Categorical (Qualitative)" | "Discrete Numeric" | "Continuous Numeric";
  recommended_charts: string[];
  reason: string;
};

type SchemaMap = Record<string, ColumnClassification>;

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
      column: { borderRadius: 6, borderWidth: 0 }
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
      column: { borderRadius: 4, borderWidth: 1, borderColor: "#7c3aed" }
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
      column: { borderRadius: 6, borderWidth: 0 }
    }
  };
}

function EmptyState() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-2xl bg-primary/10 p-5 shadow-inner">
        <Database className="size-10 text-primary" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground tracking-tight">Belum Ada Dataset yang Dimuat</p>
        <p className="mt-1 text-muted-foreground text-sm max-w-sm">
          Silakan unggah file data terlebih dahulu untuk mengaktifkan Pembuat Grafik Statistik Berbasis AI.
        </p>
      </div>
      <Button asChild size="default" className="rounded-xl font-semibold shadow-xs mt-2">
        <Link href="/dashboard/upload-data">
          <Upload className="mr-2 size-4" />
          Unggah Dataset
        </Link>
      </Button>
    </div>
  );
}

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [schemaData, setSchemaData] = useState<SchemaMap | null>(null);

  const [varX, setVarX] = useState<string>("");
  const [varY, setVarY] = useState<string>("");
  const [selectedChartType, setSelectedChartType] = useState<string>("");

  const [chartLoading, setChartLoading] = useState(false);
  const [chartPayload, setChartPayload] = useState<any | null>(null);

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    const fetchSchema = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/data/ai-schema`, { credentials: "include" });
        if (!res.ok) {
          setNotification({
            message: "Gagal terhubung ke layanan skema backend. Mengalihkan dalam 10 detik...",
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
            message: "Peringatan: Tidak ada dataset aktif. Mengalihkan dalam 10 detik...",
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
          message: "Kesalahan jaringan saat memuat metadata dataset.",
          type: "error"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchema();
  }, [router]);

  const getRecommendedCharts = (): string[] => {
    if (!varX || !schemaData) return [];
    const infoX = schemaData[varX];
    if (!infoX) return [];

    if (!varY) {
      return infoX.recommended_charts || [];
    }

    const infoY = schemaData[varY];
    if (!infoY) return [];

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
      return ["Bar Chart"];
    }
  };

  const recommendedCharts = getRecommendedCharts();

  useEffect(() => {
    if (recommendedCharts.length > 0) {
      if (!recommendedCharts.includes(selectedChartType)) {
        setSelectedChartType(recommendedCharts[0]);
      }
    } else {
      setSelectedChartType("");
    }
  }, [varX, varY, recommendedCharts, selectedChartType]);

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
            message: err.detail || "Gagal menghitung statistik grafik",
            type: "error"
          });
          setChartPayload(null);
          return;
        }
        const data = await res.json();
        setChartPayload(data);
      } catch (err) {
        setNotification({
          message: "Gagal terhubung ke server visualisasi data",
          type: "error"
        });
        setChartPayload(null);
      } finally {
        setChartLoading(false);
      }
    };

    fetchChart();
  }, [varX, varY, selectedChartType]);

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case "Categorical (Qualitative)":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
      case "Discrete Numeric":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400";
      case "Continuous Numeric":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

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

  if (loading) {
    return (
      <div className="w-full min-w-0 flex flex-col gap-6 p-1">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasData || !schemaData) {
    return (
      <div className="w-full min-w-0 flex flex-col gap-4 p-1">
        {notification && (
          <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700 dark:text-amber-400 transition-all">
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
    <div className="w-full min-w-0 flex flex-col gap-6 p-1">
      
      {/* Toast Notification Bar */}
      {notification && (
        <div className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${
          notification.type === "error"
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : notification.type === "warning"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
        }`}>
          <div className="flex items-center gap-3">
            {notification.type === "error" && <AlertTriangle className="size-5 shrink-0" />}
            {notification.type === "warning" && <AlertTriangle className="size-5 shrink-0" />}
            {notification.type === "success" && <CheckCircle className="size-5 shrink-0" />}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="opacity-60 hover:opacity-100 transition-opacity ml-4">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          Visualisasi Berbasis AI
        </h1>
        <p className="text-sm text-muted-foreground">
          Penyusunan dan rekomendasi grafik statistik secara otomatis berdasarkan klasifikasi variabel.
        </p>
      </div>

      {/* Main Form controls and Insight Badges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-0.5">
        
        {/* Dropdowns Card */}
        <Card className="lg:col-span-2 rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 rounded-t-2xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sliders className="size-4 text-primary" />
              Pemilihan Variabel
            </CardTitle>
            <CardDescription className="text-xs">
              Pilih variabel untuk dianalisis. Pilihan grafik akan menyesuaikan secara otomatis.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Var X Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Variabel X (Independen / Utama)
                </label>
                <select
                  value={varX}
                  onChange={(e) => setVarX(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                  Variabel Y (Dependen / Sekunder)
                  <span className="text-[10px] font-normal text-muted-foreground italic">Opsional</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={varY}
                    onChange={(e) => setVarY(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border/60 bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    <option value="">— Tidak Ada (Univariat) —</option>
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
                      className="size-10 rounded-xl border border-border/60 shrink-0"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

            </div>

            {/* Toggle trigger section */}
            <div className="border-t border-border/40 pt-4">
              {recommendedCharts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="size-3.5 text-primary" />
                    Rekomendasi Visualisasi AI
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {recommendedCharts.map((chart) => (
                      <button
                        key={chart}
                        type="button"
                        onClick={() => setSelectedChartType(chart)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider border transition-all ${
                          selectedChartType === chart
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-background text-muted-foreground border-border/60 hover:text-foreground hover:bg-muted/30"
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
                  Pilih variabel untuk melihat opsi grafik statistik yang direkomendasikan.
                </span>
              )}
            </div>

          </CardContent>
        </Card>

        {/* AI Insight Badges Card */}
        <Card className="rounded-2xl border-border/60 shadow-sm flex flex-col justify-between bg-card">
          <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 rounded-t-2xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Konsultan Data AI
            </CardTitle>
            <CardDescription className="text-xs">
              Klasifikasi dan penjelasan tipe variabel.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 flex-1 justify-center pt-6 pb-6">
            
            {/* Variable X Badge */}
            {infoX && (
              <div className="flex flex-col gap-2 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-xs text-foreground break-words">
                    Var X: {varX}
                  </span>
                  <Badge variant="outline" className={`${getTypeBadgeStyle(infoX.type)} text-[10px] uppercase font-bold shrink-0 py-0.5 px-2 rounded-lg`}>
                    {infoX.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {infoX.reason}
                </p>
              </div>
            )}

            {/* Variable Y Badge */}
            {varY && infoY ? (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-xs text-foreground break-words">
                    Var Y: {varY}
                  </span>
                  <Badge variant="outline" className={`${getTypeBadgeStyle(infoY.type)} text-[10px] uppercase font-bold shrink-0 py-0.5 px-2 rounded-lg`}>
                    {infoY.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed break-words">
                  {infoY.reason}
                </p>
              </div>
            ) : varY ? (
              <div className="rounded-xl border border-dashed border-border/60 p-4 flex items-center justify-center text-xs text-muted-foreground">
                Pilih variabel Y untuk melihat klasifikasi
              </div>
            ) : null}

            {!infoX && (
              <div className="flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                <HelpCircle className="size-8 mb-2 opacity-30" />
                <span className="text-xs">Tidak ada variabel dipilih</span>
              </div>
            )}

          </CardContent>
        </Card>

      </div>

      {/* Chart Canvas Rendering Section */}
      <div className="w-full min-w-0">
        {chartLoading ? (
          <Card className="rounded-2xl border-border/60 shadow-sm w-full bg-card">
            <CardContent className="flex flex-col items-center justify-center py-24 gap-3">
              <Spinner className="size-8 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">
                Menghitung statistik dan merender grafik...
              </p>
            </CardContent>
          </Card>
        ) : !chartPayload ? (
          <Card className="rounded-2xl border-border/60 shadow-sm w-full bg-card">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
              <BarChart3 className="size-10 text-muted-foreground/30" />
              <div>
                <p className="font-semibold text-sm text-foreground">Grafik belum dibuat</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih opsi visualisasi yang direkomendasikan di atas untuk merender grafik.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-border/60 shadow-sm w-full bg-card">
            <CardHeader className="border-b border-border/40 bg-muted/20 py-3.5 px-6 rounded-t-2xl">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" />
                Grafik Terender: {chartPayload.type}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 w-full min-w-0">
              <div className="w-full overflow-x-auto min-w-0">
                {chartOptions ? (
                  <HighchartsChart options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center p-12 text-xs text-destructive font-semibold">
                    Gagal merender opsi konfigurasi Highcharts.
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
