"use client";

import { useCallback, useEffect, useState } from "react";



import { AlertCircle, Hash, Upload } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

const BACKEND_URL = "http://127.0.0.1:8000";

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
  // file re-upload UI removed (server-cached dataset used)

  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/analysis/numeric`, {
          method: "POST",
          headers: { Accept: "application/json" },
          // No file uploaded; backend will fallback to server-cached dataset
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
      <div className="flex w-full max-w-full flex-col items-center justify-center gap-4 overflow-x-hidden py-20 text-center">
        <div className="rounded-full bg-muted p-4"><Hash className="size-8 text-muted-foreground" /></div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
        </div>
        <Button asChild size="sm"><Link href="/dashboard"><Upload className="size-4" />Upload Sekarang</Link></Button>
      </div>
    );
  }

  const columns = stats ? Object.keys(stats) : [];

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Statistik Numerikal</h1>
          <p className="mt-1 text-muted-foreground text-sm">Dataset: <span className="font-medium text-foreground">{dataset.fileName}</span></p>
        </div>
        <div />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />{error}
        </div>
      )}

      {loading && (
        <Card><CardContent className="flex flex-col gap-3 pt-6">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      )}

      {stats && !loading && columns.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Tidak ada kolom numerikal (int64/float64) pada dataset ini.
          </CardContent>
        </Card>
      )}

      {stats && !loading && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Statistik</CardTitle>
            <CardDescription>{columns.length} kolom numerikal ditemukan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card">Statistik</TableHead>
                    {columns.map((col) => (
                      <TableHead key={col} className="whitespace-nowrap text-center">{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.keys(STAT_LABELS).map((stat) => (
                    <TableRow key={stat}>
                      <TableCell className="sticky left-0 bg-card font-medium text-sm whitespace-nowrap">
                        {STAT_LABELS[stat]}
                      </TableCell>
                      {columns.map((col) => {
                        const val = (stats[col] as Record<string, unknown>)[stat];
                        if (stat === "distribution") {
                          return (
                            <TableCell key={col} className="text-center">
                              <Badge
                                variant="outline"
                                className={val === "Normal"
                                  ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                  : "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                }
                              >
                                {String(val)}
                              </Badge>
                            </TableCell>
                          );
                        }
                        if (stat === "n_outliers") {
                          return (
                            <TableCell key={col} className="text-center">
                              <span className={Number(val) > 0 ? "font-medium text-orange-600 dark:text-orange-400" : ""}>
                                {String(val ?? "-")}
                              </span>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={col} className="text-center text-sm">
                            {val === null || val === undefined ? <span className="text-muted-foreground">-</span> : String(val)}
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