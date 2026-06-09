"use client";

import { useCallback, useEffect, useState } from "react";


import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Hash,
  Tag,
  Wand2,
  Upload,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";
import { fetchCurrentDataset } from "@/lib/dataset-client";


const BACKEND_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 10;

interface ColumnInfo {
  name: string;
  dtype: string;
  type: "numerical" | "categorical" | "datetime" | "other";
  missing: number;
  "missing_%": number;
}

interface PreviewResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total_rows: number;
  total_columns: number;
}

interface CleaningSummary {
  original_rows: number;
  cleaned_rows: number;
  duplicates_removed: number;
  rows_deleted_missing_data: number;
  columns_standardized: string[];
}


function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="rounded-full bg-muted p-4">
        <Database className="size-8 text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium">Belum ada dataset</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Upload file terlebih dahulu untuk melihat preview data.
        </p>
      </div>
      <Button asChild size="sm">
        <Link href="/dashboard">
          <Upload className="size-4" />
          Upload Sekarang
        </Link>
      </Button>
    </div>
  );
}

function TypeBadge({ type }: { type: ColumnInfo["type"] }) {
  const config = {
    numerical: { label: "Numerikal", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20" },
    categorical: { label: "Kategorikal", className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
    datetime: { label: "Datetime", className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20" },
    other: { label: "Lainnya", className: "bg-muted text-muted-foreground" },
  };
  const c = config[type] ?? config.other;
  return (
    <Badge variant="outline" className={`text-xs font-normal ${c.className}`}>
      {type === "numerical" ? <Hash className="size-3" /> : <Tag className="size-3" />}
      {c.label}
    </Badge>
  );
}

export default function Page() {
  const { dataset } = useDataset();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [cleaningSummary, setCleaningSummary] = useState<CleaningSummary | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);


  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Auto-clean by calling backend clean endpoint on page load
        // so the preview reflects dropping duplicates + dropping any rows with missing values.
        const cleanRes = await fetch("http://127.0.0.1:8000/api/data/clean", {
          method: "POST",
          headers: { "Accept": "application/json" },
        });

        if (!cleanRes.ok) {
          throw new Error(`Clean failed (HTTP ${cleanRes.status})`);
        }

        const cleanData = (await cleanRes.json()) as {
          status: string;
          summary?: CleaningSummary;
          preview?: PreviewResult;
        };

        if (!cleanData?.preview) {
          setPreview(null);
          setCleaningSummary(null);
          return;
        }

        setPreview(cleanData.preview);
        setCleaningSummary(cleanData.summary ?? null);
        setPage(0);
      } catch {
        setError("Gagal memuat & membersihkan preview. Pastikan backend berjalan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  if (!dataset) return <EmptyState />;

  const pagedRows = preview?.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) ?? [];
  const totalPages = Math.ceil((preview?.rows.length ?? 0) / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Data Preview</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Dataset: <span className="font-medium text-foreground">{dataset.fileName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            <Wand2 className="size-4" />
            <span className="font-medium">Auto-cleaned on preview load</span>
          </div>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Baris", value: dataset.rows.toLocaleString() },
          { label: "Total Kolom", value: dataset.columns },
          { label: "Ukuran File", value: dataset.fileSize },
          { label: "Upload", value: dataset.uploadTime },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4">
              <p className="text-muted-foreground text-xs">{s.label}</p>
              <p className="mt-1 font-semibold text-lg">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && (
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="text-center">Preview dataset akan dimuat otomatis dari server.</p>
        </div>
      )}


      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
      )}

      {preview && !loading && (
        <>
          {/* Cleaning Summary (shown when backend provides it) */}
          {cleaningSummary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-xs">Total Rows</p>
                  <p className="mt-1 font-semibold text-lg">
                    {cleaningSummary.original_rows.toLocaleString()} → {cleaningSummary.cleaned_rows.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={
                  cleaningSummary.duplicates_removed > 0
                    ? "border border-amber-200 bg-amber-50"
                    : undefined
                }
              >
                <CardContent className="pt-4">
                  <p className="text-muted-foreground text-xs">Duplicates Removed</p>
                  <p className="mt-1 font-semibold text-lg">
                    {cleaningSummary.duplicates_removed.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-red-50 text-red-900 border border-red-200">
                <CardContent className="pt-4">
                  <p className="text-xs font-medium">Rows Deleted</p>
                  <p className="mt-1 font-semibold text-lg">
                    Deleted {cleaningSummary.rows_deleted_missing_data.toLocaleString()} rows due to missing/empty data
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Column Info */}
          <Card>

            <CardHeader>
              <CardTitle className="text-base">Informasi Kolom</CardTitle>
              <CardDescription>{preview.total_columns} kolom terdeteksi</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kolom</TableHead>
                      <TableHead>Tipe Data</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Missing</TableHead>
                      <TableHead className="text-right">Missing %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.columns.map((col) => (
                      <TableRow key={col.name}>
                        <TableCell className="font-medium">{col.name}</TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{col.dtype}</code>
                        </TableCell>
                        <TableCell>
                          <TypeBadge type={col.type} />
                        </TableCell>
                        <TableCell className="text-right">{col.missing}</TableCell>
                        <TableCell className="text-right">
                          <span className={col["missing_%"] > 10 ? "text-destructive font-medium" : ""}>
                            {col["missing_%"]}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample Data</CardTitle>
              <CardDescription>Menampilkan {pagedRows.length} dari {preview.rows.length} baris</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-muted-foreground">#</TableHead>
                      {preview.columns.map((col) => (
                        <TableHead key={col.name} className="whitespace-nowrap">
                          {col.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground text-xs">{page * PAGE_SIZE + i + 1}</TableCell>
                        {preview.columns.map((col) => (
                          <TableCell key={col.name} className="whitespace-nowrap text-sm">
                            {row[col.name] === null || row[col.name] === undefined ? (
                              <span className="text-muted-foreground italic">null</span>
                            ) : (
                              String(row[col.name])
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Halaman {page + 1} dari {totalPages}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}