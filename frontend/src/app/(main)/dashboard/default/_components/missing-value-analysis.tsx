"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

type ApiCol = { name: string; type: string; missing: number; "missing_%"?: number };
type ApiResp = {
  activated: boolean;
  preview?: { columns: ApiCol[] };
  dataset?: { fileName: string; rows: number };
};

export function MissingValueAnalysis() {
  const { dataset } = useDataset();
  const [api, setApi] = useState<ApiResp | null>(null);

  useEffect(() => {
    if (!dataset) { setApi(null); return; }
    fetch("http://localhost:8000/api/current-dataset", { credentials: "include" })
      .then((r) => r.json())
      .then((d: ApiResp) => { if (d.activated) setApi(d); })
      .catch(() => {});
  }, [dataset]);

  if (!api) return null;

  const cols = api.preview?.columns ?? [];
  const totalRows = api.dataset?.rows ?? 1;

  // Semua kolom, termasuk yang 0 missing
  const chartData = cols.map((c) => {
    const pct = c["missing_%"] ?? (c.missing / totalRows) * 100;
    return {
      name: c.name,
      missing: c.missing,
      pct: Math.round(pct * 10) / 10,
    };
  });

  const hasMissing = chartData.some((d) => d.missing > 0);
  const totalMissing = chartData.reduce((s, d) => s + d.missing, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="leading-none">Missing Value Analysis</CardTitle>
        <CardDescription>
          {hasMissing
            ? `${totalMissing.toLocaleString()} nilai kosong ditemukan — ${api.dataset?.fileName}`
            : `Dataset bersih, tidak ada missing values — ${api.dataset?.fileName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {!hasMissing ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-emerald-600">
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium">Semua kolom lengkap</p>
            <p className="text-xs text-muted-foreground">Tidak ada missing values</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 28)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--popover))",
                }}
                formatter={(value, _, props) => {
                  const pct = (props as unknown as { payload?: { pct?: number } })?.payload?.pct ?? 0;
                  return [`${Number(value)} nilai (${pct}%)`, "Missing"];
                }}
              />
              <Bar dataKey="missing" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.pct === 0   ? "hsl(142 71% 45%)"
                      : entry.pct < 5   ? "hsl(45 93% 47%)"
                      : entry.pct < 20  ? "hsl(25 95% 53%)"
                      :                   "hsl(0 84% 60%)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Legend warna */}
        {hasMissing && (
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {[
              { color: "hsl(142 71% 45%)", label: "0% (bersih)" },
              { color: "hsl(45 93% 47%)",  label: "< 5%" },
              { color: "hsl(25 95% 53%)",  label: "5–20%" },
              { color: "hsl(0 84% 60%)",   label: "> 20%" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className="h-2 w-3 rounded-sm" style={{ backgroundColor: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}