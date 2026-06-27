"use client";

import { BACKEND_URL } from "@/lib/config";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  CheckCircle2,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileX2,
  Loader2,
  Upload,
  UploadCloud,
  Database,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";
import { cn } from "@/lib/utils";
import { type HistoryEntry, UploadHistory } from "./upload-history";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const API_BASE = BACKEND_URL;

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".txt", ".json"] as const;
type AcceptedExt = (typeof ACCEPTED_EXTENSIONS)[number];

const FORMAT_INFO: {
  ext: AcceptedExt;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  { ext: ".csv", label: ".csv", desc: "Comma-Separated Values", icon: FileSpreadsheet },
  { ext: ".xlsx", label: ".xlsx", desc: "Microsoft Excel", icon: FileSpreadsheet },
  { ext: ".txt", label: ".txt", desc: "Tab/Comma delimited", icon: FileText },
  { ext: ".json", label: ".json", desc: "JavaScript Object Notation", icon: FileJson },
  { ext: ".xls", label: ".xls", desc: "Legacy Microsoft Excel", icon: FileSpreadsheet },
];

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function isAccepted(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function Page() {
  const router = useRouter();
  const { setDataset } = useDataset();

  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successFile, setSuccessFile] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [uploadHistory, setUploadHistory] = useState<HistoryEntry[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFileName, setActiveFileName] = useState<string | null>(null);

  const accepted = useMemo(() => ACCEPTED_EXTENSIONS.join(","), []);

  // â”€â”€ Fetch upload history and active dataset on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch history
        const historyRes = await fetch(`${API_BASE}/api/data/history`, {
          credentials: "include",
        });
        const historyData = await historyRes.json();
        if (historyData.status === "success") {
          setUploadHistory([...historyData.history].reverse());
        }

        // Fetch active dataset
        const activeRes = await fetch(`${API_BASE}/api/data/me`, {
          credentials: "include",
        });
        const activeData = await activeRes.json();
        if (activeData.has_raw_data && activeData.metadata) {
          setActiveFileName(activeData.metadata.fileName ?? null);
        }
      } catch {
        // Non-critical
      }
    }
    fetchData();
  }, []);

  // â”€â”€ Upload handler: POST to /api/data/analyze â†’ redirect on success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleFileUpload = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;

      if (!isAccepted(file.name)) {
        setError(
          `Unsupported format. Please use ${ACCEPTED_EXTENSIONS.join(", ")}`,
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
        // 1. Upload to the Antigravity EDA engine (POST /api/data/analyze)
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/api/data/analyze`, {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            (errBody as Record<string, string>).detail ??
              `Server returned ${res.status}`,
          );
        }

        const json = await res.json();

        if (json.status === "success") {
          // 2. Update the dataset context from the analyze response
          const meta = json.metadata as {
            fileName?: string;
            rows?: number;
            columns?: number;
            fileSize?: string;
          };
          const now = new Date();
          const day = String(now.getDate()).padStart(2, "0");
          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const month = monthNames[now.getMonth()];
          const year = now.getFullYear();
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          setDataset({
            fileName: meta?.fileName ?? file.name,
            rows: Number(meta?.rows ?? 0),
            columns: Number(meta?.columns ?? 0),
            fileSize: meta?.fileSize ?? "-",
            uploadTime: `${day} ${month} ${year} ${hours}:${minutes}`,
          });

          setSuccessFile(file.name);
          setFileSize(formatFileSize(file.size));

          // 3. IMMEDIATELY redirect to the data-preview page
          router.push("/dashboard/data-preview");
        }
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : `Failed to process file. Ensure backend is running at ${BACKEND_URL}.`;
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset, router],
  );

  // â”€â”€ Delete handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleDelete = useCallback(
    async (fileName: string) => {
      setIsDeleting(true);
      try {
        const res = await fetch(`${API_BASE}/api/data/history`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ fileName }),
        });
        const data = await res.json();
        if (data.status === "success") {
          toast.success(`Deleted "${fileName}" from history`);
          // Refresh history list
          const historyRes = await fetch(`${API_BASE}/api/data/history`, {
            credentials: "include",
          });
          const historyData = await historyRes.json();
          if (historyData.status === "success") {
            setUploadHistory([...historyData.history].reverse());
          }
        } else {
          toast.error(data.detail ?? "Failed to delete dataset");
        }
      } catch {
        toast.error("Failed to delete dataset. Check your connection.");
      } finally {
        setIsDeleting(false);
      }
    },
    [],
  );

  const handleRestore = useCallback(
    async (fileName: string) => {
      setIsRestoring(true);
      try {
        const res = await fetch(`${API_BASE}/api/data/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ fileName }),
        });
        const data = await res.json();
        if (data.status === "success") {
          // Update dataset context with restored dataset info
          const now = new Date();
          const day = String(now.getDate()).padStart(2, "0");
          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          const month = monthNames[now.getMonth()];
          const year = now.getFullYear();
          const hours = String(now.getHours()).padStart(2, "0");
          const minutes = String(now.getMinutes()).padStart(2, "0");
          
          setDataset({
            fileName: data.fileName,
            rows: Number(data.rows ?? 0),
            columns: Number(data.columns ?? 0),
            fileSize: "-",
            uploadTime: `${day} ${month} ${year} ${hours}:${minutes}`,
          });
          
          setActiveFileName(fileName);
          toast.success(`Switched to "${fileName}"`);
          
          // Redirect to data-preview to see the restored dataset
          router.push("/dashboard/data-preview");
        } else {
          toast.error(data.detail ?? "Failed to restore dataset");
        }
      } catch {
        toast.error("Failed to restore dataset. Check your connection.");
      } finally {
        setIsRestoring(false);
      }
    },
    [setDataset, router],
  );

  // â”€â”€ Drag & drop handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const onDrop: React.DragEventHandler<HTMLLabelElement> = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      void handleFileUpload(e.dataTransfer?.files?.[0]);
    },
    [handleFileUpload],
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
      void handleFileUpload(e.target.files?.[0]);
      e.target.value = "";
    },
    [handleFileUpload],
  );

  const handleBrowseClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    (
      document.getElementById("dataset-upload-input") as HTMLInputElement | null
    )?.click();
  }, []);

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 overflow-x-hidden p-1 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <UploadCloud className="size-5 text-primary" />
            </div>
            Upload Data
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Unggah file dataset Anda untuk memulai analisis EDA otomatis.
          </p>
        </div>
        {activeFileName ? (
          <Badge
            variant="outline"
            className="max-w-[240px] shrink-0 truncate rounded-lg border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold"
          >
            Aktif: {activeFileName}
          </Badge>
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Dropzone */}
        <div className="min-w-0 xl:col-span-8">
          <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Upload className="size-4 text-primary" />
                Unggah File Dataset
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Seret dan lepas file ke area di bawah, atau pilih file dari perangkat Anda.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 pt-6 pb-6">
              <label
                htmlFor="dataset-upload-input"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                className={cn(
                  "flex min-h-52 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
                  isDragging
                    ? "scale-[1.01] border-primary bg-primary/5 shadow-sm"
                    : "border-border/60 bg-muted/20 hover:border-primary/40 hover:bg-muted/40",
                )}
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
                  className={cn(
                    "flex size-14 items-center justify-center rounded-2xl transition-colors",
                    isDragging ? "bg-primary/10" : "bg-muted/60",
                  )}
                >
                  {isParsing ? (
                    <Loader2 className="size-7 animate-spin text-primary" />
                  ) : (
                    <UploadCloud
                      className={cn(
                        "size-7",
                        isDragging ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isParsing
                      ? "Memproses dataset..."
                      : isDragging
                        ? "Lepaskan file di sini"
                        : "Seret & lepas file di sini"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Format didukung:{" "}
                    {ACCEPTED_EXTENSIONS.map((ext, i) => (
                      <span key={ext}>
                        <span className="font-medium text-foreground/80">{ext}</span>
                        {i < ACCEPTED_EXTENSIONS.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={isParsing}
                  onClick={handleBrowseClick}
                  className="rounded-xl px-5 text-xs font-bold"
                >
                  {isParsing ? "Memproses..." : "Pilih File"}
                </Button>
              </label>

              {error ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                  <FileX2 className="mt-0.5 size-4 shrink-0" />
                  <span className="break-words">{error}</span>
                </div>
              ) : null}

              {successFile && !error ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span className="break-words">
                    File <span className="font-semibold">&quot;{successFile}&quot;</span>
                    {fileSize ? (
                      <span className="text-muted-foreground"> ({fileSize})</span>
                    ) : null}{" "}
                    berhasil diunggah. Mengalihkan ke pratinjau...
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Supported formats sidebar */}
        <div className="min-w-0 space-y-6 xl:col-span-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm">
            <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">Format Didukung</CardTitle>
              <CardDescription className="text-xs">
                Pastikan file Anda menggunakan salah satu format berikut
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4 pb-4">
              {FORMAT_INFO.map(({ ext, label, desc, icon: Icon }) => (
                <div
                  key={ext}
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/30"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{label}</p>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {activeFileName ? (
            <Card className="overflow-visible rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-bold">
                  <Database className="size-4 text-primary" />
                  Dataset Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="break-all text-xs font-semibold text-foreground">{activeFileName}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Unggah file baru untuk mengganti dataset yang sedang digunakan.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {uploadHistory.length > 0 ? (
        <UploadHistory
          history={uploadHistory}
          {...(activeFileName && { activeFileName })}
          onRestore={handleRestore}
          onDelete={handleDelete}
          isRestoring={isRestoring}
          isDeleting={isDeleting}
        />
      ) : null}
    </div>
  );
}

