"use client";

import { BACKEND_URL } from "@/lib/config";

import { useCallback, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { CheckCircle2, FileSpreadsheet, Trash2, Upload, UploadCloud, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  simulateDatasetFromFile,
  type DatasetInfo,
  useDataset,
} from "@/context/dataset-context";

export default function Page() {
  const router = useRouter();
  const { setDataset, clearDataset, dataset } = useDataset();
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<string | null>(null);

  const accepted = useMemo(() => ".csv,.xlsx,.xls,.txt,.json", []);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (
        !lower.endsWith(".csv") &&
        !lower.endsWith(".xlsx") &&
        !lower.endsWith(".xls") &&
        !lower.endsWith(".txt") &&
        !lower.endsWith(".json")
      ) {
        setError("Format tidak didukung. Gunakan file .csv, .xlsx, .xls, .txt, atau .json");
        setSuccessFile(null);
        return;
      }
      setError(null);
      setSuccessFile(null);
      setIsParsing(true);
      try {
        const result: DatasetInfo = await simulateDatasetFromFile(file);
        setDataset(result);
        setSuccessFile(file.name);

        router.push("/dashboard/data-preview");

      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : `Gagal membaca file. Pastikan backend berjalan di ${BACKEND_URL}.`;
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset, router],
  );

  const onDrop: React.DragEventHandler<HTMLLabelElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      void handleFile(e.dataTransfer?.files?.[0]);
    },
    [handleFile],
  );

  const onDragOver: React.DragEventHandler<HTMLLabelElement> = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave: React.DragEventHandler<HTMLLabelElement> = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      void handleFile(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-1">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
          <UploadCloud className="size-6 text-primary" />
          Upload Dataset
        </h1>
        <p className="text-muted-foreground text-sm">
          Unggah file dataset Anda untuk memulai analisis EDA otomatis dan eksplorasi data mendalam.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 py-0.5">
        {/* Dropzone */}
        <div className="lg:col-span-2">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 rounded-t-2xl">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="size-4 text-primary" />
                Area Unggah File
              </CardTitle>
              <CardDescription className="text-xs">
                Seret & lepas file atau klik area di bawah untuk memilih file dari perangkat Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 pt-6 pb-6">
              <label
                htmlFor="dataset-upload-input"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`flex min-h-64 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.01] shadow-md"
                    : "border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
                }`}
              >
                <input
                  aria-label="Upload dataset"
                  className="hidden"
                  id="dataset-upload-input"
                  type="file"
                  accept={accepted}
                  onChange={onChange}
                />
                <div className={`rounded-2xl p-4 transition-all duration-300 ${isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"}`}>
                  <Upload className={`size-8 transition-colors ${isDragging ? "text-primary" : "text-primary/80"}`} />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-base text-foreground">
                    {isDragging ? "Lepaskan file di sini..." : "Seret & lepas file dataset Anda"}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Mendukung format <span className="font-semibold text-foreground">.CSV</span>,{" "}
                    <span className="font-semibold text-foreground">.XLSX</span>,{" "}
                    <span className="font-semibold text-foreground">.JSON</span>, dan{" "}
                    <span className="font-semibold text-foreground">.TXT</span>
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isParsing}
                    onClick={(e) => {
                      e.preventDefault();
                      (document.getElementById("dataset-upload-input") as HTMLInputElement | null)?.click();
                    }}
                    className="rounded-xl px-4 font-semibold shadow-xs"
                  >
                    {isParsing ? "Memproses..." : "Pilih File dari Perangkat"}
                  </Button>
                  {dataset && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isParsing}
                      onClick={(e) => {
                        e.preventDefault();
                        clearDataset();
                        setSuccessFile(null);
                        setError(null);
                      }}
                      className="rounded-xl border-border/60 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4 mr-1.5" />
                      Hapus
                    </Button>
                  )}
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm font-medium break-words">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {successFile && !error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-700 dark:text-emerald-400 text-sm font-medium break-words">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    File <span className="font-bold">"{successFile}"</span> berhasil diunggah dan dianalisis.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-6">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 rounded-t-2xl">
              <CardTitle className="text-base font-semibold">Format yang Didukung</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4 pb-4">
              {[
                { ext: ".CSV", desc: "Comma-Separated Values", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                { ext: ".XLSX / .XLS", desc: "Microsoft Excel Worksheet", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                { ext: ".JSON / .TXT", desc: "Structured / Delimited Data", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
              ].map((f) => (
                <div key={f.ext} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-muted/10">
                  <div className={`flex size-9 items-center justify-center rounded-lg ${f.color} font-bold text-xs shrink-0`}>
                    <FileSpreadsheet className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-foreground">{f.ext}</p>
                    <p className="text-muted-foreground text-[11px] break-words">{f.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm bg-card flex-1">
            <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 rounded-t-2xl">
              <CardTitle className="text-base font-semibold">Alur Analisis EDA</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5 pt-4 pb-4">
              {[
                "Unggah file dataset",
                "Periksa integritas & preview data",
                "Analisis statistik deskriptif",
                "Eksplorasi visualisasi interaktif",
                "Baca interpretasi & unduh laporan",
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-3 p-2 rounded-lg text-xs">
                  <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i === 0 && successFile
                        ? "bg-emerald-500 text-white shadow-xs"
                        : i === 0
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i === 0 && successFile ? "✓" : i + 1}
                  </div>
                  <span className={`font-semibold ${i === 0 && successFile ? "line-through text-muted-foreground" : "text-foreground/90"} break-words`}>
                    {step}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
