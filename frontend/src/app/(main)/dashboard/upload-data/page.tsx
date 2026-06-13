"use client";

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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useDataset,
} from "@/context/dataset-context";
import {
  type HistoryEntry,
  UploadHistory,
} from "./upload-history";

// ─── Constants ──────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

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

// ─── Main Component ──────────────────────────────────────────────────────────

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

  const accepted = useMemo(() => ACCEPTED_EXTENSIONS.join(","), []);

  // ── Fetch upload history on mount ──────────────────────────────────────────

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`${API_BASE}/api/data/history`, {
          credentials: "include",
        });
        const data = await res.json();
        if (data.status === "success") {
          // Show newest first
          setUploadHistory([...data.history].reverse());
        }
      } catch {
        // Non-critical
      }
    }
    fetchHistory();
  }, []);

  // ── Upload handler: POST to /api/data/analyze → redirect on success ──────────

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
            : "Failed to process file. Ensure backend is running at http://localhost:8000.";
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset, router],
  );

  // ── Restore handler ────────────────────────────────────────────────────────

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
          toast.success(`Restored "${fileName}" successfully`);
          router.refresh();
        } else {
          toast.error(data.detail ?? "Failed to restore dataset");
        }
      } catch {
        toast.error("Failed to restore dataset. Check your connection.");
      } finally {
        setIsRestoring(false);
      }
    },
    [router],
  );

  // ── Drag & drop handlers ────────────────────────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-2xl">Upload Data</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Upload your dataset file to begin automated EDA analysis.
        </p>
      </div>

      {/* ── Upload Section ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Dropzone */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UploadCloud className="size-5 text-primary" />
                Upload File
              </CardTitle>
              <CardDescription>
                Drag &amp; drop a file or click the area below to select from your device.
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

                <div
                  className={`rounded-full p-3 transition-colors ${
                    isDragging ? "bg-primary/10" : "bg-muted"
                  }`}
                >
                  {isParsing ? (
                    <Loader2 className="size-6 animate-spin text-primary" />
                  ) : (
                    <Upload
                      className={`size-6 ${
                        isDragging ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  )}
                </div>

                <div>
                  <p className="font-medium text-sm">
                    {isParsing
                      ? "Processing your dataset..."
                      : isDragging
                        ? "Drop file here..."
                        : "Drag & drop file here"}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    Supports{" "}
                    {ACCEPTED_EXTENSIONS.map((ext, i) => (
                      <span key={ext}>
                        <span className="font-medium">{ext}</span>
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
                >
                  {isParsing ? "Processing..." : "Choose File"}
                </Button>
              </label>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
                  <FileX2 className="mt-0.5 size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success (briefly shown before redirect) */}
              {successFile && !error && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-4 py-3 text-green-700 text-sm dark:text-green-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>
                    File{" "}
                    <span className="font-medium">&quot;{successFile}&quot;</span>
                    {fileSize && (
                      <span className="text-muted-foreground"> ({fileSize})</span>
                    )}{" "}
                    uploaded successfully. Redirecting to preview...
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Supported formats */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Supported Formats</CardTitle>
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
        </div>
      </div>

      {/* ── Upload History ── */}
      {uploadHistory.length > 0 && (
        <UploadHistory
          history={uploadHistory}
          onRestore={handleRestore}
          isRestoring={isRestoring}
        />
      )}
    </div>
  );
}
