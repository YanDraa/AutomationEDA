"use client";

import { useCallback, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { simulateDatasetFromFile, type DatasetInfo, useDataset } from "@/context/dataset-context";

export default function Page() {
  const { setDataset, clearDataset } = useDataset();
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accepted = useMemo(() => {
    return ".csv,.xlsx";
  }, []);

  const handleFile = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;

      const lower = file.name.toLowerCase();
      const isCsv = lower.endsWith(".csv");
      const isXlsx = lower.endsWith(".xlsx");

      if (!isCsv && !isXlsx) {
        setError("Please upload a .csv or .xlsx file.");
        return;
      }

      setError(null);
      setIsParsing(true);

      try {
        const simulated: DatasetInfo = await simulateDatasetFromFile(file);
        setDataset(simulated);
      } catch (_e) {

        setError("Failed to read file. Please try again.");
      } finally {
        setIsParsing(false);
      }
    },
    [setDataset],
  );

  const onDrop: React.DragEventHandler<HTMLButtonElement> = useCallback(

    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver: React.DragEventHandler<HTMLButtonElement> = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);


  const onChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      void handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Upload Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <button
              type="button"
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-8 text-center"
            >

              <input
                aria-label="Upload dataset"
                className="hidden"
                id="dataset-upload-input"
                type="file"
                accept={accepted}
                onChange={onChange}
              />
              <p className="text-muted-foreground text-sm">

                Drag & drop your <span className="font-medium">.csv</span> or <span className="font-medium">.xlsx</span> file here
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  disabled={isParsing}
                  onClick={() => {
                    const el = document.getElementById("dataset-upload-input") as HTMLInputElement | null;
                    el?.click();
                  }}
                >
                  {isParsing ? "Processing..." : "Choose file"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isParsing}
                  onClick={() => {
                    clearDataset();
                  }}
                >
                  Clear
                </Button>
              </div>
            </button>

            {error ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive text-sm">{error}</div> : null}



            <div className="text-muted-foreground text-xs">

              Backend-ready: the sidebar reads from shared context. This step simulates Pandas-like schema (rows/columns/file size/time).
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

