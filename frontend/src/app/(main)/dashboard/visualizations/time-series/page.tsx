"use client";

import { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import { VizFieldSelect } from "@/components/visualizations/viz-field-select";
import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { fetchBivariateInsight } from "@/lib/insights-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HighchartsOptions } from "@/lib/visualization-client";
import { postVisualizationOptions } from "@/lib/visualization-client";

export default function Page() {
  const [dateCol, setDateCol] = useState("");
  const [valueCol, setValueCol] = useState("");
  const [chartOptions, setChartOptions] = useState<HighchartsOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightVisible, setInsightVisible] = useState(false);

  const handleGenerate = async () => {
    if (!dateCol || !valueCol) {
      setError("Pilih kolom tanggal dan kolom nilai terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setInsight(null);
    setInsightError(null);
    setInsightVisible(false);
    setInsightLoading(true);

    const [chartResult, insightResult] = await Promise.all([
      postVisualizationOptions("/api/visualization/time-series", { date_col: dateCol, value_col: valueCol })
        .then((data) => ({ ok: true as const, data }))
        .catch((e: unknown) => ({
          ok: false as const,
          message: e instanceof Error ? e.message : "Gagal membuat grafik time series.",
        })),
      fetchBivariateInsight(dateCol, valueCol)
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

  return (
    <VizPageShell
      title="Time Series"
      description="Visualisasi tren data berdasarkan waktu."
    >
      {({ numericColumns, categoricalColumns }) => {
        const allColumns = Array.from(new Set([...numericColumns, ...categoricalColumns]));
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Time Series Analysis</CardTitle>
              <CardDescription>
                Pilih kolom datetime dan kolom numerik untuk melihat tren data.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div className="flex flex-wrap items-end gap-4">
                <VizFieldSelect
                  id="ts-date-col"
                  label="Date/Time Column"
                  value={dateCol}
                  onValueChange={setDateCol}
                  options={allColumns}
                  emptyMessage="Tidak ada kolom tersedia"
                />
                <VizFieldSelect
                  id="ts-value-col"
                  label="Value/Numeric Column"
                  value={valueCol}
                  onValueChange={setValueCol}
                  options={numericColumns}
                  emptyMessage="Tidak ada kolom numerik"
                />
                <Button type="button" onClick={() => void handleGenerate()} disabled={loading || !dateCol || !valueCol}>
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Generate
                </Button>
              </div>

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
            </CardContent>
          </Card>
        );
      }}
    </VizPageShell>
  );
}
