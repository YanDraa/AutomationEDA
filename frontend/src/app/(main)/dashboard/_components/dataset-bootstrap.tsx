"use client";

import { useEffect } from "react";

import { useDataset } from "@/context/dataset-context";
import { fetchCurrentDataset } from "@/lib/dataset-client";

export function DatasetBootstrapper() {
  const { setDataset, clearDataset } = useDataset();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const current = await fetchCurrentDataset();
        if (cancelled) return;
        if (!current?.dataset) {
          // New user has no data — clear any stale state from previous session
          clearDataset();
          return;
        }

        // Backend payload belum selalu menyediakan uploadTime/fileSize sesuai shape,
        // jadi kita fall back supaya UI tetap menarik dan tidak menimbulkan error.
        setDataset({
          fileName: current.dataset.fileName ?? "",
          rows: Number(current.dataset.rows ?? 0),
          columns: Number(current.dataset.columns ?? 0),
          uploadTime: current.dataset.uploadTime || "-",
          fileSize: current.dataset.fileSize || "-",
        });
      } catch {
        // jika backend belum siap / gagal fetch, jangan ganggu rendering UI
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setDataset, clearDataset]);

  return null;
}

