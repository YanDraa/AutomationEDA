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

function toUploadTimeString(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hours}:${minutes}`;
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
    [dataset, setDataset, clearDataset],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
  return ctx;
}

export async function simulateDatasetFromFile(file: File): Promise<DatasetInfo> {
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
    fileSize: data.metadata.fileSize,
    uploadTime: toUploadTimeString(now),
  };
}