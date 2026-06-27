"use client";

import { BACKEND_URL } from "@/lib/config";

import { useCallback, useEffect, useState } from "react";

import { AlertCircle, Tag, Sparkles, Database } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

interface CatStats {
  [column: string]: {
    count: number;
    missing: number;
    "missing_%": number;
    unique: number;
    mode: string;
    mode_freq: number;
    "mode_%": number;
  };
}

export default function Page() {
  const { dataset } = useDataset();
  const [stats, setStats] = useState<CatStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/analysis/categorical`, {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "include",
          body: undefined,
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const { index, columns, data: rows } = data.result.table as {
          index: string[];
          columns: string[];
          data: (number | string | null)[][];
        };
        const parsed: CatStats = {};
        index.forEach((colName, i) => {
          const row = rows[i];
          parsed[colName] = {} as CatStats[string];
          columns.forEach((stat, j) => {
            (parsed[colName] as Record<string, unknown>)[stat] = row[j];
          });
        });
        setStats(parsed);
      } catch {
        setError("Gagal memuat statistik. Pastikan backend berjalan.");
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset]);

  if (!dataset) {
    return (
      <EmptyDataset
        title="Belum ada dataset yang dimuat"
        description="Unggah file terlebih dahulu untuk melihat statistik kategorikal."
      />
    );
  }

  const columns = stats ? Object.keys(stats) : [];

  return (
    <div className="flex min-w-0 w-full flex-col gap-6 p-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <Tag className="size-6 text-purple-500" />
            Statistik Kategorikal
          </h1>
          <p className="text-muted-foreground text-sm">
            Dataset: <span className="font-semibold text-foreground">{dataset.fileName}</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm font-medium break-words">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardContent className="flex flex-col gap-3 pt-6 pb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-xl" />
            ))}
          </CardContent>
        </Card>
      )}

      {stats && !loading && columns.length === 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardContent className="py-12 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Database className="size-8 opacity-40" />
            <p>Tidak ada kolom kategorikal (object/string) pada dataset ini.</p>
          </CardContent>
        </Card>
      )}

      {stats && !loading && columns.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 rounded-t-2xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-purple-500" />
              Ringkasan Statistik Kategorikal
            </CardTitle>
            <CardDescription className="text-xs">{columns.length} kolom kategorikal terdeteksi</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto max-h-[550px]">
              <Table className="w-full text-xs">
                <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-xs shadow-xs">
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="font-bold text-foreground px-4 py-3">Kolom</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Count</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Missing</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Missing %</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Unique</TableHead>
                    <TableHead className="font-bold text-muted-foreground px-4 py-3">Mode (Modus)</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Mode Freq</TableHead>
                    <TableHead className="text-right font-bold text-muted-foreground px-4 py-3">Mode %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((col) => {
                    const s = stats[col];
                    return (
                      <TableRow key={col} className="border-b border-border/20 transition-colors odd:bg-muted/10 hover:bg-primary/5">
                        <TableCell className="font-bold text-foreground px-4 py-3 whitespace-nowrap">{col}</TableCell>
                        <TableCell className="text-right tabular-nums px-4 py-3">{s.count.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums px-4 py-3">{s.missing.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums px-4 py-3">
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0.5 px-2 font-bold ${
                              s["missing_%"] > 10
                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                : "border-border/60 text-muted-foreground"
                            }`}
                          >
                            {s["missing_%"]}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400 px-4 py-3">{s.unique.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold text-foreground/90 break-words max-w-xs px-4 py-3" title={String(s.mode)}>{String(s.mode)}</TableCell>
                        <TableCell className="text-right tabular-nums px-4 py-3">{s.mode_freq.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold px-4 py-3">{s["mode_%"]}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
