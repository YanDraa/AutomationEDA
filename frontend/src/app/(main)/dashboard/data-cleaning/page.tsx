"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CaseSensitive,
  CheckCircle2,
  Copy,
  Database,
  Grid3X3,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

type CleanAction =
  | "drop_duplicates"
  | "impute_mean"
  | "impute_median"
  | "impute_mode"
  | "drop_missing_rows"
  | "standardize_text";

const ACTION_LABELS: Record<CleanAction, string> = {
  drop_duplicates: "Drop Duplicates",
  impute_mean: "Impute Mean",
  impute_median: "Impute Median",
  impute_mode: "Impute Mode",
  drop_missing_rows: "Drop Missing Rows",
  standardize_text: "Standardize Text",
};

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center gap-4 overflow-x-hidden py-20 text-center">
      <div className="rounded-full bg-muted p-4">
        <Database className="size-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">No dataset loaded</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Upload a file first to start cleaning your data.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard/upload-data">
          <Upload className="size-4" />
          Upload Dataset
        </Link>
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [cleaning, setCleaning] = useState<CleanAction | null>(null);

  // Dataset health metrics
  const [totalRows, setTotalRows] = useState(0);
  const [totalCols, setTotalCols] = useState(0);
  const [duplicatedRows, setDuplicatedRows] = useState(0);
  const [missingCells, setMissingCells] = useState(0);

  // ── Fetch current dataset meta ─────────────────────────────────────────────

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/analyze`, { method: "GET" });
      if (!res.ok) {
        setHasData(false);
        return;
      }
      const json = await res.json();
      if (json.status === "no_data") {
        router.replace("/dashboard/upload-data");
        return;
      }
      if (json.status === "success") {
        const meta = json.dataset_meta ?? {};
        setTotalRows((meta.total_rows as number) ?? 0);
        setTotalCols((meta.total_columns as number) ?? 0);
        setDuplicatedRows((meta.total_duplicated_rows as number) ?? 0);
        setMissingCells((meta.total_missing_cells as number) ?? 0);
        setHasData(true);
      }
    } catch {
      setHasData(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      await fetchMeta();
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [fetchMeta]);

  // ── Execute cleaning action ────────────────────────────────────────────────

  const executeClean = useCallback(async (action: CleanAction) => {
    setCleaning(action);
    try {
      const res = await fetch(`${API_BASE}/api/data/clean`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();

      if (json.status === "success") {
        const meta = json.dataset_meta ?? {};
        setTotalRows((meta.total_rows as number) ?? 0);
        setTotalCols((meta.total_columns as number) ?? 0);
        setDuplicatedRows((meta.total_duplicated_rows as number) ?? 0);
        setMissingCells((meta.total_missing_cells as number) ?? 0);

        const changes = json.changes ?? {};
        const label = ACTION_LABELS[action];

        toast.success(`${label} berhasil!`, {
          description:
            action === "drop_duplicates"
              ? `${String(changes.rows_removed)} baris duplikat dihapus. Sisa ${String(changes.rows_after)} baris.`
              : action === "drop_missing_rows"
                ? `${String(changes.rows_removed)} baris dengan NaN dihapus. Sisa ${String(changes.rows_after)} baris.`
                : action === "standardize_text"
                  ? `Semua kolom teks sudah distandardisasi (trim + lowercase).`
                  : `Missing cells: ${String(changes.missing_before)} → ${String(changes.missing_after)}.`,
        });
      } else {
        toast.error("Cleaning gagal", {
          description: json.detail ?? "Terjadi kesalahan saat membersihkan data.",
        });
      }
    } catch {
      toast.error("Koneksi gagal", {
        description: "Tidak dapat terhubung ke backend. Pastikan server berjalan.",
      });
    } finally {
      setCleaning(null);
    }
  }, []);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden px-2">
        <div>
          <h1 className="font-semibold text-xl">Data Cleaning</h1>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Loading dataset diagnostics...
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card><CardContent className="flex flex-col gap-3 pt-6">{Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-8 w-full" />))}</CardContent></Card>
          <Card><CardContent className="flex flex-col gap-3 pt-6">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-8 w-full" />))}</CardContent></Card>
        </div>
      </div>
    );
  }

  // ─── Empty / No Data ───────────────────────────────────────────────────────

  if (!hasData) {
    return <EmptyState />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const isBusy = cleaning !== null;

  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden px-2">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-xl">Data Cleaning</h1>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Interactive data cleaning — duplicates, missing values, and text standardization.
        </p>
      </div>

      {/* ── Health Metrics Strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Rows</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{totalRows.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Table2 className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Columns</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{String(totalCols)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Copy className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Duplicated Rows</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{duplicatedRows.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Missing Cells</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{missingCells.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Cleaning Cards ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* ── Card 1: Handling Duplicates ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="size-4 text-primary" />
              1. Handling Duplicates
            </CardTitle>
            <CardDescription>
              {duplicatedRows > 0
                ? `${duplicatedRows.toLocaleString()} baris duplikat terdeteksi pada dataset.`
                : "Tidak ada baris duplikat pada dataset."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {duplicatedRows > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 text-sm dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="font-medium">{duplicatedRows.toLocaleString()} duplicated rows</span>
                </div>
                <Button
                  onClick={() => executeClean("drop_duplicates")}
                  disabled={isBusy}
                  className="w-full"
                >
                  {cleaning === "drop_duplicates" ? (
                    <><Spinner className="size-4" /> Memproses...</>
                  ) : (
                    <><Copy className="size-4" /> Hapus Semua Duplikat</>
                  )}
                </Button>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              >
                <CheckCircle2 className="mr-1 size-3" />
                Data Bebas Duplikat
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* ── Card 2: Handling Missing Values (NaN) ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" />
              2. Handling Missing Values (NaN)
            </CardTitle>
            <CardDescription>
              {missingCells > 0
                ? `${missingCells.toLocaleString()} sel kosong/NaN terdeteksi pada dataset.`
                : "Tidak ada nilai yang hilang pada dataset."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {missingCells > 0 ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span className="font-medium">{missingCells.toLocaleString()} missing values</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => executeClean("impute_mean")}
                    disabled={isBusy}
                    className="justify-start"
                  >
                    {cleaning === "impute_mean" ? (
                      <><Spinner className="size-4" /> Proses...</>
                    ) : (
                      "Imputasi dengan Mean (Numerik)"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => executeClean("impute_median")}
                    disabled={isBusy}
                    className="justify-start"
                  >
                    {cleaning === "impute_median" ? (
                      <><Spinner className="size-4" /> Proses...</>
                    ) : (
                      "Imputasi dengan Median (Numerik)"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => executeClean("impute_mode")}
                    disabled={isBusy}
                    className="justify-start"
                  >
                    {cleaning === "impute_mode" ? (
                      <><Spinner className="size-4" /> Proses...</>
                    ) : (
                      "Imputasi dengan Modus (Semua Kolom)"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => executeClean("drop_missing_rows")}
                    disabled={isBusy}
                    className="justify-start"
                  >
                    {cleaning === "drop_missing_rows" ? (
                      <><Spinner className="size-4" /> Proses...</>
                    ) : (
                      "Hapus Baris yang Kosong"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
              >
                <CheckCircle2 className="mr-1 size-3" />
                Data Bersih dari NaN
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* ── Card 3: Structural Text Standardization ── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CaseSensitive className="size-4 text-primary" />
              3. Structural Text Standardization
            </CardTitle>
            <CardDescription>
              Standardize text values: trims unnecessary spaces and makes strings lowercase for cleaner categoricals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Strips leading/trailing white space and converts string columns to lowercase to prevent duplicates due to case mismatch.
              </p>
              <Button
                onClick={() => executeClean("standardize_text")}
                disabled={isBusy}
                className="w-full"
              >
                {cleaning === "standardize_text" ? (
                  <><Spinner className="size-4" /> Memproses...</>
                ) : (
                  <><CaseSensitive className="size-4" /> Standardisasi Teks & Kategori</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
