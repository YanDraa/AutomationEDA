"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HighchartsOptions } from "@/lib/visualization-client";
import { postVisualizationOptions } from "@/lib/visualization-client";

function HeatmapPanel({ numericColumns }: { numericColumns: string[] }) {
  const [chartOptions, setChartOptions] = useState<HighchartsOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = numericColumns.length >= 2;

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("Heatmap membutuhkan minimal dua kolom numerik.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await postVisualizationOptions("/api/visualization/bivariate", {
        x_col: numericColumns[0],
        y_col: numericColumns[1],
        chart_type: "heatmap",
      });
      setChartOptions(result);
    } catch (e) {
      setChartOptions(null);
      setError(e instanceof Error ? e.message : "Gagal membuat grafik.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canGenerate) {
      setChartOptions(null);
    }
  }, [canGenerate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Heatmap — Korelasi Pearson</CardTitle>
        <CardDescription>
          Matriks korelasi seluruh kolom numerik ({numericColumns.length} kolom terdeteksi).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Button
          type="button"
          className="w-fit"
          onClick={() => void handleGenerate()}
          disabled={loading || !canGenerate}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Generate Heatmap
        </Button>

        {!canGenerate ? (
          <p className="text-muted-foreground text-sm">
            Upload dataset dengan minimal 2 kolom numerik untuk menampilkan heatmap.
          </p>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircle className="size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <HighchartsChart options={chartOptions} />
      </CardContent>
    </Card>
  );
}

export default function Page() {
  return (
    <VizPageShell
      title="Multivariate — Heatmap"
      description="Heatmap korelasi Pearson untuk semua kolom numerik."
    >
      {({ numericColumns }) => <HeatmapPanel numericColumns={numericColumns} />}
    </VizPageShell>
  );
}
