"use client";

import { useEffect, useState } from "react";

import { EmptyDataset } from "@/components/empty-dataset";
import { useDataset } from "@/context/dataset-context";
import { MetricCards } from "./_components/metric-cards";
import { DatasetComposition } from "./_components/dataset-composition";
import { MissingValueAnalysis } from "./_components/missing-value-analysis";
import { PerformanceOverview } from "./_components/performance-overview";
import { SubscriberOverview } from "./_components/subscriber-overview";
import { AiInsight } from "./_components/ai-insight";

export default function Page() {
  const { dataset, refreshDataset } = useDataset();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      await refreshDataset();
      setChecked(true);
    })();
  }, [refreshDataset]);

  if (!checked) return null;

  if (!dataset) {
    return <EmptyDataset />;
  }

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      {/* 1 — KPI Cards */}
      <MetricCards />

      {/* 2 — Dataset Composition + Missing Value Analysis */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DatasetComposition />
        <MissingValueAnalysis />
      </div>

      {/* 3 — Performance Overview (chart numerik) */}
      <PerformanceOverview />

      {/* 4 — Dataset Preview (tabel 10 baris) */}
      <SubscriberOverview />

      {/* 5 — AI Generated Insight */}
      <AiInsight />
    </div>
  );
}