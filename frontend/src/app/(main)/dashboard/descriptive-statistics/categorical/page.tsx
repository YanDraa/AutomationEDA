"use client";

import { useCallback, useEffect, useState } from "react";


import { AlertCircle } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

const BACKEND_URL = "http://localhost:8000";

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
  // file re-upload UI removed (server-cached dataset used)

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
        title="No dataset loaded"
        description="Upload a file first to view categorical statistics."
      />
    );
  }

  const columns = stats ? Object.keys(stats) : [];

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Statistik Kategorikal</h1>
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
            Tidak ada kolom kategorikal (object/string) pada dataset ini.
          </CardContent>
        </Card>
      )}

      {stats && !loading && columns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Statistik Kategorikal</CardTitle>
            <CardDescription>{columns.length} kolom kategorikal ditemukan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kolom</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                    <TableHead className="text-right">Missing %</TableHead>
                    <TableHead className="text-right">Unique</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Mode Freq</TableHead>
                    <TableHead className="text-right">Mode %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.map((col) => {
                    const s = stats[col];
                    return (
                      <TableRow key={col}>
                        <TableCell className="font-medium">{col}</TableCell>
                        <TableCell className="text-right">{s.count}</TableCell>
                        <TableCell className="text-right">{s.missing}</TableCell>
                        <TableCell className="text-right">
                          <span className={s["missing_%"] > 10 ? "font-medium text-destructive" : ""}>
                            {s["missing_%"]}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{s.unique}</TableCell>
                        <TableCell className="max-w-32 truncate font-medium" title={String(s.mode)}>{String(s.mode)}</TableCell>
                        <TableCell className="text-right">{s.mode_freq}</TableCell>
                        <TableCell className="text-right">{s["mode_%"]}%</TableCell>
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