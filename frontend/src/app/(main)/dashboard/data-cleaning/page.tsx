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
  X,
} from "lucide-react";
import Link from "next/link";

import { Alert, AlertTitle } from "@/components/ui/alert";
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
const NOTIFICATION_DURATION = 10_000;

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

type NotificationType = "success" | "error" | "warning";

type Notification = {
  id: number;
  type: NotificationType;
  message: string;
};

// ─── Notification Banner ────────────────────────────────────────────────────

function NotificationBanner({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: number) => void;
}) {
  if (notifications.length === 0) return null;

  const typeStyles: Record<NotificationType, string> = {
    success:
      "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400",
    error: "border-destructive/30 bg-destructive/5 text-destructive",
    warning:
      "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400",
  };

  const typeIcons: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle2 className="size-4 shrink-0" />,
    error: <AlertTriangle className="size-4 shrink-0" />,
    warning: <AlertTriangle className="size-4 shrink-0" />,
  };

  return (
    <div className="flex w-full max-w-full flex-col gap-2 overflow-x-hidden">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${typeStyles[n.type]}`}
        >
          {typeIcons[n.type]}
          <span className="flex-1 font-medium">{n.message}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDismiss(n.id)}
            className="shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

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
          <Upload data-icon="inline-start" />
          Upload Dataset
        </Link>
      </Button>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  alert?: { tone: "warning" | "destructive"; message: string };
}) {
  return (
    <Card className={alert ? (alert.tone === "warning" ? "border-amber-500/30" : "border-destructive/30") : undefined}>
      <CardHeader className="pb-2">
        <CardTitle>
          <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </div>
        </CardTitle>
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5">
        <div className="text-2xl font-semibold tabular-nums leading-none tracking-tight">
          {value}
        </div>
        {alert ? (
          <p
            className={`flex items-center gap-1 text-xs font-medium ${
              alert.tone === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive"
            }`}
          >
            <AlertTriangle className="size-3" />
            {alert.message}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [cleaning, setCleaning] = useState<CleanAction | null>(null);

  const [totalRows, setTotalRows] = useState(0);
  const [totalCols, setTotalCols] = useState(0);
  const [duplicatedRows, setDuplicatedRows] = useState(0);
  const [missingCells, setMissingCells] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, NOTIFICATION_DURATION);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

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
    return () => {
      cancelled = true;
    };
  }, [fetchMeta]);

  const executeClean = useCallback(
    async (action: CleanAction) => {
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

          const message =
            action === "drop_duplicates"
              ? `${label} berhasil — ${String(changes.rows_removed)} baris duplikat dihapus. Sisa ${String(changes.rows_after)} baris.`
              : action === "drop_missing_rows"
                ? `${label} berhasil — ${String(changes.rows_removed)} baris dengan NaN dihapus. Sisa ${String(changes.rows_after)} baris.`
                : action === "standardize_text"
                  ? `${label} berhasil — semua kolom teks sudah distandardisasi (trim + lowercase).`
                  : `${label} berhasil — missing cells: ${String(changes.missing_before)} → ${String(changes.missing_after)}.`;

          addNotification("success", message);
        } else {
          addNotification(
            "error",
            json.detail ?? "Terjadi kesalahan saat membersihkan data.",
          );
        }
      } catch {
        addNotification(
          "error",
          "Tidak dapat terhubung ke backend. Pastikan server berjalan.",
        );
      } finally {
        setCleaning(null);
      }
    },
    [addNotification],
  );

  if (loading) {
    return (
      <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
        <div>
          <h1 className="font-semibold text-2xl">Data Cleaning</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Loading dataset diagnostics...
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 *:data-[slot=card]:shadow-xs">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="mt-2 h-3 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 *:data-[slot=card]:shadow-xs">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-3 pt-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState />;
  }

  const isBusy = cleaning !== null;

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div>
        <h1 className="font-semibold text-2xl">Data Cleaning</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Interactive data cleaning — duplicates, missing values, and text standardization.
        </p>
      </div>

      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotification}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 *:data-[slot=card]:shadow-xs">
        <MetricCard icon={Grid3X3} label="Total Rows" value={totalRows.toLocaleString()} />
        <MetricCard icon={Table2} label="Total Columns" value={String(totalCols)} />
        <MetricCard
          icon={Copy}
          label="Duplicated Rows"
          value={duplicatedRows.toLocaleString()}
          alert={
            duplicatedRows > 0
              ? {
                  tone: "warning",
                  message: `${duplicatedRows.toLocaleString()} duplicates detected`,
                }
              : undefined
          }
        />
        <MetricCard
          icon={AlertTriangle}
          label="Missing Cells"
          value={missingCells.toLocaleString()}
          alert={
            missingCells > 0
              ? {
                  tone: "destructive",
                  message: `${missingCells.toLocaleString()} NaN/empty values`,
                }
              : undefined
          }
        />
      </div>

      <div className="@container/cleaning-cards min-w-0">
        <div className="grid min-w-0 grid-cols-1 gap-4 @lg/cleaning-cards:grid-cols-2 @2xl/cleaning-cards:grid-cols-3 *:data-[slot=card]:min-w-0 *:data-[slot=card]:shadow-xs">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Copy className="size-4" />
              </div>
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
                <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle />
                  <AlertTitle>
                    {duplicatedRows.toLocaleString()} duplicated rows
                  </AlertTitle>
                </Alert>
                <Button
                  variant="destructive"
                  onClick={() => executeClean("drop_duplicates")}
                  disabled={isBusy}
                  className="h-auto w-full min-w-0 whitespace-normal"
                >
                  {cleaning === "drop_duplicates" ? (
                    <>
                      <Spinner className="size-4" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Copy data-icon="inline-start" />
                      Hapus Semua Duplikat
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <Badge variant="outline">
                <CheckCircle2 data-icon="inline-start" />
                Data Bebas Duplikat
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <Sparkles className="size-4" />
              </div>
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
                <Alert variant="destructive" className="bg-destructive/5">
                  <AlertTriangle />
                  <AlertTitle>
                    {missingCells.toLocaleString()} missing values
                  </AlertTitle>
                </Alert>
                <div className="grid grid-cols-1 gap-2">
                  {(
                    [
                      ["impute_mean", "Imputasi dengan Mean (Numerik)"],
                      ["impute_median", "Imputasi dengan Median (Numerik)"],
                      ["impute_mode", "Imputasi dengan Modus (Semua Kolom)"],
                      ["drop_missing_rows", "Hapus Baris yang Kosong"],
                    ] as const
                  ).map(([action, label]) => (
                    <Button
                      key={action}
                      variant="outline"
                      onClick={() => executeClean(action)}
                      disabled={isBusy}
                      className="h-auto w-full min-w-0 justify-start whitespace-normal text-left"
                    >
                      {cleaning === action ? (
                        <>
                          <Spinner className="size-4" />
                          Proses...
                        </>
                      ) : (
                        label
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <Badge variant="outline">
                <CheckCircle2 data-icon="inline-start" />
                Data Bersih dari NaN
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                <CaseSensitive className="size-4" />
              </div>
              3. Structural Text Standardization
            </CardTitle>
            <CardDescription>
              Standardize text values: trims unnecessary spaces and makes strings lowercase for cleaner categoricals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Strips leading/trailing white space and converts string columns to lowercase to prevent duplicates due to case mismatch.
              </p>
              <Button
                onClick={() => executeClean("standardize_text")}
                disabled={isBusy}
                className="h-auto w-full min-w-0 whitespace-normal"
              >
                {cleaning === "standardize_text" ? (
                  <>
                    <Spinner className="size-4" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CaseSensitive data-icon="inline-start" />
                    Standardisasi Teks & Kategori
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
