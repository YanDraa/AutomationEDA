"use client";

import { useState } from "react";

import { AlertCircle, Download, FileDown, Loader2, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";
import { downloadExport } from "@/lib/reports-client";

const FORMATS = [
  { format: "csv" as const, label: "CSV", desc: "Data hasil cleaning & preprocessing" },
  { format: "xlsx" as const, label: "XLSX", desc: "Spreadsheet lengkap dengan statistik" },
  { format: "pdf" as const, label: "PDF", desc: "Laporan lengkap siap presentasi" },
];

export default function Page() {
  const { dataset } = useDataset();
  const [loadingFormat, setLoadingFormat] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = async (format: "csv" | "xlsx" | "pdf") => {
    if (!dataset) return;
    setLoadingFormat(format);
    setError(null);
    try {
      await downloadExport(format, dataset.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Gagal mengunduh ${format.toUpperCase()}.`);
    } finally {
      setLoadingFormat(null);
    }
  };

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <Download className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Download</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Unduh hasil analisis EDA dalam berbagai format.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {FORMATS.map((f) => {
          const isLoading = loadingFormat === f.format;
          return (
            <Card key={f.format}>
              <CardHeader>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileDown className="size-5 text-primary" />
                </div>
                <CardTitle className="mt-2 text-base">{f.label}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  disabled={isLoading || loadingFormat !== null}
                  onClick={() => void handleDownload(f.format)}
                >
                  {isLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Download className="size-4" />
                  )}
                  Download {f.label}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
