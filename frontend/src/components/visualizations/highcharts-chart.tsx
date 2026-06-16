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
      const paretoModule = await import("highcharts/modules/pareto");
      // Register the Pareto module with Highcharts (for versions requiring explicit registration)
      if (typeof paretoModule.default === "function") {
        paretoModule.default(Highcharts);
      }
      const { default: HighchartsReact } = await import("highcharts-react-official");
      return { Highcharts, HighchartsReact };
    })();
  }
  return modulesPromise;
}

function deepMerge(target: any, source: any): any {
  if (!source) return target;
  if (!target) return source;

  if (Array.isArray(source)) {
    if (!Array.isArray(target)) return source;
    return target.map((item, idx) => {
      if (idx < source.length) {
        return deepMerge(item, source[idx]);
      }
      return item;
    });
  }

  if (typeof source === "object") {
    if (typeof target !== "object" || target === null) return source;
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (key in target) {
        output[key] = deepMerge(target[key], source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  return source;
}

const themePresetOptions = {
  colors: [
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#ec4899", // Pink
    "#f97316"  // Orange
  ],
  title: {
    style: {
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)",
      fontWeight: "600",
    }
  },
  subtitle: {
    style: {
      color: "var(--muted-foreground)",
      fontFamily: "var(--font-sans)",
    }
  },
  xAxis: {
    gridLineColor: "var(--border)",
    lineColor: "var(--border)",
    tickColor: "var(--border)",
    title: {
      style: {
        color: "var(--muted-foreground)",
        fontFamily: "var(--font-sans)",
      }
    },
    labels: {
      style: {
        color: "var(--muted-foreground)",
        fontFamily: "var(--font-sans)",
      }
    }
  },
  yAxis: {
    gridLineColor: "var(--border)",
    lineColor: "var(--border)",
    tickColor: "var(--border)",
    title: {
      style: {
        color: "var(--muted-foreground)",
        fontFamily: "var(--font-sans)",
      }
    },
    labels: {
      style: {
        color: "var(--muted-foreground)",
        fontFamily: "var(--font-sans)",
      }
    }
  },
  legend: {
    itemStyle: {
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)",
    },
    itemHoverStyle: {
      color: "var(--primary)",
    },
    itemHiddenStyle: {
      color: "var(--muted-foreground)",
    }
  },
  tooltip: {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    style: {
      color: "var(--foreground)",
      fontFamily: "var(--font-sans)",
    }
  },
  plotOptions: {
    boxplot: {
      lineColor: "var(--foreground)",
      fillColor: "var(--muted)",
      stemColor: "var(--foreground)",
      whiskerColor: "var(--foreground)",
    },
    column: {
      borderColor: "var(--border)",
    },
    heatmap: {
      borderColor: "var(--border)",
      dataLabels: {
        style: {
          color: "var(--foreground)",
          textOutline: "none",
        }
      }
    }
  }
};

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

  // Perform a deep merge with the theme options
  const mergedOptions = deepMerge(options, themePresetOptions);

  const chartOptions: Highcharts.Options = {
    ...mergedOptions,
    chart: {
      ...(mergedOptions.chart as Highcharts.ChartOptions | undefined),
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
