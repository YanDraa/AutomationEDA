"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Calculator,
  CaseSensitive,
  CheckCircle2,
  Copy,
  Database,
  Grid3X3,
  Hash,
  RefreshCw,
  ShieldCheck,
  Sigma,
  Sparkles,
  Table2,
  Trash2,
  Upload,
  Zap,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

type MissingAction = "impute_mean" | "impute_median" | "impute_mode" | "drop_missing_rows";
type BulkAction = "drop_duplicates" | "reset_raw";
type AnyAction = BulkAction | MissingAction | "standardize_text";

type ColumnDetail = { column: string; type: string; missing_count: number };

const MISSING_OPTIONS: { value: MissingAction; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "impute_mean", label: "Mean", desc: "Fill with average (normal distribution)", icon: Sigma },
  { value: "impute_median", label: "Median", desc: "Fill with middle value (outlier-safe)", icon: Hash },
  { value: "impute_mode", label: "Mode", desc: "Fill with most frequent value", icon: Calculator },
  { value: "drop_missing_rows", label: "Drop Rows", desc: "Remove any row with NaN", icon: Trash2 },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function qualityScore(totalCells: number, missing: number, duplicates: number): number {
  if (totalCells === 0) return 100;
  const missingP = (missing / totalCells) * 60;
  const dupP = (duplicates / totalCells) * 30;
  return Math.max(0, Math.round(100 - missingP - dupP));
}

function qualityInfo(score: number) {
  if (score >= 95) return { text: "Excellent", gradient: "from-emerald-500 to-teal-400" };
  if (score >= 80) return { text: "Good", gradient: "from-blue-500 to-cyan-400" };
  if (score >= 60) return { text: "Fair", gradient: "from-amber-500 to-yellow-400" };
  return { text: "Poor", gradient: "from-red-500 to-orange-400" };
}

// ─── Circular Progress Ring ─────────────────────────────────────────────────

function ProgressRing({ score, size = 100, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const info = qualityInfo(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/50" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className={`transition-all duration-700 ease-out`}
          style={{ stroke: `url(#score-gradient)` }}
        />
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={`[stop-color:var(--tw-gradient-from)]`} style={{ stopColor: "rgb(16,185,129)" }} />
            <stop offset="100%" className={`[stop-color:var(--tw-gradient-to)]`} style={{ stopColor: score >= 80 ? "rgb(45,212,191)" : score >= 60 ? "rgb(251,191,36)" : "rgb(249,115,22)" }} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-bold text-2xl tabular-nums leading-none">{score}</span>
        <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">score</span>
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center gap-6 overflow-x-hidden py-24 text-center">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-xl" />
        <div className="relative rounded-2xl border bg-card p-6 shadow-lg">
          <Database className="size-12 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-xl">No dataset loaded</p>
        <p className="mt-2 text-muted-foreground text-sm">Upload a file first to start cleaning your data.</p>
      </div>
      <Button asChild size="lg" className="shadow-md">
        <Link href="/dashboard/upload-data"><Upload className="size-4" /> Upload Dataset</Link>
      </Button>
    </div>
  );
}

// ─── Stat Chip ──────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, accent, sub }: { icon: React.ReactNode; label: string; value: string; accent: string; sub?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card/50 p-3 backdrop-blur-sm">
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-muted-foreground text-[11px] font-medium uppercase tracking-wider">{label}</p>
        <p className="font-bold text-lg tabular-nums leading-tight tracking-tight">{value}</p>
      </div>
      {sub}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [executing, setExecuting] = useState<AnyAction | null>(null);
  const [selectedMissing, setSelectedMissing] = useState<MissingAction>("impute_mean");

  const [totalRows, setTotalRows] = useState(0);
  const [totalCols, setTotalCols] = useState(0);
  const [duplicatedRows, setDuplicatedRows] = useState(0);
  const [missingCells, setMissingCells] = useState(0);
  const [columnsDetail, setColumnsDetail] = useState<ColumnDetail[]>([]);

  const score = useMemo(() => qualityScore(totalRows * totalCols, missingCells, duplicatedRows), [totalRows, totalCols, missingCells, duplicatedRows]);
  const qInfo = useMemo(() => qualityInfo(score), [score]);
  const hasIssues = duplicatedRows > 0 || missingCells > 0;
  const issueCount = (duplicatedRows > 0 ? 1 : 0) + (missingCells > 0 ? 1 : 0);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/cleaning-summary`, { method: "GET", credentials: "include" });
      if (!res.ok) { setHasData(false); return; }
      const json = await res.json();
      if (json.status === "no_data") { router.replace("/dashboard/upload-data"); return; }
      if (json.status === "success") {
        setTotalRows((json.total_rows as number) ?? 0);
        setTotalCols((json.total_columns as number) ?? 0);
        setDuplicatedRows((json.total_duplicated_rows as number) ?? 0);
        setMissingCells((json.total_missing_cells as number) ?? 0);
        setColumnsDetail((json.columns_detail as ColumnDetail[]) ?? []);
        setHasData(true);
      }
    } catch { setHasData(false); }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function init() { await fetchSummary(); if (!cancelled) setLoading(false); }
    init();
    return () => { cancelled = true; };
  }, [fetchSummary]);

  const executeBulkAction = useCallback(async (action: BulkAction) => {
    setExecuting(action);
    try {
      const res = await fetch(`${API_BASE}/api/data/execute-cleaning`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action }) });
      const json = await res.json();
      if (json.status === "success") {
        setTotalRows((json.total_rows as number) ?? 0); setTotalCols((json.total_columns as number) ?? 0);
        setDuplicatedRows((json.total_duplicated_rows as number) ?? 0); setMissingCells((json.total_missing_cells as number) ?? 0);
        await fetchSummary(); toast.success(json.message ?? "Done.");
      } else { toast.error(json.detail ?? "Failed."); }
    } catch { toast.error("Cannot connect to backend."); } finally { setExecuting(null); }
  }, [fetchSummary]);

  const executeGranularAction = useCallback(async (action: MissingAction | "standardize_text") => {
    setExecuting(action);
    try {
      const res = await fetch(`${API_BASE}/api/data/clean`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ action }) });
      const json = await res.json();
      if (json.status === "success") {
        const meta = json.dataset_meta ?? {};
        setTotalRows((meta.total_rows as number) ?? 0); setTotalCols((meta.total_columns as number) ?? 0);
        setDuplicatedRows((meta.total_duplicated_rows as number) ?? 0); setMissingCells((meta.total_missing_cells as number) ?? 0);
        await fetchSummary();
        const c = json.changes ?? {};
        const lbl: Record<string, string> = { impute_mean: "Impute Mean", impute_median: "Impute Median", impute_mode: "Impute Mode", drop_missing_rows: "Drop Rows", standardize_text: "Standardize" };
        let msg: string;
        if (action === "drop_missing_rows") msg = `${lbl[action]} — ${String(c.rows_removed)} removed, ${String(c.rows_after)} left.`;
        else if (action === "standardize_text") msg = `${lbl[action]} — all text columns normalized.`;
        else msg = `${lbl[action]} — missing: ${String(c.missing_before)} → ${String(c.missing_after)}.`;
        toast.success(msg);
      } else { toast.error(json.detail ?? "Failed."); }
    } catch { toast.error("Cannot connect to backend."); } finally { setExecuting(null); }
  }, [fetchSummary]);

  // ─── Loading ──
  if (loading) {
    return (
      <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden px-2">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }
  if (!hasData) return <EmptyState />;

  const isBusy = executing !== null;
  const selOpt = MISSING_OPTIONS.find((o) => o.value === selectedMissing)!;
  const cleanCols = columnsDetail.filter((c) => c.missing_count === 0).length;
  const dirtyCols = columnsDetail.length - cleanCols;

  return (
    <div className="@container/clean flex w-full max-w-full flex-col gap-5 overflow-x-hidden px-2">
      {/* ═══ HERO BANNER ═══ */}
      <div className="relative overflow-hidden rounded-2xl border shadow-md">
        {/* gradient accent */}
        <div className={`absolute inset-0 bg-gradient-to-br ${qInfo.gradient} opacity-[0.07]`} />
        <div className="absolute -top-20 -right-20 size-60 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 p-5 sm:p-6">
          {/* top row: score + stats */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            {/* Quality Ring */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <ProgressRing score={score} />
              <Badge variant="outline" className={`text-xs font-bold ${score >= 80 ? "text-emerald-600 dark:text-emerald-400" : score >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400"}`}>
                {qInfo.text}
              </Badge>
            </div>
            {/* Stats Grid */}
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatChip icon={<Grid3X3 className="size-5" />} label="Rows" value={totalRows.toLocaleString()} accent="bg-blue-500/10 text-blue-600 dark:text-blue-400" />
              <StatChip icon={<Table2 className="size-5" />} label="Columns" value={String(totalCols)} accent="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
              <StatChip
                icon={<Copy className="size-5" />} label="Duplicates" value={duplicatedRows.toLocaleString()}
                accent={duplicatedRows > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"}
                sub={duplicatedRows > 0 ? <Badge variant="destructive" className="shrink-0 text-[10px]">!</Badge> : <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
              />
              <StatChip
                icon={<AlertTriangle className="size-5" />} label="Missing" value={missingCells.toLocaleString()}
                accent={missingCells > 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-muted text-muted-foreground"}
                sub={missingCells > 0 ? <Badge variant="destructive" className="shrink-0 text-[10px]">!</Badge> : <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />}
              />
            </div>
          </div>
          {/* bottom summary line */}
          <Separator className="opacity-30" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {hasIssues ? (
              <>
                <Zap className="size-4 text-amber-500" />
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{issueCount} issue{issueCount > 1 ? "s" : ""}</span> detected —{" "}
                  {duplicatedRows > 0 && <span>{duplicatedRows.toLocaleString()} duplicates </span>}
                  {duplicatedRows > 0 && missingCells > 0 && <span>· </span>}
                  {missingCells > 0 && <span>{missingCells.toLocaleString()} missing cells </span>}
                  — use the actions below to fix them
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="size-4 text-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Dataset is clean</span>
                <span className="text-muted-foreground">— no duplicates or missing values detected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ ACTION CARDS ═══ */}
      <div className="grid min-w-0 grid-cols-1 gap-4 @2xl/clean:grid-cols-2 [&>*]:flex [&>*]:flex-col">

        {/* ── 1. Duplicates ── */}
        <Card className="min-w-0 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${duplicatedRows > 0 ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                {duplicatedRows > 0 ? <Copy className="size-5" /> : <CheckCircle2 className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Handling Duplicates</CardTitle>
                <CardDescription className="text-xs">
                  {duplicatedRows > 0 ? `${duplicatedRows.toLocaleString()} duplicate rows found` : "No duplicates detected"}
                </CardDescription>
              </div>
              {duplicatedRows > 0 ? (
                <Badge variant="destructive" className="shrink-0 text-xs">{duplicatedRows.toLocaleString()}</Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Clean</Badge>
              )}
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="flex flex-1 flex-col justify-between pt-4">
            {duplicatedRows > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-2.5 rounded-lg bg-amber-500/5 p-3.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Removing duplicates will reduce your dataset from{" "}
                    <span className="font-semibold text-foreground">{totalRows.toLocaleString()}</span> to{" "}
                    <span className="font-semibold text-foreground">{(totalRows - duplicatedRows).toLocaleString()}</span> rows.
                  </p>
                </div>
                <Button variant="destructive" size="lg" onClick={() => executeBulkAction("drop_duplicates")} disabled={isBusy} className="h-auto w-full min-w-0 whitespace-normal py-5 text-sm font-semibold shadow-sm">
                  {executing === "drop_duplicates" ? <><Spinner className="size-4" /> Processing...</> : <><Trash2 className="size-4" /> Remove All Duplicates</>}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 text-sm dark:text-emerald-400">All good!</p>
                  <p className="text-emerald-600/60 text-xs dark:text-emerald-400/60">No duplicate rows in the dataset</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 2. Missing Values ── */}
        <Card className="min-w-0 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${missingCells > 0 ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                {missingCells > 0 ? <AlertTriangle className="size-5" /> : <CheckCircle2 className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Handling Missing Values</CardTitle>
                <CardDescription className="text-xs">
                  {missingCells > 0 ? `${missingCells.toLocaleString()} missing cells detected` : "All cells populated"}
                </CardDescription>
              </div>
              {missingCells > 0 ? (
                <Badge variant="destructive" className="shrink-0 text-xs">{missingCells.toLocaleString()}</Badge>
              ) : (
                <Badge variant="outline" className="shrink-0 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">Clean</Badge>
              )}
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="flex flex-1 flex-col justify-between pt-4">
            {missingCells > 0 ? (
              <div className="flex flex-col gap-4">
                <RadioGroup
                  value={selectedMissing}
                  onValueChange={(v) => setSelectedMissing(v as MissingAction)}
                  disabled={isBusy}
                  className="grid grid-cols-2 gap-2"
                >
                  {MISSING_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedMissing === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                        }`}
                      >
                        <RadioGroupItem value={opt.value} className="mt-0.5 shrink-0" />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <Icon className="size-3.5 text-muted-foreground" />
                            <span className="font-medium text-sm">{opt.label}</span>
                          </div>
                          <span className="text-muted-foreground text-[11px] leading-snug">{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </RadioGroup>
                <Button variant="outline" size="lg" onClick={() => executeGranularAction(selectedMissing)} disabled={isBusy} className="h-auto w-full min-w-0 whitespace-normal py-5 text-sm font-semibold shadow-sm">
                  {(["impute_mean", "impute_median", "impute_mode", "drop_missing_rows"] as const).includes(executing as any) ? (
                    <><Spinner className="size-4" /> Processing...</>
                  ) : (
                    <><Sparkles className="size-4" /> Execute Cleaning</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-700 text-sm dark:text-emerald-400">All good!</p>
                  <p className="text-emerald-600/60 text-xs dark:text-emerald-400/60">No NaN or empty values found</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 3. Text Standardization ── */}
        <Card className="min-w-0 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <CaseSensitive className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Text Standardization</CardTitle>
                <CardDescription className="text-xs">Normalize all string columns</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="flex flex-1 flex-col justify-between pt-4">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/10 bg-teal-500/5 px-3 py-2.5">
                  <div className="size-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span className="text-foreground text-xs font-medium">Trim whitespace</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/10 bg-teal-500/5 px-3 py-2.5">
                  <div className="size-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span className="text-foreground text-xs font-medium">Lowercase all</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg border border-teal-500/10 bg-teal-500/5 px-3 py-2.5">
                  <div className="size-1.5 shrink-0 rounded-full bg-teal-500" />
                  <span className="text-foreground text-xs font-medium">Null &quot;nan&quot;/&quot;none&quot;</span>
                </div>
              </div>
              <Button size="lg" onClick={() => executeGranularAction("standardize_text")} disabled={isBusy} className="h-auto w-full min-w-0 whitespace-normal py-5 text-sm font-semibold shadow-sm">
                {executing === "standardize_text" ? <><Spinner className="size-4" /> Processing...</> : <><CaseSensitive className="size-4" /> Standardize Text & Categories</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 4. Reset to Raw ── */}
        <Card className="min-w-0 overflow-hidden shadow-sm transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400">
                <RefreshCw className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base">Reset to Raw Data</CardTitle>
                <CardDescription className="text-xs">Restore original dataset from data_raw.pkl</CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator className="opacity-50" />
          <CardContent className="flex flex-1 flex-col justify-between pt-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2.5 rounded-lg bg-slate-500/5 p-3.5">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <p className="text-muted-foreground text-sm leading-relaxed">
                  This is <span className="font-semibold text-foreground">irreversible</span>. All cleaning operations will be undone and data_clean.pkl will be overwritten with raw data.
                </p>
              </div>
              <Button variant="outline" size="lg" onClick={() => executeBulkAction("reset_raw")} disabled={isBusy} className="h-auto w-full min-w-0 whitespace-normal py-5 text-sm font-semibold shadow-sm">
                {executing === "reset_raw" ? <><Spinner className="size-4" /> Resetting...</> : <><RefreshCw className="size-4" /> Reset to Raw</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ COLUMN HEALTH TABLE ═══ */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Column Health</CardTitle>
              <CardDescription>Per-column breakdown of types and missing values</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> {cleanCols} clean
              </Badge>
              {dirtyCols > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  <AlertTriangle className="size-3" /> {dirtyCols} issue{dirtyCols > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator className="opacity-50" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Column</th>
                <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Missing</th>
                <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {columnsDetail.map((col) => (
                <tr key={col.column} className="border-b transition-colors last:border-b-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5 font-medium">{col.column}</td>
                  <td className="px-4 py-2.5">
                    <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{col.type}</code>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {col.missing_count > 0 ? (
                      <span className="font-semibold text-red-600 dark:text-red-400">{col.missing_count.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {col.missing_count > 0 ? (
                      <Badge variant="destructive"><AlertTriangle className="size-3" /> Fix</Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="size-3" /> OK</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
