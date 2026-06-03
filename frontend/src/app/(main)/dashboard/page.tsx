"use client";

import { useCallback, useMemo, useState } from "react";

import { useRouter } from "next/navigation";


import { CheckCircle2, FileSpreadsheet, Trash2, Upload, UploadCloud } from "lucide-react";

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

  const accepted = useMemo(() => ".csv,.xlsx,.txt", []);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      const lower = file.name.toLowerCase();
      if (!lower.endsWith(".csv") && !lower.endsWith(".xlsx") && !lower.endsWith(".txt")) {
        setError("Format tidak didukung. Gunakan file .csv, .xlsx, atau .txt");
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

        // After upload, auto-navigate to preview page
        router.push("/dashboard/data-preview");

      } catch (_e) {
        setError("Gagal membaca file. Pastikan backend berjalan di localhost:8000 dan coba lagi.");
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset],
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
    <div className="flex w-full flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-2xl">Upload Data</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Unggah file dataset Anda untuk memulai analisis EDA otomatis.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dropzone */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="size-5 text-primary" />
                Unggah File
              </CardTitle>
              <CardDescription>
                Seret & lepas file atau klik area di bawah untuk memilih file dari perangkat Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <label
                htmlFor="dataset-upload-input"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={`flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-primary bg-primary/5 scale-[1.01]"
                    : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
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
                <div className={`rounded-full p-3 transition-colors ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
                  <Upload className={`size-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {isDragging ? "Lepaskan file di sini..." : "Seret & lepas file di sini"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Mendukung <span className="font-medium">.csv</span>,{" "}
                    <span className="font-medium">.xlsx</span>, dan{" "}
                    <span className="font-medium">.txt</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isParsing}
                    onClick={(e) => {
                      e.preventDefault();
                      (document.getElementById("dataset-upload-input") as HTMLInputElement | null)?.click();
                    }}
                  >
                    {isParsing ? "Memproses..." : "Pilih File"}
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
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  )}
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
                  ⚠ {error}
                </div>
              )}

              {/* Success */}
              {successFile && !error && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-green-700 text-sm dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    File <span className="font-medium">"{successFile}"</span> berhasil diunggah. Lihat sidebar untuk detail dataset.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Format yang Didukung</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {[
                { ext: ".csv", desc: "Comma-Separated Values" },
                { ext: ".xlsx", desc: "Microsoft Excel" },
                { ext: ".txt", desc: "Tab/Comma delimited" },
              ].map((f) => (
                <div key={f.ext} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                    <FileSpreadsheet className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{f.ext}</p>
                    <p className="text-muted-foreground text-xs">{f.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Langkah Selanjutnya</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {[
                "Upload file dataset",
                "Lihat preview data",
                "Analisis statistik deskriptif",
                "Eksplorasi visualisasi",
                "Baca interpretasi AI",
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-sm">
                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      i === 0 && successFile
                        ? "bg-green-500 text-white"
                        : i === 0
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i === 0 && successFile ? "✓" : i + 1}
                  </div>
                  <span className={i === 0 && successFile ? "line-through text-muted-foreground" : ""}>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}