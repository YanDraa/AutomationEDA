"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileX2,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  simulateDatasetFromFile,
  type DatasetInfo,
  useDataset,
} from "@/context/dataset-context";

// ─── Konstanta ──────────────────────────────────────────────────────────────

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".txt", ".json"] as const;
type AcceptedExt = (typeof ACCEPTED_EXTENSIONS)[number];

const FORMAT_INFO: {
  ext: AcceptedExt;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { ext: ".csv",  label: ".csv",  desc: "Comma-Separated Values",  icon: FileSpreadsheet },
  { ext: ".xlsx", label: ".xlsx", desc: "Microsoft Excel",         icon: FileSpreadsheet },
  { ext: ".txt",  label: ".txt",  desc: "Tab/Comma delimited",     icon: FileText        },
  { ext: ".json", label: ".json", desc: "JavaScript Object Notation", icon: FileJson     },
  { ext: ".xls",  label: ".xls",  desc: "Legacy Microsoft Excel",    icon: FileSpreadsheet },
];

const STEPS = [
  "Upload file dataset",
  "Lihat preview data",
  "Analisis statistik deskriptif",
  "Eksplorasi visualisasi",
  "Baca interpretasi AI",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isAccepted(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Komponen utama ───────────────────────────────────────────────────────────

export default function Page() {
  const router = useRouter();
  const { setDataset, clearDataset, dataset } = useDataset();

  const [isParsing, setIsParsing]     = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<string | null>(null);
  const [fileSize, setFileSize]       = useState<string | null>(null);

  const accepted = useMemo(() => ACCEPTED_EXTENSIONS.join(","), []);

  // ── Handler utama ──────────────────────────────────────────────────────────

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;

      if (!isAccepted(file.name)) {
        setError(
          `Format tidak didukung. Gunakan file ${ACCEPTED_EXTENSIONS.join(", ")}`,
        );
        setSuccessFile(null);
        setFileSize(null);
        return;
      }

      setError(null);
      setSuccessFile(null);
      setFileSize(null);
      setIsParsing(true);

      try {
        const result: DatasetInfo = await simulateDatasetFromFile(file);
        setDataset(result);
        setSuccessFile(file.name);
        setFileSize(formatFileSize(file.size));
        router.push("/dashboard/data-preview");
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Gagal membaca file. Pastikan backend berjalan di http://127.0.0.1:8000.";
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset],
  );

  // ── Drag & drop handlers ───────────────────────────────────────────────────

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

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      clearDataset();
      setSuccessFile(null);
      setFileSize(null);
      setError(null);
    },
    [clearDataset],
  );

  const handleBrowseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    (
      document.getElementById("dataset-upload-input") as HTMLInputElement | null
    )?.click();
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

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
        {/* ── Dropzone ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="size-5 text-primary" />
                Unggah File
              </CardTitle>
              <CardDescription>
                Seret &amp; lepas file atau klik area di bawah untuk memilih file dari perangkat Anda.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Dropzone label */}
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

                <div
                  className={`rounded-full p-3 transition-colors ${
                    isDragging ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  <Upload
                    className={`size-6 ${
                      isDragging ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                </div>

                <div>
                  <p className="font-medium text-sm">
                    {isDragging
                      ? "Lepaskan file di sini..."
                      : "Seret & lepas file di sini"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Mendukung{" "}
                    {ACCEPTED_EXTENSIONS.map((ext, i) => (
                      <span key={ext}>
                        <span className="font-medium">{ext}</span>
                        {i < ACCEPTED_EXTENSIONS.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isParsing}
                    onClick={handleBrowseClick}
                  >
                    {isParsing ? "Memproses..." : "Pilih File"}
                  </Button>

                  {dataset && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isParsing}
                      onClick={handleClear}
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  )}
                </div>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
                  <FileX2 className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success */}
              {successFile && !error && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-green-700 text-sm dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    File{" "}
                    <span className="font-medium">"{successFile}"</span>
                    {fileSize && (
                      <span className="text-muted-foreground"> ({fileSize})</span>
                    )}{" "}
                    berhasil diunggah. Lihat sidebar untuk detail dataset.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Panel kanan ── */}
        <div className="flex flex-col gap-4">
          {/* Format yang didukung */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Format yang Didukung</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {FORMAT_INFO.map(({ ext, label, desc, icon: Icon }) => (
                <div key={ext} className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-muted-foreground text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Langkah selanjutnya */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Langkah Selanjutnya</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {STEPS.map((step, i) => {
                const done = i === 0 && !!successFile;
                return (
                  <div key={step} className="flex items-center gap-2 text-sm">
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                        done
                          ? "bg-green-500 text-white"
                          : i === 0
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </div>
                    <span className={done ? "line-through text-muted-foreground" : ""}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}