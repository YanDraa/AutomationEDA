"use client";

import { BACKEND_URL } from "@/lib/config";

import { useCallback, useEffect, useState } from "react";

import { AlertCircle, Hash, Sparkles, Database } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

interface NumericStats {
  [column: string]: {
    count: number;
    missing: number;
    "missing_%": number;
    mean: number | null;
    median: number | null;
    mode: number | null;
    std: number | null;
    variance: number | null;
    min: number | null;
    "Q1 (25%)": number | null;
    "Q3 (75%)": number | null;
    max: number | null;
    IQR: number | null;
    skewness: number | null;
    kurtosis: number | null;
    distribution: string;
    n_outliers: number;
  };
}

const STAT_LABELS: Record<string, string> = {
  count: "Count",
  missing: "Missing",
  "missing_%": "Missing %",
  mean: "Mean",
  median: "Median",
  mode: "Mode",
  std: "Std Dev",
  variance: "Variance",
  min: "Min",
  "Q1 (25%)": "Q1 (25%)",
  "Q3 (75%)": "Q3 (75%)",
  max: "Max",
  IQR: "IQR",
  skewness: "Skewness",
  kurtosis: "Kurtosis",
  distribution: "Distribusi",
  n_outliers: "Outliers",
};

export default function Page() {
  const { dataset } = useDataset();
  const [stats, setStats] = useState<NumericStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/analysis/numeric`, {
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
        const parsed: NumericStats = {};
        index.forEach((colName, i) => {
          const row = rows[i];
          parsed[colName] = {} as NumericStats[string];
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
        description="Unggah file terlebih dahulu untuk melihat statistik numerikal."
      />
    );
  }

  const columns = stats ? Object.keys(stats) : [];

  return (
    <div className="flex min-w-0 w-full flex-col gap-6 p-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <Hash className="size-6 text-blue-500" />
            Statistik Numerikal
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
            <p>Tidak ada kolom numerikal (int64/float64) pada dataset ini.</p>
          </CardContent>
        </Card>
      )}

      {stats && !loading && columns.length > 0 && (
        <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
          <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 rounded-t-2xl">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="size-4 text-blue-500" />
              Matriks Ringkasan Statistik Numerikal
            </CardTitle>
            <CardDescription className="text-xs">{columns.length} kolom numerikal terdeteksi</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="w-full overflow-x-auto max-h-[600px]">
              <Table className="w-full text-xs">
                <TableHeader className="sticky top-0 z-20 bg-background/95 backdrop-blur-xs shadow-xs">
                  <TableRow className="border-b border-border/40 hover:bg-transparent">
                    <TableHead className="sticky left-0 z-30 bg-background/95 backdrop-blur-xs font-bold text-foreground min-w-36 px-4 py-3 border-r border-border/20">
                      Metrik Statistik
                    </TableHead>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap text-center font-bold text-foreground px-4 py-3 min-w-32">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(STAT_LABELS).map((stat) => (
                    <TableRow key={stat} className="border-b border-border/20 transition-colors odd:bg-muted/10 hover:bg-primary/5">
                      <TableCell className="sticky left-0 z-10 bg-background/90 font-bold text-xs text-foreground min-w-36 px-4 py-2.5 border-r border-border/20">
                        {STAT_LABELS[stat]}
                      </TableCell>
                      {columns.map((col) => {
                        const val = (stats[col] as Record<string, unknown>)[stat];
                        if (stat === "distribution") {
                          return (
                            <TableCell key={col} className="text-center px-4 py-2.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] py-0.5 px-2 font-bold ${
                                  val === "Normal"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {String(val)}
                              </Badge>
                            </TableCell>
                          );
                        }
                        if (stat === "n_outliers") {
                          return (
                            <TableCell key={col} className="text-center px-4 py-2.5">
                              <span className={`font-bold tabular-nums ${Number(val) > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                                {String(val ?? "-")}
                              </span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={col} className="text-center text-xs tabular-nums text-foreground/80 px-4 py-2.5">
                            {val === null || val === undefined ? <span className="text-muted-foreground/40">-</span> : String(val)}
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
