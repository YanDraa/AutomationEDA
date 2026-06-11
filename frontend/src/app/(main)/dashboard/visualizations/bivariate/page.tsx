"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import { VizFieldSelect } from "@/components/visualizations/viz-field-select";
import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { fetchBivariateInsight } from "@/lib/insights-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HighchartsOptions } from "@/lib/visualization-client";
import { postVisualizationOptions } from "@/lib/visualization-client";

const BIVARIATE_CHART_TYPES = [
  { value: "scatter", label: "Scatter Plot" },
  { value: "linechart", label: "Line Chart" },
] as const;

function BivariateChartPanel({ numericColumns }: { numericColumns: string[] }) {
  const [xCol, setXCol] = useState("");
  const [yCol, setYCol] = useState("");
  const [chartType, setChartType] = useState<string>(BIVARIATE_CHART_TYPES[0].value);
  const [chartOptions, setChartOptions] = useState<HighchartsOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightVisible, setInsightVisible] = useState(false);

  useEffect(() => {
    if (numericColumns.length === 0) {
      setXCol("");
      setYCol("");
      return;
    }
    if (!numericColumns.includes(xCol)) setXCol(numericColumns[0]);
    if (!numericColumns.includes(yCol)) {
      setYCol(numericColumns.length > 1 ? numericColumns[1] : numericColumns[0]);
    }
  }, [numericColumns, xCol, yCol]);

  const handleGenerate = async () => {
    if (!xCol || !yCol || !chartType) {
      setError("Pilih variabel X, variabel Y, dan jenis grafik.");
      return;
    }
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
        chart_type: chartType,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bivariate — Numerical</CardTitle>
        <CardDescription>Scatter Plot dan Line Chart untuk dua variabel numerik.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-4">
          <VizFieldSelect
            id="bivariate-x"
            label="Variabel X"
            value={xCol}
            onValueChange={setXCol}
            options={numericColumns}
            emptyMessage="Tidak ada Variabel X"
          />
          <VizFieldSelect
            id="bivariate-y"
            label="Variabel Y"
            value={yCol}
            onValueChange={setYCol}
            options={numericColumns}
            emptyMessage="Tidak ada Variabel Y"
          />
          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <Label htmlFor="bivariate-chart-type">Jenis Grafik</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger id="bivariate-chart-type" className="w-full">
                <SelectValue placeholder="Pilih jenis grafik" />
              </SelectTrigger>
              <SelectContent>
                {BIVARIATE_CHART_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading || !xCol || !yCol}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
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
}

export default function Page() {
  return (
    <VizPageShell
      title="Bivariate Analysis"
      description="Scatter Plot dan Line Chart antar dua variabel numerik."
    >
      {({ numericColumns }) => <BivariateChartPanel numericColumns={numericColumns} />}
    </VizPageShell>
  );
}
