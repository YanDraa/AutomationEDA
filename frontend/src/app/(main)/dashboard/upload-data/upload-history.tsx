"use client";

import { Clock, RotateCcw, Trash2 } from "lucide-react";

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
import { useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-5 text-primary" />
          Recent Uploads
        </CardTitle>
        <CardDescription>
          Your last {history.length} uploads. Restore any dataset with one click.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {history.map((entry, idx) => (
            <div
              key={`${entry.fileName}-${entry.uploadedAt}-${idx}`}
              className="flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-sm">{entry.fileName}</p>
                  {activeFileName === entry.fileName && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  {formatDate(entry.uploadedAt)} &middot;{" "}
                  {entry.rows.toLocaleString()} rows &middot; {entry.columns}{" "}
                  cols &middot; {formatSize(entry.fileSize)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isRestoring}
                  onClick={() => onRestore(entry.fileName)}
                  className="flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isDeleting || activeFileName === entry.fileName}
                  onClick={() => setDeleteTarget(entry.fileName)}
                  className="flex items-center gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget}</strong> from your upload history? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
