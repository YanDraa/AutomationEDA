"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { HighchartsChart } from "@/components/visualizations/highcharts-chart";
import { VizFieldSelect } from "@/components/visualizations/viz-field-select";
import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { fetchUnivariateInsight } from "@/lib/insights-client";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HighchartsOptions } from "@/lib/visualization-client";
import { postVisualizationOptions } from "@/lib/visualization-client";

const NUMERICAL_CHART_TYPES = [
  { value: "histogram", label: "Histogram" },
  { value: "boxplot", label: "Box Plot" },
] as const;

const CATEGORICAL_CHART_TYPES = [
  { value: "barchart", label: "Bar Chart" },
  { value: "piechart", label: "Pie Chart" },
] as const;

function UnivariatePanel({
  mode,
  columns,
  chartTypes,
  endpoint,
}: {
  mode: "numerical" | "categorical";
  columns: string[];
  chartTypes: readonly { value: string; label: string }[];
  endpoint: string;
}) {
  const [col, setCol] = useState("");
  const [chartType, setChartType] = useState(chartTypes[0]?.value ?? "");
  const [chartOptions, setChartOptions] = useState<HighchartsOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);
  const [insightVisible, setInsightVisible] = useState(false);

  useEffect(() => {
    if (columns.length === 0) {
      setCol("");
      return;
    }
    if (!columns.includes(col)) {
      setCol(columns[0]);
    }
  }, [columns, col]);

  const handleGenerate = async () => {
    if (!col || !chartType) {
      setError("Pilih kolom dan jenis grafik terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError(null);
    setInsight(null);
    setInsightError(null);
    setInsightVisible(false);
    setInsightLoading(true);

    const [chartResult, insightResult] = await Promise.all([
      postVisualizationOptions(endpoint, { col, chart_type: chartType })
        .then((data) => ({ ok: true as const, data }))
        .catch((e: unknown) => ({
          ok: false as const,
          message: e instanceof Error ? e.message : "Gagal membuat grafik.",
        })),
      fetchUnivariateInsight(col, mode)
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
        <CardTitle className="text-base">
          {mode === "numerical" ? "Univariate — Numerical" : "Univariate — Categorical"}
        </CardTitle>
        <CardDescription>
          {mode === "numerical"
            ? "Histogram dan Box Plot untuk satu variabel numerik."
            : "Bar Chart dan Pie Chart untuk satu variabel kategorikal."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end gap-4">
          <VizFieldSelect
            id={`${mode}-col`}
            label="Kolom"
            value={col}
            onValueChange={setCol}
            options={columns}
            emptyMessage={
              mode === "numerical" ? "Tidak ada kolom numerik" : "Tidak ada kolom kategorikal"
            }
          />
          <div className="flex min-w-[180px] flex-1 flex-col gap-2">
            <Label htmlFor={`${mode}-chart-type`}>Jenis Grafik</Label>
            <Select value={chartType} onValueChange={setChartType}>
              <SelectTrigger id={`${mode}-chart-type`} className="w-full">
                <SelectValue placeholder="Pilih jenis grafik" />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    {ct.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={() => void handleGenerate()} disabled={loading || !col}>
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
      title="Univariate Analysis"
      description="Histogram, Box Plot, Bar Chart, dan Pie Chart."
    >
      {({ numericColumns, categoricalColumns }) => (
        <Tabs defaultValue="numerical" className="w-full">
          <TabsList>
            <TabsTrigger value="numerical">Numerical</TabsTrigger>
            <TabsTrigger value="categorical">Categorical</TabsTrigger>
          </TabsList>
          <TabsContent value="numerical" className="mt-4">
            <UnivariatePanel
              mode="numerical"
              columns={numericColumns}
              chartTypes={NUMERICAL_CHART_TYPES}
              endpoint="/api/visualization/numerical"
            />
          </TabsContent>
          <TabsContent value="categorical" className="mt-4">
            <UnivariatePanel
              mode="categorical"
              columns={categoricalColumns}
              chartTypes={CATEGORICAL_CHART_TYPES}
              endpoint="/api/visualization/categorical"
            />
          </TabsContent>
        </Tabs>
      )}
    </VizPageShell>
  );
}
