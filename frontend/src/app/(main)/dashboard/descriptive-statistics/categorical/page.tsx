"use client";

import { useCallback, useState } from "react";

import { AlertCircle, Tag, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

const BACKEND_URL = "http://127.0.0.1:8000";

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
  const [file, setFile] = useState<File | null>(null);

  const fetchStats = useCallback(async (f: File) => {
    setFile(f);
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch(`${BACKEND_URL}/api/analysis/categorical`, { method: "POST", body: form });
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
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) void fetchStats(f);
    e.target.value = "";
  };

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4"><Tag className="size-8 text-muted-foreground" /></div>
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Statistik Kategorikal</h1>
          <p className="mt-1 text-muted-foreground text-sm">Dataset: <span className="font-medium text-foreground">{dataset.fileName}</span></p>
        </div>
        <div>
          <input id="cat-upload" type="file" accept=".csv,.xlsx,.txt" className="hidden" onChange={onChange} />
          <Button size="sm" variant="outline" onClick={() => (document.getElementById("cat-upload") as HTMLInputElement | null)?.click()}>
            <Upload className="size-4" />
            {file ? "Hitung Ulang" : "Hitung Statistik"}
          </Button>
        </div>
      </div>

      {!file && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Tag className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Klik <strong>"Hitung Statistik"</strong> dan pilih file dataset Anda.</p>
          </CardContent>
        </Card>
      )}

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