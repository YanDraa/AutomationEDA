"use client";

import { useEffect, useState } from "react";

import type { HighchartsOptions } from "@/lib/visualization-client";
import type HighchartsType from "highcharts";

type HighchartsReactComponent = typeof import("highcharts-react-official").default;

type ChartLib = {
  Highcharts: typeof HighchartsType;
  HighchartsReact: HighchartsReactComponent;
};

let modulesPromise: Promise<ChartLib> | null = null;

function loadChartLib(): Promise<ChartLib> {
  if (!modulesPromise) {
    modulesPromise = (async () => {
      const { default: Highcharts } = await import("highcharts");
      // Highcharts 12+: modules self-register on import (do not call as functions)
      await import("highcharts/highcharts-more");
      await import("highcharts/modules/heatmap");
      const { default: HighchartsReact } = await import("highcharts-react-official");
      return { Highcharts, HighchartsReact };
    })();
  }
  return modulesPromise;
}

type HighchartsChartProps = {
  options: HighchartsOptions | null;
  className?: string;
};

export function HighchartsChart({ options, className }: HighchartsChartProps) {
  const [chartLib, setChartLib] = useState<ChartLib | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadChartLib()
      .then((lib) => {
        if (!cancelled) setChartLib(lib);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Gagal memuat library Highcharts.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return <p className="text-destructive text-sm">{loadError}</p>;
  }

  if (!chartLib || !options) {
    return null;
  }

  const { Highcharts, HighchartsReact } = chartLib;

  const chartOptions: Highcharts.Options = {
    ...options,
    chart: {
      ...(options.chart as Highcharts.ChartOptions | undefined),
      backgroundColor: "transparent",
    },
    credits: { enabled: false },
  };

  return (
    <div className={className ?? "min-h-[420px] w-full"}>
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        containerProps={{ style: { width: "100%", minHeight: "400px" } }}
      />
    </div>
  );
}
