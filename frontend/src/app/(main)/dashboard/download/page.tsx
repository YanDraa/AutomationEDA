"use client";

import { useState } from "react";

import {
  AlertCircle,
  Download,
  FileDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";
import { downloadExport } from "@/lib/reports-client";
import { cn } from "@/lib/utils";

const FORMATS = [
  {
    format: "csv" as const,
    label: "CSV",
    desc: "Data hasil cleaning & preprocessing, siap diproses ulang",
    icon: FileText,
    accent: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    format: "xlsx" as const,
    label: "XLSX",
    desc: "Spreadsheet lengkap dengan statistik dan metadata",
    icon: FileSpreadsheet,
    accent: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    format: "pdf" as const,
    label: "PDF",
    desc: "Laporan lengkap siap presentasi dan dicetak",
    icon: FileDown,
    accent: "text-violet-500",
    bg: "bg-violet-500/10",
  },
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
      <EmptyDataset
        title="Belum ada dataset yang dimuat"
        description="Unggah file terlebih dahulu untuk mengunduh hasil analisis."
      />
    );
  }

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 overflow-x-hidden p-1 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Download className="size-5 text-primary" />
            </div>
            Download
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Unduh hasil analisis EDA dalam berbagai format sesuai kebutuhan Anda.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="max-w-[220px] truncate rounded-lg border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold"
          >
            {dataset.fileName}
          </Badge>
          <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px] font-semibold">
            {FORMATS.length} format tersedia
          </Badge>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Format options */}
        <div className="min-w-0 space-y-3 xl:col-span-8">
          <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm">
            <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-4">
              <CardTitle className="text-base font-semibold">Pilih Format Export</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Setiap format dirancang untuk kebutuhan berbeda — dari analisis lanjutan hingga
                presentasi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 pb-6">
              {FORMATS.map(({ format, label, desc, icon: Icon, accent, bg }) => {
                const isLoading = loadingFormat === format;
                const isDisabled = loadingFormat !== null;

                return (
                  <div
                    key={format}
                    className="flex flex-col gap-3 rounded-xl border border-border/40 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                          bg,
                        )}
                      >
                        <Icon className={cn("size-4", accent)} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {desc}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDisabled}
                      onClick={() => void handleDownload(format)}
                      className="h-9 w-full shrink-0 rounded-xl border-border/60 text-xs font-bold sm:w-auto sm:min-w-[140px]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Mengunduh...
                        </>
                      ) : (
                        <>
                          <Download className="size-3.5" />
                          Unduh {label}
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Dataset summary sidebar */}
        <div className="min-w-0 space-y-6 xl:col-span-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-visible rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="size-4 text-primary" />
                Ringkasan Dataset
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Data yang akan diekspor berasal dari dataset aktif berikut.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <dl className="space-y-2.5 rounded-xl border border-border/40 bg-background/60 p-3.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Nama File</dt>
                  <dd className="min-w-0 break-all text-right font-semibold text-foreground">
                    {dataset.fileName}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                  <dt className="text-muted-foreground">Total Baris</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {dataset.rows.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                  <dt className="text-muted-foreground">Total Kolom</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {dataset.columns.toLocaleString()}
                  </dd>
                </div>
                {dataset.fileSize ? (
                  <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                    <dt className="text-muted-foreground">Ukuran File</dt>
                    <dd className="font-semibold text-foreground">{dataset.fileSize}</dd>
                  </div>
                ) : null}
                {dataset.uploadTime ? (
                  <div className="flex items-start justify-between gap-3 border-t border-border/40 pt-2.5">
                    <dt className="shrink-0 text-muted-foreground">Diunggah</dt>
                    <dd className="text-right font-semibold text-foreground">
                      {dataset.uploadTime}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
            <CardFooter className="border-0 bg-transparent px-4 pt-2 pb-5">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                File yang diunduh mencerminkan hasil analisis terakhir pada dataset ini.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
