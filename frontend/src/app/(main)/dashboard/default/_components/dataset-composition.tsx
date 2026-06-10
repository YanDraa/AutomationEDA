"use client";

import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

type ApiCol  = { name: string; type: string; missing: number };
type ApiResp = {
  activated: boolean;
  preview?: { columns: ApiCol[] };
  numeric_columns?: string[];
  categorical_columns?: string[];
  dataset?: { fileName: string };
};

const TYPE_META: Record<string, { label: string; color: string }> = {
  numerical:   { label: "Numerical",   color: "hsl(221 83% 53%)" },
  categorical: { label: "Categorical", color: "hsl(262 83% 58%)" },
  datetime:    { label: "Datetime",    color: "hsl(142 71% 45%)" },
  other:       { label: "Other",       color: "hsl(0 0% 75%)"    },
};

export function DatasetComposition() {
  const { dataset } = useDataset();
  const [api, setApi] = useState<ApiResp | null>(null);

  useEffect(() => {
    if (!dataset) { setApi(null); return; }
    fetch("http://127.0.0.1:8000/api/current-dataset")
      .then((r) => r.json())
      .then((d: ApiResp) => { if (d.activated) setApi(d); })
      .catch(() => {});
  }, [dataset]);

  if (!api) return null;

  const cols = api.preview?.columns ?? [];
  const counts: Record<string, number> = {};
  cols.forEach((c) => {
    const t = ["numerical", "categorical", "datetime"].includes(c.type) ? c.type : "other";
    counts[t] = (counts[t] ?? 0) + 1;
  });

  const donutData = Object.entries(counts).map(([type, count]) => ({
    type,
    name:  TYPE_META[type]?.label ?? type,
    value: count,
    color: TYPE_META[type]?.color ?? "hsl(0 0% 75%)",
  }));

  const total = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Dataset Composition</CardTitle>
        <CardDescription className="text-xs">
          Distribusi tipe kolom — {api.dataset?.fileName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Donut chart */}
          <div className="relative shrink-0">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {donutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 6,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--popover))",
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} kolom (${((value / total) * 100).toFixed(0)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label — absolute di dalam wrapper relative */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">{total}</span>
              <span className="text-[10px] text-muted-foreground">kolom</span>
            </div>
          </div>

          {/* Legend di kanan, tidak nabrak chart */}
          <div className="flex flex-1 flex-col gap-2.5">
            {donutData.map((d) => (
              <div key={d.type} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="truncate text-sm">{d.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-right">
                  <span className="text-sm font-medium">{d.value}</span>
                  <span className="text-xs text-muted-foreground w-8">
                    {((d.value / total) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}