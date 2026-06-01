"use client";

import type React from "react";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DatasetInfo = {
  fileName: string;
  rows: number;
  columns: number;
  uploadTime: string;
  fileSize: string;
};

type DatasetContextValue = {
  dataset: DatasetInfo | null;
  setDataset: (dataset: DatasetInfo) => void;
  clearDataset: () => void;
};

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

function _formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;

  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}


function toUploadTimeString(d: Date): string {
  return d.toISOString().replace("T", " ").replace(".000Z", "Z");
}

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const [dataset, setDatasetState] = useState<DatasetInfo | null>(null);

  const setDataset = useCallback((next: DatasetInfo) => {
    setDatasetState(next);
  }, []);

  const clearDataset = useCallback(() => {
    setDatasetState(null);
  }, []);

  const value = useMemo<DatasetContextValue>(
    () => ({
      dataset,
      setDataset,
      clearDataset,
    }),
    [dataset, setDataset, clearDataset]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
  return ctx;
}

export async function simulateDatasetFromFile(file: File): Promise<DatasetInfo> {
  // Kept name to avoid changing call sites.
  // This version makes real calls to FastAPI so you can test end-to-end in the browser.
  const now = new Date();
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("http://127.0.0.1:8000/api/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    let detail = "Upload failed";
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as {
    status: string;
    metadata: {
      fileName: string;
      rows: number;
      columns: number;
      fileSize: string;
    };
  };

  return {
    fileName: data.metadata.fileName,
    rows: data.metadata.rows,
    columns: data.metadata.columns,
    uploadTime: toUploadTimeString(now),
    fileSize: data.metadata.fileSize,
  };
}


