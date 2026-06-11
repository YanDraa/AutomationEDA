"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Copy,
  Database,
  Grid3X3,
  Table2,
  Upload,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
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
          Upload a file first to see data diagnostics and preview.
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

  const [dataPreview, setDataPreview] = useState<Record<string, unknown>[]>([]);
  const [datasetMeta, setDatasetMeta] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const previewColumns = useMemo(() => {
    if (dataPreview.length === 0) return [];
    return Object.keys(dataPreview[0]);
  }, [dataPreview]);

  // ── Auto-fetch on mount ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function fetchExistingData() {
      try {
        const res = await fetch(`${API_BASE}/api/data/analyze`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          if (!cancelled) {
            setHasData(false);
            setLoading(false);
          }
          return;
        }

        const json = await res.json();
        if (cancelled) return;

        if (json.status === "no_data") {
          router.replace("/dashboard/upload-data");
          return;
        }

        if (json.status === "success") {
          setDataPreview(json.data_preview ?? []);
          setDatasetMeta((json.dataset_meta as Record<string, unknown>) ?? null);
          setHasData(true);
        }
      } catch {
        if (!cancelled) setHasData(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchExistingData();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden px-2">
        <div>
          <h1 className="font-semibold text-2xl">Data Preview</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Fetching dataset and computing diagnostics...
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
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

  // ─── Metrics extraction ────────────────────────────────────────────────────

  const totalRows = (datasetMeta?.total_rows as number) ?? 0;
  const totalCols = (datasetMeta?.total_columns as number) ?? previewColumns.length;
  const duplicatedRows = (datasetMeta?.total_duplicated_rows as number) ?? 0;
  const missingCells = (datasetMeta?.total_missing_cells as number) ?? 0;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-full flex-col gap-4 overflow-x-hidden px-2">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-xl">Data Preview</h1>
        <p className="mt-0.5 text-muted-foreground text-xs">
          Notebook-level data integrity checks and random sample preview.
        </p>
      </div>

      {/* ── Notebook Diagnostics Panel ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Rows */}
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Grid3X3 className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Rows</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{totalRows.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Total Columns */}
        <Card>
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Table2 className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Columns</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">{String(totalCols)}</p>
          </CardContent>
        </Card>

        {/* Duplicated Rows */}
        <Card
          className={
            duplicatedRows > 0
              ? "border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20"
              : undefined
          }
        >
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <Copy className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Duplicated Rows</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">
              {duplicatedRows.toLocaleString()}
            </p>
            {duplicatedRows > 0 && (
              <div className="mt-0.5 flex items-center gap-1 text-amber-600 text-[11px] dark:text-amber-400">
                <AlertTriangle className="size-3" />
                <span className="font-medium">{duplicatedRows} duplicates detected</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Total Missing Cells */}
        <Card
          className={
            missingCells > 0
              ? "border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20"
              : undefined
          }
        >
          <CardContent className="py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-muted-foreground" />
              <p className="text-muted-foreground text-xs">Total Missing Cells</p>
            </div>
            <p className="mt-0.5 font-bold text-lg">
              {missingCells.toLocaleString()}
            </p>
            {missingCells > 0 && (
              <div className="mt-0.5 text-red-600 text-[11px] dark:text-red-400">
                <span className="font-medium">{missingCells} NaN/empty values across dataset</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Data Preview Table (max 10-row random sample) ── */}
      {dataPreview.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Data Sample Preview</CardTitle>
            <CardDescription>
              {String(dataPreview.length)} random rows · {String(totalCols)} columns · {totalRows.toLocaleString()} total rows
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card">#</TableHead>
                    {previewColumns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPreview.map((row, rowIdx) => (
                    <TableRow key={rowIdx}>
                      <TableCell className="sticky left-0 bg-card font-medium text-sm text-muted-foreground">
                        {rowIdx + 1}
                      </TableCell>
                      {previewColumns.map((col) => {
                        const cellValue = row[col];
                        return (
                          <TableCell key={col} className="text-sm">
                            {isMissingValue(cellValue) ? (
                              <Badge
                                variant="outline"
                                className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                              >
                                NaN
                              </Badge>
                            ) : (
                              <span className="block truncate max-w-[150px]" title={String(cellValue)}>
                                {String(cellValue)}
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
