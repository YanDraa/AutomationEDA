"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Grid3X3,
  RefreshCw,
  Sparkles,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";

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
const NOTIFICATION_DURATION = 10_000; // 10 seconds

type CleaningAction = "drop_duplicates" | "impute_missing" | "reset_raw";

type ColumnDetail = {
  column: string;
  type: string;
  missing_count: number;
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
    success: "border-green-300 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400",
    error: "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400",
    warning: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400",
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
          <button
            onClick={() => onDismiss(n.id)}
            className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [executing, setExecuting] = useState<CleaningAction | null>(null);

  // Dataset health metrics
  const [totalRows, setTotalRows] = useState(0);
  const [totalCols, setTotalCols] = useState(0);
  const [duplicatedRows, setDuplicatedRows] = useState(0);
  const [missingCells, setMissingCells] = useState(0);
  const [columnsDetail, setColumnsDetail] = useState<ColumnDetail[]>([]);

  // Notification system
  const [notifications, setNotifications] = useState<Notification[]>([]);
  let notifIdRef = 0;

  const addNotification = useCallback((type: NotificationType, message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);

    // Auto-dismiss after exactly 10 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, NOTIFICATION_DURATION);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Fetch cleaning summary ─────────────────────────────────────────────

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/data/cleaning-summary`, { method: "GET" });
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
        setTotalRows((json.total_rows as number) ?? 0);
        setTotalCols((json.total_columns as number) ?? 0);
        setDuplicatedRows((json.total_duplicated_rows as number) ?? 0);
        setMissingCells((json.total_missing_cells as number) ?? 0);
        setColumnsDetail((json.columns_detail as ColumnDetail[]) ?? []);
        setHasData(true);
      }
    } catch {
      setHasData(false);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      await fetchSummary();
      if (!cancelled) setLoading(false);
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  // ── Execute cleaning action ─────────────────────────────────────────────

  const executeAction = useCallback(
    async (action: CleaningAction) => {
      setExecuting(action);
      try {
        const res = await fetch(`${API_BASE}/api/data/execute-cleaning`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();

        if (json.status === "success") {
          // Update local state immediately
          setTotalRows((json.total_rows as number) ?? 0);
          setTotalCols((json.total_columns as number) ?? 0);
          setDuplicatedRows((json.total_duplicated_rows as number) ?? 0);
          setMissingCells((json.total_missing_cells as number) ?? 0);

          // Refresh full summary to update columns_detail table
          await fetchSummary();

          addNotification("success", json.message ?? "Cleaning action completed successfully.");
        } else {
          addNotification("error", json.detail ?? "Cleaning action failed.");
        }
      } catch {
        addNotification("error", "Cannot connect to backend. Make sure the server is running.");
      } finally {
        setExecuting(null);
      }
    },
    [fetchSummary, addNotification],
  );

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden px-2">
        <div>
          <h1 className="font-semibold text-xl">Data Cleaning</h1>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Loading cleaning diagnostics...
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex flex-col gap-2 pt-6">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Empty / No Data ───────────────────────────────────────────────────────

  if (!hasData) {
    return <EmptyState />;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const isBusy = executing !== null;

  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden px-2">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-xl">Data Cleaning</h1>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Statistical data cleaning — handle duplicates, missing values, and reset to raw data.
        </p>
      </div>

      {/* Notifications */}
      <NotificationBanner notifications={notifications} onDismiss={dismissNotification} />

      {/* ── Health Metrics Cards ── */}
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

      {/* ── Action Control Center ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cleaning Actions</CardTitle>
          <CardDescription>
            Execute statistical cleaning operations. Each action reads from and persists to data_clean.pkl.
          </CardDescription>
        </CardHeader>
        <CardContent className="@container/cleaning-actions">
          <div className="grid grid-cols-1 gap-3 @md/cleaning-actions:grid-cols-2 @xl/cleaning-actions:grid-cols-3">
            {/* Purge Duplicates */}
            <Button
              variant="outline"
              onClick={() => executeAction("drop_duplicates")}
              disabled={isBusy}
              className="h-auto w-full min-w-0 flex-col items-start gap-2 whitespace-normal py-4 text-left"
            >
              {executing === "drop_duplicates" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <Trash2 className="size-4 shrink-0 text-red-500" />
              )}
              <div className="min-w-0 w-full">
                <p className="font-medium text-sm leading-snug break-words">Purge Duplicate Rows</p>
                <p className="text-muted-foreground text-xs leading-relaxed break-words text-pretty">
                  Remove all exact-duplicate rows using drop_duplicates().
                </p>
              </div>
            </Button>

            {/* Smart Impute */}
            <Button
              variant="outline"
              onClick={() => executeAction("impute_missing")}
              disabled={isBusy}
              className="h-auto w-full min-w-0 flex-col items-start gap-2 whitespace-normal py-4 text-left"
            >
              {executing === "impute_missing" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <Sparkles className="size-4 shrink-0 text-blue-500" />
              )}
              <div className="min-w-0 w-full">
                <p className="font-medium text-sm leading-snug break-words">Smart Impute Missing Values</p>
                <p className="text-muted-foreground text-xs leading-relaxed break-words text-pretty">
                  Numerical → Median · Categorical → &quot;Unknown&quot;.
                </p>
              </div>
            </Button>

            {/* Reset to Raw */}
            <Button
              variant="outline"
              onClick={() => executeAction("reset_raw")}
              disabled={isBusy}
              className="h-auto w-full min-w-0 flex-col items-start gap-2 whitespace-normal py-4 text-left"
            >
              {executing === "reset_raw" ? (
                <Spinner className="size-4 shrink-0" />
              ) : (
                <RefreshCw className="size-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 w-full">
                <p className="font-medium text-sm leading-snug break-words">Reset to Raw Data</p>
                <p className="text-muted-foreground text-xs leading-relaxed break-words text-pretty">
                  Overwrite data_clean.pkl with fresh copy from data_raw.pkl.
                </p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Anomalies Table ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Column Anomalies Overview</CardTitle>
          <CardDescription>
            Per-column breakdown of data types and missing value counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Column
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Data Type
                  </th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                    Missing Count
                  </th>
                </tr>
              </thead>
              <tbody>
                {columnsDetail.map((col) => (
                  <tr key={col.column} className="border-b transition-colors hover:bg-muted/50">
                    <td className="px-4 py-2.5 font-medium">{col.column}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{col.type}</code>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {col.missing_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-red-700 text-xs font-medium dark:text-red-400">
                          <AlertTriangle className="size-3" />
                          {col.missing_count.toLocaleString()}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-green-700 text-xs font-medium dark:text-green-400">
                          <CheckCircle2 className="size-3" />
                          0
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
