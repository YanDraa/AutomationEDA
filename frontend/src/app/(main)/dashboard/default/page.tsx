"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  TrendingUp,
  Upload,
  UploadCloud,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    subtitle: "Dataset command center — upload, health check, trends, statistics & AI insights.",
    uploadTitle: "Dataset Control",
    uploadDesc: "Drop a dataset to instantly refresh every panel.",
    dropIdle: "Drag a CSV / XLSX / JSON",
    dropActive: "Drop to analyze",
    chooseFile: "Choose File",
    processing: "Processing",
    activeDataset: "Active dataset",
    noDataset: "No dataset loaded",
    rows: "Total Rows",
    columns: "Total Columns",
    duplicates: "Duplicate Rows",
    quality: "Quality Score",
    composition: "Dataset Composition",
    compositionDesc: "Detected field mix based on dynamic Object.keys mapping.",
    numeric: "Numeric",
    categorical: "Categorical",
    empty: "Empty",
    performance: "Performance Overview",
    performanceDesc: "Numeric column trends",
    overlay: "Overlay",
    isolate: "Isolate",
    selectMetric: "Select metric",
    preview: "Raw Preview",
    statsSummary: "Descriptive Stats",
    rawPreview: "Raw Preview",
    mean: "Mean",
    median: "Median",
    std: "Std Dev",
    min: "Min",
    max: "Max",
    skewness: "Skewness",
    insights: "Smart Insights",
    insightsDesc: "Grouped, expandable observations generated from the active dataset state.",
    overview: "Overview",
    numericalAnomalies: "Numerical Anomalies",
    categoricalTrends: "Categorical Trends",
    cleanData: "Clean Data",
    information: "Info",
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
    exportPdf: "Export PDF",
    columnsShown: "columns shown",
  },
  id: {
    title: "Dashboard EDA Otomatis",
    subtitle: "Pusat komando dataset — unggah, cek kesehatan, tren, statistik & insight AI.",
    uploadTitle: "Dataset Control",
    uploadDesc: "Letakkan dataset untuk memperbarui seluruh panel secara instan.",
    dropIdle: "Seret file CSV / XLSX / JSON",
    dropActive: "Lepaskan untuk analisis",
    chooseFile: "Pilih File",
    processing: "Memproses",
    activeDataset: "Dataset aktif",
    noDataset: "Belum ada dataset",
    rows: "Total Baris",
    columns: "Total Kolom",
    duplicates: "Duplikat",
    quality: "Skor Kualitas",
    composition: "Komposisi Dataset",
    compositionDesc: "Campuran field terdeteksi lewat pemetaan Object.keys dinamis.",
    numeric: "Numerik",
    categorical: "Kategorikal",
    empty: "Kosong",
    performance: "Ikhtisar Performa",
    performanceDesc: "Tren kolom numerik",
    overlay: "Overlay",
    isolate: "Isolasi",
    selectMetric: "Pilih metrik",
    preview: "Preview Mentah",
    statsSummary: "Statistik Deskriptif",
    rawPreview: "Preview Mentah",
    mean: "Mean",
    median: "Median",
    std: "Std Dev",
    min: "Min",
    max: "Max",
    skewness: "Skewness",
    insights: "Smart Insights",
    insightsDesc: "Observasi terkelompok dan dapat dibuka dari kondisi dataset aktif.",
    overview: "Ikhtisar",
    numericalAnomalies: "Anomali Numerik",
    categoricalTrends: "Tren Kategorikal",
    cleanData: "Data Bersih",
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
    exportPdf: "Export PDF",
    columnsShown: "kolom ditampilkan",
  },
} satisfies Record<Lang, Record<string, string>>;

const DONUT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b"];
const SERIES_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6"];

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
      badgeVariant: duplicateCount === 0 && missingPct < 1 ? "success" : "warning",
      icon: Sparkles,
      lines: [
        `${numberText(totalRows, 0)} rows and ${numberText(totalColumns, 0)} columns are active.`,
        `${numberText(missingPct, 2)}% missing cells and ${numberText(duplicateCount, 0)} duplicate rows detected.`,
      ],
    },
    {
      value: "numeric",
      title: t.numericalAnomalies,
      badge: skewed.length ? t.notice : t.information,
      badgeVariant: skewed.length ? "warning" : "info",
      icon: Activity,
      lines: skewed.length
        ? skewed
            .slice(0, 4)
            .map((stat) => `${stat.column}: skewness ${numberText(stat.skewness, 2)} suggests asymmetric distribution.`)
        : ["No strong skewness signal found in detected numerical columns."],
    },
    {
      value: "categorical",
      title: t.categoricalTrends,
      badge: t.information,
      badgeVariant: "info",
      icon: Layers3,
      lines: [
        `${numberText(categoricalCount, 0)} categorical columns detected from preview structure.`,
        "Use categorical fields as grouping dimensions when interpreting distributions.",
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
    <div className="rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 py-0.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">{numberText(item.value, 2)}</span>
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
    <div className="rounded-xl border border-border/50 bg-background/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
      <p className="font-semibold text-foreground">{item.name}</p>
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
        setSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
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

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  accentColor: string;
}

function StatCard({ label, value, icon: Icon, gradient, iconBg, iconColor, accentColor }: StatCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${gradient}`}
    >
      <div className={`absolute -right-4 -top-4 size-20 rounded-full opacity-10 blur-xl pointer-events-none ${accentColor}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{label}</p>
          <p className="mt-2 font-bold text-3xl tabular-nums tracking-tight text-foreground">
            {typeof value === "number" ? numberText(value, 0) : value}
          </p>
        </div>
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconBg} shadow-sm transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={`size-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-2">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm leading-tight text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Pill({ variant, children }: { variant: "success" | "warning" | "info"; children: ReactNode }) {
  const cls = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  }[variant];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${cls}`}>
      {children}
    </span>
  );
}

function InsightItem({
  item,
}: {
  item: ReturnType<typeof buildInsights>[number];
}) {
  const [open, setOpen] = useState(item.value === "overview");
  const Icon = item.icon;
  return (
    <div className="rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm border border-border/50">
          <Icon className="size-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-xs text-foreground leading-tight">{item.title}</p>
          <div className="mt-1">
            <Pill variant={item.badgeVariant as "success" | "warning" | "info"}>{item.badge}</Pill>
          </div>
        </div>
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-1.5 px-3.5 pb-3.5">
          {item.lines.map((line) => (
            <div
              key={line}
              className="flex gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed break-words"
            >
              <Info className="mt-0.5 size-3.5 shrink-0 text-primary/70" />
              <p>{line}</p>
            </div>
          ))}
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<"raw" | "stats">("raw");

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
      <div className="flex flex-col gap-6 p-1">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 rounded-xl" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
        <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-[260px_1fr_280px]">
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
          <Skeleton className="h-[520px] rounded-2xl" />
        </div>
      </div>
    );
  }

  const previewColumns = columns.slice(0, 10);

  return (
    <div className="flex min-w-0 flex-col gap-5 p-1">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight text-foreground">{t.title}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={!dataset || exporting}
          onClick={() => void handleReport()}
          className="shrink-0 gap-1.5 self-start rounded-xl border-border/60 text-xs font-medium shadow-sm hover:shadow-md transition-shadow"
        >
          {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
          {t.exportPdf}
        </Button>
      </div>

      {/* ── Alert Banner ────────────────────────────────────────────────── */}
      {message && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all ${
            message.type === "error"
              ? "border-destructive/25 bg-destructive/5 text-destructive"
              : "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message.type === "error" ? (
            <AlertTriangle className="size-4 shrink-0" />
          ) : (
            <CheckCircle2 className="size-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* ── Stat Cards Row ───────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4 py-0.5">
        <StatCard
          label={t.rows}
          value={totalRows}
          icon={Grid3X3}
          gradient="bg-gradient-to-br from-blue-500/5 to-transparent"
          iconBg="bg-blue-500/10"
          iconColor="text-blue-500"
          accentColor="bg-blue-500"
        />
        <StatCard
          label={t.duplicates}
          value={duplicateCount}
          icon={Database}
          gradient="bg-gradient-to-br from-amber-500/5 to-transparent"
          iconBg="bg-amber-500/10"
          iconColor="text-amber-500"
          accentColor="bg-amber-500"
        />
        <StatCard
          label={t.quality}
          value={`${qualityScore}%`}
          icon={CheckCircle2}
          gradient="bg-gradient-to-br from-emerald-500/5 to-transparent"
          iconBg="bg-emerald-500/10"
          iconColor="text-emerald-500"
          accentColor="bg-emerald-500"
        />
        <StatCard
          label={t.columns}
          value={totalColumns}
          icon={Table2}
          gradient="bg-gradient-to-br from-violet-500/5 to-transparent"
          iconBg="bg-violet-500/10"
          iconColor="text-violet-500"
          accentColor="bg-violet-500"
        />
      </div>

      {/* ── 3-Column Main Layout ─────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-[260px_1fr_280px] xl:grid-cols-[280px_1fr_300px] py-0.5">

        {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <SectionHeader icon={UploadCloud} title={t.uploadTitle} subtitle={t.uploadDesc} />
            <div className="px-5 pb-5 pt-1">
              <label
                htmlFor="eda-dashboard-upload"
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void handleFile(e.dataTransfer.files?.[0]);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragging(false);
                }}
                className={`flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border-2 border-dashed p-4 text-center transition-all duration-300 ${
                  dragging
                    ? "scale-[1.02] border-primary bg-primary/5 shadow-md"
                    : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/30"
                }`}
              >
                <input
                  id="eda-dashboard-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,.txt,.json"
                  className="hidden"
                  onChange={(e) => {
                    void handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div
                  className={`flex size-10 items-center justify-center rounded-xl transition-all duration-300 ${
                    dragging ? "bg-primary/15 scale-110" : "bg-muted/50"
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="size-4.5 animate-spin text-primary" />
                  ) : (
                    <Upload className={`size-4.5 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-xs text-foreground">{dragging ? t.dropActive : t.dropIdle}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground break-all max-w-[200px]">
                    {dataset?.fileName ?? t.noDataset}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("eda-dashboard-upload")?.click();
                  }}
                  className="h-7 rounded-lg px-3 text-xs gap-1.5 font-semibold"
                >
                  {uploading ? <Loader2 className="size-3 animate-spin" /> : <FileSpreadsheet className="size-3" />}
                  {uploading ? t.processing : t.chooseFile}
                </Button>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm flex-1">
            <SectionHeader icon={BarChart3} title={t.composition} />
            <div className="px-5 pb-5 pt-1">
              <div className="relative h-36">
                <MeasuredChart className="h-full w-full">
                  {({ width, height }) => (
                    <PieChart width={width} height={height}>
                      <defs>
                        {DONUT_COLORS.map((color, i) => (
                          <radialGradient key={color} id={`donut-g-${i}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.5} />
                          </radialGradient>
                        ))}
                      </defs>
                      <Pie
                        data={composition.length ? composition : [{ name: "—", value: 1 }]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={46}
                        outerRadius={64}
                        paddingAngle={3}
                        strokeWidth={0}
                      >
                        {(composition.length ? composition : [{ name: "—", value: 1 }]).map((entry, i) => (
                          <Cell
                            key={entry.name}
                            fill={composition.length ? `url(#donut-g-${i % DONUT_COLORS.length})` : "#e5e7eb"}
                          />
                        ))}
                      </Pie>
                      {composition.length > 0 && <Tooltip content={<DonutTooltip />} />}
                    </PieChart>
                  )}
                </MeasuredChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-bold text-xl tabular-nums">{totalColumns}</span>
                  <span className="text-[10px] text-muted-foreground">{t.columns.split(" ").pop()}</span>
                </div>
              </div>

              <div className="mt-2 space-y-1.5">
                {composition.length ? (
                  composition.map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                        />
                        <span className="text-xs font-semibold text-foreground">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{item.value}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-muted-foreground py-2">{t.noPreview}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MIDDLE COLUMN ────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 min-w-0">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-2">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight text-foreground">{t.performance}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.performanceDesc} · {numericColumns.length} {t.columns.toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="inline-flex rounded-lg border border-border/60 bg-muted/30 p-0.5">
                  {(["overlay", "single"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSeriesMode(mode)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        seriesMode === mode
                          ? "bg-background text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "overlay" ? t.overlay : t.isolate}
                    </button>
                  ))}
                </div>
                <select
                  value={activeMetric}
                  onChange={(e) => setActiveMetric(e.target.value)}
                  className="h-7 rounded-lg border border-border/60 bg-background px-2 text-[11px] text-foreground font-semibold shadow-xs outline-none transition-colors hover:border-primary/50 focus:border-primary"
                >
                  {numericColumns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-3 pb-4">
              {chartRows.length && visibleSeries.length ? (
                <MeasuredChart className="h-[200px] min-h-[200px] w-full">
                  {({ width, height }) => (
                    <AreaChart
                      width={width}
                      height={height}
                      data={chartRows}
                      margin={{ left: 0, right: 12, top: 8, bottom: 0 }}
                    >
                      <defs>
                        {visibleSeries.map((s, i) => (
                          <linearGradient key={s} id={`area-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.25} />
                            <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.06} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.4 }} width={36} />
                      <Tooltip content={<PremiumTooltip />} />
                      {visibleSeries.map((s, i) => (
                        <Area
                          key={s}
                          type="monotone"
                          dataKey={s}
                          stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                          fill={`url(#area-g-${i})`}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                          connectNulls
                        />
                      ))}
                    </AreaChart>
                  )}
                </MeasuredChart>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-border/40 text-xs text-muted-foreground">
                  {t.noPreview}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card shadow-sm flex-1">
            <div className="flex items-center justify-between border-b border-border/40 px-5 pt-4 pb-0">
              <div className="flex gap-1">
                {(["raw", "stats"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "raw" ? t.rawPreview : t.statsSummary}
                  </button>
                ))}
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground pb-2">
                {previewColumns.length} {t.columnsShown}
              </span>
            </div>

            {activeTab === "raw" && (
              <div className="overflow-auto max-h-[360px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-xs">
                    <tr className="border-b border-border/40">
                      <th className="px-4 py-3 text-left font-bold text-muted-foreground w-10">#</th>
                      {previewColumns.map((col) => (
                        <th key={col} className="px-4 py-3 text-left font-bold text-muted-foreground whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, ri) => (
                      <tr
                        key={JSON.stringify(row)}
                        className="border-b border-border/20 transition-colors odd:bg-muted/10 hover:bg-primary/5"
                      >
                        <td className="px-4 py-2.5 font-medium text-muted-foreground">{ri + 1}</td>
                        {previewColumns.map((col) => (
                          <td key={col} className="px-4 py-2.5 text-foreground/80 break-words max-w-xs" title={String(row[col] ?? "")}>
                            {isMissing(row[col]) ? (
                              <span className="text-muted-foreground/40">—</span>
                            ) : (
                              String(row[col])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {preview.length === 0 && (
                      <tr>
                        <td colSpan={previewColumns.length + 1} className="px-4 py-10 text-center text-muted-foreground">
                          {t.noPreview}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "stats" && (
              <div className="overflow-auto max-h-[360px]">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur-xs">
                    <tr className="border-b border-border/40">
                      {["Column", t.mean, t.median, t.std, t.min, t.max, t.skewness].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-bold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {numericStats.map((stat) => (
                      <tr
                        key={stat.column}
                        className="border-b border-border/20 transition-colors odd:bg-muted/10 hover:bg-primary/5"
                      >
                        <td className="px-4 py-2.5 font-bold text-foreground">{stat.column}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{numberText(stat.mean, 3)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{numberText(stat.median, 3)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{numberText(stat.std, 3)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{numberText(stat.min, 3)}</td>
                        <td className="px-4 py-2.5 tabular-nums text-foreground/80">{numberText(stat.max, 3)}</td>
                        <td className="px-4 py-2.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0.5 px-2 font-bold ${
                              typeof stat.skewness === "number" && Math.abs(stat.skewness) >= 1
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "text-foreground/70 border-border/60"
                            }`}
                          >
                            {numberText(stat.skewness, 3)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {numericStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                          {t.noPreview}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm flex-1">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Bot className="size-4 text-primary" />
                </div>
                <p className="font-bold text-sm text-foreground">{t.insights}</p>
              </div>
              <button
                type="button"
                onClick={regenerateInsights}
                disabled={regenerating}
                className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-muted/30 text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground disabled:opacity-50"
                title={t.regenerate}
              >
                <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="space-y-2.5 px-5 pb-5 pt-1">
              {insights.map((item) => (
                <InsightItem key={item.value} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Report Card ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card shadow-sm py-1">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Download className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">{t.report}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t.reportDesc}</p>
            </div>
          </div>
          <Button
            size="sm"
            disabled={!dataset || exporting}
            onClick={() => void handleReport()}
            className="shrink-0 gap-1.5 rounded-xl text-xs font-bold px-4 shadow-xs"
          >
            {exporting ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {t.exportPdf}
          </Button>
        </div>
      </div>
    </div>
  );
}
