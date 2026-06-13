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
  refreshDataset: () => Promise<void>;
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

  const refreshDataset = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:8000/api/data/me", {
        credentials: "include",
      });
      if (!res.ok) { setDatasetState(null); return; }
      const json = (await res.json()) as {
        status: string;
        has_raw_data: boolean;
        metadata: {
          fileName?: string;
          rows?: number;
          columns?: number;
          fileSize?: string;
          uploadedAt?: string;
        } | null;
      };
      if (!json.has_raw_data || !json.metadata) {
        setDatasetState(null);
        return;
      }
      const meta = json.metadata;
      const uploadedAt = meta.uploadedAt
        ? toUploadTimeString(new Date(meta.uploadedAt))
        : "-";
      setDatasetState({
        fileName: meta.fileName ?? "dataset",
        rows: meta.rows ?? 0,
        columns: meta.columns ?? 0,
        fileSize: meta.fileSize ?? "-",
        uploadTime: uploadedAt,
      });
    } catch {
      setDatasetState(null);
    }
  }, []);

  const value = useMemo<DatasetContextValue>(
    () => ({
      dataset,
      setDataset,
      clearDataset,
      refreshDataset,
    }),
    [dataset, setDataset, clearDataset, refreshDataset],
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

  const res = await fetch("http://localhost:8000/api/upload", {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = `Upload gagal (HTTP ${res.status})`;
    try {
      const data = (await res.json()) as { detail?: unknown };
      if (Array.isArray(data.detail)) {
        detail = data.detail
          .map((item) =>
            typeof item === "object" && item !== null && "msg" in item
              ? String((item as { msg: string }).msg)
              : String(item),
          )
          .join(", ");
      } else if (typeof data.detail === "string") {
        detail = data.detail;
      }
    } catch {
      if (res.status === 0 || res.status >= 500) {
        detail =
          "Backend tidak merespons. Pastikan server berjalan di http://localhost:8000";
      }
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