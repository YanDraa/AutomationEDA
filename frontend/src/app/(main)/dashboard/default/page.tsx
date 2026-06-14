"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  Grid3X3,
  Info,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  Table2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type DatasetInfo, useDataset } from "@/context/dataset-context";
import { generateAndDownloadReport } from "@/lib/reports-client";
import { BACKEND_URL } from "@/lib/visualization-client";

type DataRow = Record<string, unknown>;
type Lang = "en" | "id";
type SeriesMode = "overlay" | "single";
type ChartSize = { width: number; height: number };

type DatasetMeta = {
  total_rows?: number;
  total_columns?: number;
  total_duplicated_rows?: number;
  total_missing_cells?: number;
};

type SummaryStat = {
  count?: number;
  missing?: number;
  mean?: number | null;
  median?: number | null;
  std?: number | null;
  variance?: number | null;
  min?: number | null;
  max?: number | null;
  skewness?: number | null;
  kurtosis?: number | null;
  q1?: number | null;
  q3?: number | null;
  n_outliers?: number | null;
};

type AnalyzePayload = {
  status: "success" | "no_data";
  dataset_meta?: DatasetMeta;
  metadata?: {
    fileName?: string;
    fileSize?: string;
    rows?: number;
    columns?: number;
    column_names?: string[];
  };
  summary_stats?: Record<string, SummaryStat>;
  data_preview?: DataRow[];
};

const DICT = {
  en: {
    title: "Automated EDA Dashboard",
    subtitle:
      "A premium dataset-agnostic command center for upload, health checks, trends, preview, statistics, and AI-assisted insights.",
    uploadTitle: "Dataset Control",
    uploadDesc: "Drop a dataset to instantly refresh every panel.",
    dropIdle: "Drag a CSV, XLSX, TXT, or JSON file here",
    dropActive: "Drop to analyze",
    chooseFile: "Choose file",
    processing: "Processing",
    activeDataset: "Active dataset",
    noDataset: "No dataset loaded",
    rows: "Rows",
    columns: "Columns",
    duplicates: "Duplicates",
    quality: "Quality score",
    composition: "Dataset composition",
    compositionDesc: "Detected field mix based on dynamic Object.keys mapping.",
    numeric: "Numeric",
    categorical: "Categorical",
    empty: "Empty",
    performance: "Performance overview",
    performanceDesc: "Smooth area-spline visualization for every detected numeric column.",
    overlay: "Overlay",
    isolate: "Isolate",
    selectMetric: "Select metric",
    preview: "Dataset preview",
    previewDesc: "Switch between raw records and computed descriptive statistics.",
    rawPreview: "Raw data preview",
    statsSummary: "Descriptive statistics",
    mean: "Mean",
    median: "Median",
    std: "Std Dev",
    min: "Min",
    max: "Max",
    skewness: "Skewness",
    insights: "Smart insights feed",
    insightsDesc: "Grouped, expandable observations generated from the active dataset state.",
    overview: "Overview",
    numericalAnomalies: "Numerical column anomalies",
    categoricalTrends: "Categorical value trends",
    cleanData: "Clean data",
    information: "Information",
    notice: "Notice",
    regenerate: "Regenerate",
    regenerating: "Regenerating",
    report: "Generate & Download Academic Report",
    reportDesc: "Export a complete academic report using the active dataset.",
    noPreview: "Upload a dataset to populate the dashboard.",
    uploadSuccess: "Dataset analyzed successfully.",
    uploadError: "Unable to analyze dataset.",
    fetchError: "Unable to load the active dataset.",
    reportError: "Unable to generate the report.",
  },
  id: {
    title: "Dashboard EDA Otomatis",
    subtitle:
      "Pusat analisis premium yang adaptif untuk unggah data, audit kualitas, tren, preview, statistik, dan insight AI.",
    uploadTitle: "Kontrol Dataset",
    uploadDesc: "Letakkan dataset untuk memperbarui seluruh panel secara instan.",
    dropIdle: "Seret file CSV, XLSX, TXT, atau JSON ke sini",
    dropActive: "Lepaskan untuk analisis",
    chooseFile: "Pilih file",
    processing: "Memproses",
    activeDataset: "Dataset aktif",
    noDataset: "Belum ada dataset",
    rows: "Baris",
    columns: "Kolom",
    duplicates: "Duplikat",
    quality: "Skor kualitas",
    composition: "Komposisi dataset",
    compositionDesc: "Campuran field terdeteksi lewat pemetaan Object.keys dinamis.",
    numeric: "Numerik",
    categorical: "Kategorikal",
    empty: "Kosong",
    performance: "Ikhtisar performa",
    performanceDesc: "Visualisasi area-spline halus untuk semua kolom numerik yang terdeteksi.",
    overlay: "Overlay",
    isolate: "Isolasi",
    selectMetric: "Pilih metrik",
    preview: "Preview dataset",
    previewDesc: "Beralih antara data mentah dan ringkasan statistik deskriptif.",
    rawPreview: "Preview data mentah",
    statsSummary: "Statistik deskriptif",
    mean: "Mean",
    median: "Median",
    std: "Std Dev",
    min: "Min",
    max: "Max",
    skewness: "Skewness",
    insights: "Feed insight pintar",
    insightsDesc: "Observasi terkelompok dan dapat dibuka dari kondisi dataset aktif.",
    overview: "Ikhtisar",
    numericalAnomalies: "Anomali kolom numerik",
    categoricalTrends: "Tren nilai kategorikal",
    cleanData: "Data bersih",
    information: "Informasi",
    notice: "Catatan",
    regenerate: "Regenerasi",
    regenerating: "Meregenerasi",
    report: "Generate & Download Academic Report",
    reportDesc: "Ekspor laporan akademik lengkap menggunakan dataset aktif.",
    noPreview: "Unggah dataset untuk mengisi dashboard.",
    uploadSuccess: "Dataset berhasil dianalisis.",
    uploadError: "Dataset gagal dianalisis.",
    fetchError: "Dataset aktif gagal dimuat.",
    reportError: "Laporan gagal dibuat.",
  },
} satisfies Record<Lang, Record<string, string>>;

const DONUT_COLORS = ["#22c55e99", "#3b82f699", "#f59e0b99"];
const SERIES_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

function calculateDataQualityScore({
  totalRows,
  totalColumns,
  missingCells,
  duplicateRows,
}: {
  totalRows: number;
  totalColumns: number;
  missingCells: number;
  duplicateRows: number;
}) {
  if (totalRows <= 0 || totalColumns <= 0) return 100;

  const totalCells = totalRows * totalColumns;
  const missingPenalty = (missingCells / totalCells) * 70;
  const duplicatePenalty = (duplicateRows / totalRows) * 30;

  return Math.max(0, Math.min(100, Math.round(100 - missingPenalty - duplicatePenalty)));
}

function langFromSearch(value: string | null): Lang {
  return value?.toLowerCase().startsWith("en") ? "en" : "id";
}

function isMissing(value: unknown) {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim().replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function numberText(value: unknown, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value)
    : "-";
}

function getColumns(payload: AnalyzePayload | null, preview: DataRow[]) {
  if (payload?.metadata?.column_names?.length) return payload.metadata.column_names.map(String);
  if (preview.length === 0) return [];
  return Object.keys(preview[0]);
}

function columnKind(rows: DataRow[], column: string): "numeric" | "categorical" | "empty" {
  const values = rows.map((row) => row[column]).filter((value) => !isMissing(value));
  if (values.length === 0) return "empty";
  const numeric = values.filter((value) => toNumber(value) !== null).length;
  return numeric / values.length >= 0.8 ? "numeric" : "categorical";
}

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function computeNumericStats(rows: DataRow[], columns: string[], serverStats?: Record<string, SummaryStat>) {
  return columns
    .filter((column) => serverStats?.[column] || columnKind(rows, column) === "numeric")
    .map((column) => {
      const fromServer = serverStats?.[column];
      if (fromServer) return { column, ...fromServer };

      const values = rows
        .map((row) => toNumber(row[column]))
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
      const median = quantile(values, 0.5);
      const variance =
        mean === null || values.length < 2
          ? null
          : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
      const std = variance === null ? null : Math.sqrt(variance);
      const skewness =
        mean === null || !std || values.length < 3
          ? null
          : values.reduce((sum, value) => sum + ((value - mean) / std) ** 3, 0) / values.length;

      return {
        column,
        count: values.length,
        mean,
        median,
        std,
        min: values[0] ?? null,
        max: values[values.length - 1] ?? null,
        skewness,
      };
    });
}

function buildChartRows(rows: DataRow[], numericColumns: string[]) {
  return rows.map((row, index) => {
    const item: Record<string, number | string> = { label: String(index + 1) };
    for (const column of numericColumns) {
      const value = toNumber(row[column]);
      if (value !== null) item[column] = value;
    }
    return item;
  });
}

function buildInsights(params: {
  t: Record<string, string>;
  totalRows: number;
  totalColumns: number;
  missingPct: number;
  duplicateCount: number;
  numericStats: Array<SummaryStat & { column: string }>;
  composition: Array<{ name: string; value: number }>;
}) {
  const { t, totalRows, totalColumns, missingPct, duplicateCount, numericStats, composition } = params;
  const skewed = numericStats.filter((stat) => typeof stat.skewness === "number" && Math.abs(stat.skewness) >= 1);
  const categoricalCount = composition.find((item) => item.name === t.categorical)?.value ?? 0;

  return [
    {
      value: "overview",
      title: t.overview,
      badge: duplicateCount === 0 && missingPct < 1 ? t.cleanData : t.notice,
      badgeClass:
        duplicateCount === 0 && missingPct < 1
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
      icon: Sparkles,
      lines: [
        `${numberText(totalRows, 0)} rows and ${numberText(totalColumns, 0)} columns are active in this EDA session.`,
        `${numberText(missingPct, 2)}% missing cells and ${numberText(duplicateCount, 0)} duplicate rows were detected.`,
      ],
    },
    {
      value: "numeric",
      title: t.numericalAnomalies,
      badge: skewed.length ? t.notice : t.information,
      badgeClass: skewed.length
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      icon: Activity,
      lines: skewed.length
        ? skewed
            .slice(0, 4)
            .map(
              (stat) => `${stat.column}: skewness ${numberText(stat.skewness, 2)} suggests an asymmetric distribution.`,
            )
        : ["No strong skewness signal was found in the detected numerical columns."],
    },
    {
      value: "categorical",
      title: t.categoricalTrends,
      badge: t.information,
      badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      icon: Layers3,
      lines: [
        `${numberText(categoricalCount, 0)} categorical columns were detected from the current preview structure.`,
        "Use categorical fields as grouping dimensions when interpreting distributions and relationships.",
      ],
    },
  ];
}

function PremiumTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover/95 px-3 py-2 text-popover-foreground text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="font-semibold tabular-nums">{numberText(item.value, 2)}</span>
        </div>
      ))}
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload?: { percent?: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl border bg-popover/95 px-3 py-2 text-popover-foreground text-xs shadow-xl backdrop-blur">
      <p className="font-semibold">{item.name}</p>
      <p className="text-muted-foreground">
        {numberText(item.value, 0)} fields · {numberText((item.payload?.percent ?? 0) * 100, 1)}%
      </p>
    </div>
  );
}

function MeasuredChart({ className, children }: { className: string; children: (size: ChartSize) => ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<ChartSize | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setSize({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height),
        });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {size ? children(size) : null}
    </div>
  );
}

export default function Page() {
  const [lang, setLang] = useState<Lang>("id");
  const t = DICT[lang];

  const { dataset, setDataset, refreshDataset } = useDataset();
  const [payload, setPayload] = useState<AnalyzePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [seriesMode, setSeriesMode] = useState<SeriesMode>("overlay");
  const [activeMetric, setActiveMetric] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setLang(langFromSearch(params.get("lang") ?? params.get("language")));
  }, []);

  const preview = useMemo(() => payload?.data_preview ?? [], [payload]);
  const columns = useMemo(() => getColumns(payload, preview), [payload, preview]);
  const meta = payload?.dataset_meta ?? {};
  const totalRows = meta.total_rows ?? dataset?.rows ?? preview.length;
  const totalColumns = meta.total_columns ?? dataset?.columns ?? columns.length;
  const duplicateCount = meta.total_duplicated_rows ?? 0;
  const missingCells = meta.total_missing_cells ?? 0;
  const missingPct = totalRows * totalColumns ? (missingCells / (totalRows * totalColumns)) * 100 : 0;
  const qualityScore = calculateDataQualityScore({
    totalRows,
    totalColumns,
    missingCells,
    duplicateRows: duplicateCount,
  });

  const composition = useMemo(() => {
    const counts = { numeric: 0, categorical: 0, empty: 0 };
    for (const column of columns) counts[columnKind(preview, column)] += 1;
    const total = Math.max(1, columns.length);
    return [
      { name: t.numeric, value: counts.numeric, percent: counts.numeric / total },
      { name: t.categorical, value: counts.categorical, percent: counts.categorical / total },
      { name: t.empty, value: counts.empty, percent: counts.empty / total },
    ].filter((item) => item.value > 0);
  }, [columns, preview, t.categorical, t.empty, t.numeric]);

  const numericStats = useMemo(
    () => computeNumericStats(preview, columns, payload?.summary_stats),
    [columns, payload?.summary_stats, preview],
  );
  const numericColumns = useMemo(() => numericStats.map((stat) => stat.column), [numericStats]);
  const chartRows = useMemo(() => buildChartRows(preview, numericColumns), [numericColumns, preview]);
  const visibleSeries = seriesMode === "single" && activeMetric ? [activeMetric] : numericColumns.slice(0, 6);
  const insights = useMemo(
    () => buildInsights({ t, totalRows, totalColumns, missingPct, duplicateCount, numericStats, composition }),
    [composition, duplicateCount, missingPct, numericStats, t, totalColumns, totalRows],
  );

  const fetchActiveDataset = useCallback(async () => {
    setLoading(true);
    try {
      await refreshDataset();
      const res = await fetch(`${BACKEND_URL}/api/data/analyze`, {
        headers: { Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error(t.fetchError);
      const data = (await res.json()) as AnalyzePayload;
      if (data.status === "success") {
        setPayload(data);
        const nextNumeric = computeNumericStats(
          data.data_preview ?? [],
          getColumns(data, data.data_preview ?? []),
          data.summary_stats,
        );
        setActiveMetric(nextNumeric[0]?.column ?? "");
      } else {
        setPayload(null);
      }
    } catch {
      setPayload(null);
      setMessage({ type: "error", text: t.fetchError });
    } finally {
      setLoading(false);
    }
  }, [refreshDataset, t.fetchError]);

  useEffect(() => {
    void fetchActiveDataset();
  }, [fetchActiveDataset]);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      setUploading(true);
      setMessage(null);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`${BACKEND_URL}/api/data/analyze`, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as { detail?: string } | null;
          throw new Error(err?.detail ?? t.uploadError);
        }
        const data = (await res.json()) as AnalyzePayload;
        setPayload(data);
        setDataset({
          fileName: data.metadata?.fileName ?? file.name,
          rows: data.dataset_meta?.total_rows ?? data.metadata?.rows ?? 0,
          columns: data.dataset_meta?.total_columns ?? data.metadata?.columns ?? 0,
          fileSize: data.metadata?.fileSize ?? "-",
          uploadTime: new Date().toLocaleString(lang === "id" ? "id-ID" : "en-US"),
        } satisfies DatasetInfo);
        const nextNumeric = computeNumericStats(
          data.data_preview ?? [],
          getColumns(data, data.data_preview ?? []),
          data.summary_stats,
        );
        setActiveMetric(nextNumeric[0]?.column ?? "");
        setMessage({ type: "success", text: t.uploadSuccess });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : t.uploadError });
      } finally {
        setUploading(false);
      }
    },
    [lang, setDataset, t.uploadError, t.uploadSuccess],
  );

  const regenerateInsights = useCallback(() => {
    setRegenerating(true);
    window.setTimeout(() => setRegenerating(false), 700);
  }, []);

  const handleReport = useCallback(async () => {
    if (!dataset) return;
    setExporting(true);
    setMessage(null);
    try {
      await generateAndDownloadReport(
        "pdf",
        ["overview", "quality", "descriptive", "correlation", "visualization", "interpretation"],
        dataset.fileName,
      );
    } catch {
      setMessage({ type: "error", text: t.reportError });
    } finally {
      setExporting(false);
    }
  }, [dataset, t.reportError]);

  if (loading) {
    return (
      <div className="@container/main flex flex-col gap-4 md:gap-6">
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-4">
          {["rows", "duplicates", "quality", "columns"].map((item) => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const previewColumns = columns.slice(0, 10);

  return (
    <div className="@container/main flex min-w-0 flex-col gap-4 md:gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-semibold text-2xl tracking-tight">{t.title}</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">{t.subtitle}</p>
      </div>

      {message ? (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-sm ${
            message.type === "error"
              ? "border-destructive/25 bg-destructive/5 text-destructive"
              : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message.type === "error" ? <AlertTriangle className="size-4" /> : <CheckCircle2 className="size-4" />}
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadCloud className="size-5 text-primary" />
              {t.uploadTitle}
            </CardTitle>
            <CardDescription>{t.uploadDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="eda-dashboard-upload"
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                void handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setDragging(false);
              }}
              className={`flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
                dragging
                  ? "scale-[1.01] border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
              }`}
            >
              <input
                id="eda-dashboard-upload"
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.json"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                {uploading ? (
                  <Loader2 className="size-5 animate-spin text-primary" />
                ) : (
                  <Upload className="size-5 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm">{dragging ? t.dropActive : t.dropIdle}</p>
                <p className="mt-1 text-muted-foreground text-xs">{dataset?.fileName ?? t.noDataset}</p>
              </div>
              <Button
                type="button"
                size="sm"
                disabled={uploading}
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById("eda-dashboard-upload")?.click();
                }}
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                {uploading ? t.processing : t.chooseFile}
              </Button>
            </label>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t.composition}</CardTitle>
            <CardDescription>{t.compositionDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="relative h-44 min-h-44 min-w-0">
                <MeasuredChart className="h-full min-h-44 min-w-0">
                  {({ width, height }) => (
                    <PieChart width={width} height={height}>
                      <defs>
                        {DONUT_COLORS.map((color, index) => (
                          <linearGradient key={color} id={`donut-${index}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.45} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={composition}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={54}
                        outerRadius={78}
                        paddingAngle={4}
                        strokeWidth={0}
                      >
                        {composition.map((entry, index) => (
                          <Cell key={entry.name} fill={`url(#donut-${index % DONUT_COLORS.length})`} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  )}
                </MeasuredChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-2xl tabular-nums">{totalColumns}</span>
                  <span className="text-muted-foreground text-xs">{t.columns}</span>
                </div>
              </div>
              <div className="space-y-2">
                {composition.length ? (
                  composition.map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                        />
                        <span className="font-medium text-sm">{item.name}</span>
                      </div>
                      <span className="text-muted-foreground text-xs tabular-nums">{item.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">{t.noPreview}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: t.rows, value: totalRows, icon: Grid3X3, tone: "from-blue-500/15 to-cyan-500/5" },
          { label: t.duplicates, value: duplicateCount, icon: Database, tone: "from-amber-500/15 to-orange-500/5" },
          {
            label: t.quality,
            value: `${qualityScore}%`,
            icon: CheckCircle2,
            tone: "from-emerald-500/15 to-teal-500/5",
          },
          { label: t.columns, value: totalColumns, icon: Table2, tone: "from-violet-500/15 to-fuchsia-500/5" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className="group overflow-hidden border-border/70 bg-gradient-to-br shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015] hover:shadow-xl"
            >
              <CardContent className={`bg-gradient-to-br ${item.tone} p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-sm">{item.label}</p>
                  <div className="flex size-9 items-center justify-center rounded-lg border bg-background/60 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-4 text-primary" />
                  </div>
                </div>
                <p className="mt-3 font-bold text-3xl tabular-nums">
                  {typeof item.value === "number" ? numberText(item.value, 0) : item.value}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-5 text-primary" />
              {t.performance}
            </CardTitle>
            <CardDescription>{t.performanceDesc}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border bg-muted/40 p-1">
              {(["overlay", "single"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSeriesMode(mode)}
                  className={`rounded-md px-3 py-1.5 font-medium text-xs transition-all ${
                    seriesMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {mode === "overlay" ? t.overlay : t.isolate}
                </button>
              ))}
            </div>
            <select
              value={activeMetric}
              onChange={(event) => setActiveMetric(event.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none transition-all hover:border-primary/50 focus:border-primary focus:ring-3 focus:ring-primary/15"
            >
              {numericColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {chartRows.length && visibleSeries.length ? (
            <MeasuredChart className="h-[360px] min-h-[360px] min-w-0">
              {({ width, height }) => (
                <AreaChart
                  width={width}
                  height={height}
                  data={chartRows}
                  margin={{ left: 0, right: 16, top: 12, bottom: 0 }}
                >
                  <defs>
                    {visibleSeries.map((series, index) => (
                      <linearGradient key={series} id={`area-${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SERIES_COLORS[index % SERIES_COLORS.length]} stopOpacity={0.28} />
                        <stop
                          offset="100%"
                          stopColor={SERIES_COLORS[index % SERIES_COLORS.length]}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} width={42} />
                  <Tooltip content={<PremiumTooltip />} />
                  {visibleSeries.map((series, index) => (
                    <Area
                      key={series}
                      type="monotone"
                      dataKey={series}
                      stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
                      fill={`url(#area-${index})`}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              )}
            </MeasuredChart>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-xl border border-dashed text-muted-foreground text-sm">
              {t.noPreview}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t.preview}</CardTitle>
          <CardDescription>{t.previewDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="raw" className="gap-4">
            <TabsList className="w-full justify-start sm:w-fit">
              <TabsTrigger value="raw">{t.rawPreview}</TabsTrigger>
              <TabsTrigger value="stats">{t.statsSummary}</TabsTrigger>
            </TabsList>
            <TabsContent value="raw">
              <div className="max-h-[430px] overflow-auto rounded-xl border">
                <table className="w-full min-w-max text-sm">
                  <thead className="sticky top-0 z-10 bg-background shadow-sm">
                    <tr>
                      <th className="w-12 px-3 py-3 text-left font-semibold text-muted-foreground">#</th>
                      {previewColumns.map((column) => (
                        <th key={column} className="px-3 py-3 text-left font-semibold text-muted-foreground">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, rowIndex) => (
                      <tr key={JSON.stringify(row)} className="border-t odd:bg-muted/20 hover:bg-primary/5">
                        <td className="px-3 py-2 font-medium text-muted-foreground">{rowIndex + 1}</td>
                        {previewColumns.map((column) => (
                          <td key={column} className="max-w-56 truncate px-3 py-2" title={String(row[column] ?? "")}>
                            {isMissing(row[column]) ? "-" : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="stats">
              <div className="overflow-auto rounded-xl border">
                <table className="w-full min-w-max text-sm">
                  <thead className="sticky top-0 bg-background shadow-sm">
                    <tr>
                      {["Column", t.mean, t.median, t.std, t.min, t.max, t.skewness].map((head) => (
                        <th key={head} className="px-3 py-3 text-left font-semibold text-muted-foreground">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericStats.map((stat) => (
                      <tr key={stat.column} className="border-t odd:bg-muted/20 hover:bg-primary/5">
                        <td className="px-3 py-2 font-medium">{stat.column}</td>
                        <td className="px-3 py-2 tabular-nums">{numberText(stat.mean, 3)}</td>
                        <td className="px-3 py-2 tabular-nums">{numberText(stat.median, 3)}</td>
                        <td className="px-3 py-2 tabular-nums">{numberText(stat.std, 3)}</td>
                        <td className="px-3 py-2 tabular-nums">{numberText(stat.min, 3)}</td>
                        <td className="px-3 py-2 tabular-nums">{numberText(stat.max, 3)}</td>
                        <td className="px-3 py-2 tabular-nums">
                          <Badge
                            variant="outline"
                            className={
                              typeof stat.skewness === "number" && Math.abs(stat.skewness) >= 1
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                : ""
                            }
                          >
                            {numberText(stat.skewness, 3)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {numericStats.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                          {t.noPreview}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-5 text-primary" />
              {t.insights}
            </CardTitle>
            <CardDescription>{t.insightsDesc}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={regenerateInsights} disabled={regenerating}>
            {regenerating ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {regenerating ? t.regenerating : t.regenerate}
          </Button>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["overview"]} className="gap-3">
            {insights.map((item) => {
              const Icon = item.icon;
              return (
                <AccordionItem key={item.value} value={item.value} className="rounded-xl border bg-muted/15 px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">{item.title}</p>
                        <Badge variant="outline" className={`mt-1 ${item.badgeClass}`}>
                          {item.badge}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pl-12">
                      {item.lines.map((line) => (
                        <div
                          key={line}
                          className="flex gap-2 rounded-lg bg-background/70 px-3 py-2 text-muted-foreground"
                        >
                          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          <p>{line}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t.report}</p>
            <p className="text-muted-foreground text-sm">{t.reportDesc}</p>
          </div>
          <Button className="h-11 shrink-0" disabled={!dataset || exporting} onClick={() => void handleReport()}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            {t.report}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
