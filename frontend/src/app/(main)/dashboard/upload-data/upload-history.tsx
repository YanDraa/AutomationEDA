"use client";

import { useState } from "react";
import { Clock, Database, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface HistoryEntry {
  fileName: string;
  uploadedAt: string;
  rows: number;
  columns: number;
  fileSize: number;
}

interface UploadHistoryProps {
  history: HistoryEntry[];
  activeFileName?: string;
  onRestore: (fileName: string) => void;
  onDelete: (fileName: string) => void;
  isRestoring?: boolean;
  isDeleting?: boolean;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadHistory({
  history,
  activeFileName,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
}: UploadHistoryProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  if (!history.length) return null;

  const handleConfirmDelete = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return (
    <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm">
      <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="size-4 text-primary" />
          Riwayat Upload
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {history.length} dataset terakhir. Pulihkan dataset sebelumnya dengan satu klik.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-6 pb-6">
        {history.map((entry, idx) => {
          const isActive = activeFileName === entry.fileName;

          return (
            <div
              key={`${entry.fileName}-${entry.uploadedAt}-${idx}`}
              className={cn(
                "flex flex-col gap-3 rounded-xl border border-border/40 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between",
                isActive
                  ? "border-primary/25 bg-primary/[0.03]"
                  : "hover:bg-muted/30",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Database className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all text-sm font-semibold text-foreground">
                      {entry.fileName}
                    </p>
                    {isActive ? (
                      <Badge className="shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase">
                        Aktif
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {formatDate(entry.uploadedAt)} · {entry.rows.toLocaleString()} baris ·{" "}
                    {entry.columns} kolom · {formatSize(entry.fileSize)}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:ml-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRestoring || isActive}
                  onClick={() => onRestore(entry.fileName)}
                  className="h-8 flex-1 rounded-lg border-border/60 text-xs font-semibold sm:flex-none"
                >
                  <RotateCcw className="size-3.5" />
                  Pulihkan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting || isActive}
                  onClick={() => setDeleteTarget(entry.fileName)}
                  className="h-8 flex-1 rounded-lg border-border/60 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
                >
                  <Trash2 className="size-3.5" />
                  Hapus
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{deleteTarget}</strong> dari riwayat upload? Tindakan
              ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
