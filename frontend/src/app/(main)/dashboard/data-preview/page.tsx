"use client";

import { BACKEND_URL } from "@/lib/config";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  Copy,
  Database,
  Grid3X3,
  Table2,
  Upload,
  Sparkles,
  Search,
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

const API_BASE = BACKEND_URL;

function isMissingValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

function EmptyState() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-4 overflow-hidden py-20 text-center">
      <div className="rounded-2xl bg-primary/10 p-5 shadow-inner">
        <Database className="size-10 text-primary" />
      </div>
      <div>
        <p className="font-bold text-lg text-foreground">Belum ada dataset yang dimuat</p>
        <p className="mt-1 text-muted-foreground text-sm max-w-sm">
          Silakan unggah file dataset terlebih dahulu untuk melihat diagnostik dan sampel data.
        </p>
      </div>
      <Button asChild size="sm" className="rounded-xl font-semibold shadow-sm mt-2">
        <Link href="/dashboard/upload-data">
          <Upload className="size-4 mr-2" />
          Unggah Dataset
        </Link>
      </Button>
    </div>
  );
}

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

  useEffect(() => {
    let cancelled = false;

    async function fetchExistingData() {
      try {
        const res = await fetch(`${API_BASE}/api/data/analyze`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
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

  if (loading) {
    return (
      <div className="flex w-full flex-col gap-6 overflow-hidden px-1">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-96 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!hasData) {
    return <EmptyState />;
  }

  const totalRows = (datasetMeta?.total_rows as number) ?? 0;
  const totalCols = (datasetMeta?.total_columns as number) ?? previewColumns.length;
  const duplicatedRows = (datasetMeta?.total_duplicated_rows as number) ?? 0;
  const missingCells = (datasetMeta?.total_missing_cells as number) ?? 0;

  return (
    <div className="flex min-w-0 w-full flex-col gap-5 overflow-hidden px-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <Table2 className="size-6 text-primary" />
            Data Preview
          </h1>
          <p className="mt-0.5 text-muted-foreground text-sm">
            Diagnostik integritas data dan pratinjau sampel dataset aktif.
          </p>
        </div>
        <Badge variant="outline" className="rounded-xl border-border/60 px-3 py-1 text-xs font-semibold">
          {totalCols} Kolom Terdeteksi
        </Badge>
      </div>

      {/* Notebook Diagnostics Panel */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total Rows */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Baris</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Grid3X3 className="size-4 text-blue-500" />
            </div>
          </div>
          <p className="mt-2 font-bold text-2xl tabular-nums text-foreground">{totalRows.toLocaleString()}</p>
        </div>

        {/* Total Columns */}
        <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md bg-gradient-to-br from-violet-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Kolom</p>
            <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10">
              <Table2 className="size-4 text-violet-500" />
            </div>
          </div>
          <p className="mt-2 font-bold text-2xl tabular-nums text-foreground">{String(totalCols)}</p>
        </div>

        {/* Duplicated Rows */}
        <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
          duplicatedRows > 0
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border/50 bg-card bg-gradient-to-br from-emerald-500/5 to-transparent"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baris Duplikat</p>
            <div className={`flex size-8 items-center justify-center rounded-lg ${duplicatedRows > 0 ? "bg-amber-500/15" : "bg-emerald-500/10"}`}>
              <Copy className={`size-4 ${duplicatedRows > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-500"}`} />
            </div>
          </div>
          <p className="mt-2 font-bold text-2xl tabular-nums text-foreground">{duplicatedRows.toLocaleString()}</p>
        </div>

        {/* Total Missing Cells */}
        <div className={`group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
          missingCells > 0
            ? "border-destructive/30 bg-destructive/5"
            : "border-border/50 bg-card bg-gradient-to-br from-emerald-500/5 to-transparent"
        }`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nilai Hilang (NaN)</p>
            <div className={`flex size-8 items-center justify-center rounded-lg ${missingCells > 0 ? "bg-destructive/15" : "bg-emerald-500/10"}`}>
              <AlertTriangle className={`size-4 ${missingCells > 0 ? "text-destructive" : "text-emerald-500"}`} />
            </div>
          </div>
          <p className="mt-2 font-bold text-2xl tabular-nums text-foreground">{missingCells.toLocaleString()}</p>
        </div>
      </div>

      {/* Data Preview Table */}
      {dataPreview.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card">
          <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Sampel Data ({dataPreview.length} Baris Acak)
              </CardTitle>
              <CardDescription className="text-xs">
                Pratinjau struktur dan isi nilai dari total {totalRows.toLocaleString()} baris data.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto max-h-[500px]">
              <Table className="w-full text-xs">
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm shadow-sm">
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="sticky left-0 bg-background/95 backdrop-blur-sm w-12 font-semibold text-muted-foreground">#</TableHead>
                    {previewColumns.map((col) => (
                      <TableHead key={col} className="truncate whitespace-nowrap font-semibold text-foreground px-4 py-3">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataPreview.map((row, rowIdx) => (
                    <TableRow key={rowIdx} className="border-b border-border/20 transition-colors odd:bg-muted/10 hover:bg-primary/5">
                      <TableCell className="sticky left-0 bg-background/90 font-medium text-xs text-muted-foreground w-12 border-r border-border/20">
                        {rowIdx + 1}
                      </TableCell>
                      {previewColumns.map((col) => {
                        const cellValue = row[col];
                        return (
                          <TableCell key={col} className="max-w-48 truncate px-4 py-2.5 text-foreground/80" title={String(cellValue ?? "")}>
                            {isMissingValue(cellValue) ? (
                              <Badge
                                variant="outline"
                                className="border-destructive/30 bg-destructive/10 text-destructive text-[10px] py-0 px-1.5 font-semibold"
                              >
                                NaN
                              </Badge>
                            ) : (
                              String(cellValue)
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
