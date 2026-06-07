"use client";

import { useEffect } from "react";

import { useDataset } from "@/context/dataset-context";
import { fetchCurrentDataset } from "@/lib/dataset-client";

export function DatasetBootstrapper() {
  const { setDataset } = useDataset();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const current = await fetchCurrentDataset();
      if (cancelled) return;
      if (!current?.dataset) return;

      // dataset-context requires uploadTime string; backend currently returns empty string.
      // Keep existing behavior but avoid runtime issues.
      setDataset(current.dataset);

    })();

    return () => {
      cancelled = true;
    };
  }, [setDataset]);

  return null;
}

