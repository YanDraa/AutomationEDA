"use client";

import { useEffect, useState } from "react";
import { Copy, Database, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

type ApiCol = { name: string; type: string; missing: number; "missing_%"?: number };
type ApiDataset = {
  activated: boolean;
  dataset?: { fileName: string; rows: number; columns: number; fileSize: string };
  preview?: { columns: ApiCol[] };
  numeric_columns?: string[];
  categorical_columns?: string[];
};

function qualityScore(totalCells: number, totalMissing: number): number {
  if (totalCells === 0) return 100;
  return Math.max(0, Math.round((1 - (totalMissing / totalCells) * 0.7) * 100));
}

export function MetricCards() {
  const { dataset } = useDataset();
  const [api, setApi] = useState<ApiDataset | null>(null);

  useEffect(() => {
    if (!dataset) { setApi(null); return; }
    fetch("http://127.0.0.1:8000/api/current-dataset")
      .then((r) => r.json())
      .then((d: ApiDataset) => { if (d.activated) setApi(d); })
      .catch(() => {});
  }, [dataset]);

  const gridClass = "grid grid-cols-2 gap-4 xl:grid-cols-3 *:data-[slot=card]:shadow-xs";

  const placeholders = [
    { icon: <Database className="size-4" />, label: "Rows" },
    { icon: <Copy className="size-4" />, label: "Duplicate Rows" },
    { icon: <ShieldCheck className="size-4" />, label: "Quality Score" },
  ];

  if (!api) {
    return (
      <div className={gridClass}>
        {placeholders.map((p) => (
          <Card key={p.label}>
            <CardHeader className="pb-2">
              <CardTitle>
                <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  {p.icon}
                </div>
              </CardTitle>
              <CardDescription className="text-xs">{p.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums text-muted-foreground">—</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cols = api.preview?.columns ?? [];
  const rows = api.dataset?.rows ?? 0;
  const columns = api.dataset?.columns ?? 0;
  const totalMissing = cols.reduce((s, c) => s + (c.missing ?? 0), 0);
  const totalCells = rows * columns;
  const score = qualityScore(totalCells, totalMissing);

  const cards = [
    {
      icon: <Database className="size-4" />,
      label: "Rows",
      value: rows.toLocaleString(),
      badge: <Badge variant="outline" className="text-xs font-normal">{api.dataset?.fileSize}</Badge>,
    },
    {
      icon: <Copy className="size-4" />,
      label: "Duplicate Rows",
      value: "0",
      badge: <Badge variant="outline" className="text-xs font-normal">none</Badge>,
    },
    {
      icon: <ShieldCheck className="size-4" />,
      label: "Quality Score",
      value: `${score}%`,
      badge: score >= 90
        ? <Badge variant="outline" className="text-xs font-normal">excellent</Badge>
        : <Badge variant="outline" className="text-xs font-normal text-amber-600">fair</Badge>,
    },
  ];

  return (
    <div className={gridClass}>
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle>
              <div className="flex size-7 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                {card.icon}
              </div>
            </CardTitle>
            <CardDescription className="text-xs">{card.label}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5">
            <div className="text-2xl font-semibold tabular-nums leading-none tracking-tight">
              {card.value}
            </div>
            {card.badge}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}