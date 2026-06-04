"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchDatasetColumns } from "@/lib/visualization-client";

export function useDatasetColumns() {
  const [numericColumns, setNumericColumns] = useState<string[]>([]);
  const [categoricalColumns, setCategoricalColumns] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchDatasetColumns();
      setNumericColumns(payload.numeric_columns);
      setCategoricalColumns(payload.categorical_columns);
      setActivated(payload.activated);
    } catch {
      setError("Gagal memuat daftar kolom. Pastikan backend berjalan.");
      setNumericColumns([]);
      setCategoricalColumns([]);
      setActivated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    numericColumns,
    categoricalColumns,
    activated,
    loading,
    error,
    reload,
  };
}
