"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { fetchBivariateInsight } from "@/lib/insights-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HighchartsOptions } from "@/lib/visualization-client";
import { postVisualizationOptions } from "@/lib/visualization-client";

function HeatmapPanel({ numericColumns }: { numericColumns: string[] }) {
  const [chartOptions, setChartOptions] = useState<HighchartsOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightVisible, setInsightVisible] = useState(false);

  const canGenerate = numericColumns.length >= 2;

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError("Heatmap membutuhkan minimal dua kolom numerik.");
      return;
    }
    const xCol = numericColumns[0];
    const yCol = numericColumns[1];

    setLoading(true);
    setError(null);
    setInsight(null);
    setInsightError(null);
    setInsightVisible(false);
    setInsightLoading(true);

    const [chartResult, insightResult] = await Promise.all([
      postVisualizationOptions("/api/visualization/bivariate", {
        x_col: xCol,
        y_col: yCol,
        chart_type: "heatmap",
      })
        .then((data) => ({ ok: true as const, data }))
        .catch((e: unknown) => ({
          ok: false as const,
          message: e instanceof Error ? e.message : "Gagal membuat grafik.",
        })),
      fetchBivariateInsight(xCol, yCol)
        .then((data) => ({ ok: true as const, data }))
        .catch((e: unknown) => ({
          ok: false as const,
          message: e instanceof Error ? e.message : "Gagal memuat insight AI.",
        })),
    ]);

    if (chartResult.ok) {
      setChartOptions(chartResult.data);
    } else {
      setChartOptions(null);
      setError(chartResult.message);
    }

    if (insightResult.ok) {
      setInsight(insightResult.data);
    } else {
      setInsightError(insightResult.message);
    }

    setInsightVisible(chartResult.ok || insightResult.ok);
    setLoading(false);
    setInsightLoading(false);
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

        <AiInsightPanel
          insight={insight}
          loading={insightLoading}
          error={insightError}
          visible={insightVisible || insightLoading}
        />
        {insightVisible && numericColumns.length >= 2 ? (
          <p className="text-muted-foreground text-xs">
            Insight AI untuk heatmap merujuk pada korelasi pasangan{" "}
            <span className="font-medium">{numericColumns[0]}</span> dan{" "}
            <span className="font-medium">{numericColumns[1]}</span>; matriks lengkap
            ditampilkan pada grafik di atas.
          </p>
        ) : null}
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
