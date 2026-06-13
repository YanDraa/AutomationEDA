"use client";

import { useEffect, useState } from "react";
import { addHours, endOfToday, format, parseISO, subHours } from "date-fns";
import { Area, CartesianGrid, ComposedChart, Line, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent,
  ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDataset } from "@/context/dataset-context";

// ── Static fallback ───────────────────────────────────────────────────────────

const STATIC_VALUES = [
  { newCustomers: 23840, activeAccounts: 6630, returningUsers: 4880 },
  { newCustomers: 11508, activeAccounts: 6468, returningUsers: 4643 },
  { newCustomers: 9975,  activeAccounts: 6117, returningUsers: 4573 },
  { newCustomers: 10310, activeAccounts: 6152, returningUsers: 4657 },
  { newCustomers: 12244, activeAccounts: 6473, returningUsers: 4657 },
  { newCustomers: 11476, activeAccounts: 6347, returningUsers: 4533 },
  { newCustomers: 9944,  activeAccounts: 6250, returningUsers: 4588 },
  { newCustomers: 10259, activeAccounts: 6417, returningUsers: 4763 },
  { newCustomers: 9698,  activeAccounts: 6256, returningUsers: 4710 },
  { newCustomers: 8435,  activeAccounts: 6161, returningUsers: 4544 },
];

const endDate = endOfToday();
const STATIC_DATA = STATIC_VALUES.map((p, i) => ({
  date: format(addHours(subHours(endDate, (STATIC_VALUES.length - 1) * 12), i * 12), "yyyy-MM-dd"),
  ...p,
}));

const STATIC_CONFIG = {
  newCustomers:   { label: "New Customers",   color: "var(--chart-1)" },
  activeAccounts: { label: "Active Accounts", color: "var(--chart-2)" },
  returningUsers: { label: "Returning Users", color: "var(--chart-3)" },
} satisfies ChartConfig;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Sanitize kolom name jadi key CSS-variable-safe (hapus karakter non-alphanumeric)
function toKey(col: string) {
  return col.replace(/[^a-zA-Z0-9]/g, "");
}

function buildChartData(rows: Record<string, unknown>[], c1: string, c2: string, c3: string) {
  const step = Math.max(1, Math.floor(rows.length / 60));
  const sampled = rows.filter((_, i) => i % step === 0).slice(0, 60);
  const start = subHours(endOfToday(), (sampled.length - 1) * 12);
  return sampled.map((row, i) => ({
    date: format(addHours(start, i * 12), "yyyy-MM-dd"),
    [toKey(c1)]: Number(row[c1]) || 0,
    [toKey(c2)]: Number(row[c2]) || 0,
    [toKey(c3)]: Number(row[c3]) || 0,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

type ApiResponse = {
  activated: boolean;
  dataset?: { fileName: string; rows: number };
  preview?: { rows: Record<string, unknown>[] };
  numeric_columns?: string[];
};

export function PerformanceOverview() {
  const { dataset } = useDataset();
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [col1, setCol1] = useState<string>("");
  const [col2, setCol2] = useState<string>("");
  const [col3, setCol3] = useState<string>("");

  useEffect(() => {
    if (!dataset) { setApiData(null); return; }
    fetch("http://localhost:8000/api/current-dataset", { credentials: "include" })
      .then((r) => r.json())
      .then((d: ApiResponse) => {
        setApiData(d);
        const numCols = d.numeric_columns ?? [];
        setCol1(numCols[0] ?? "");
        setCol2(numCols[1] ?? numCols[0] ?? "");
        setCol3(numCols[2] ?? numCols[0] ?? "");
      })
      .catch(() => {});
  }, [dataset]);

  // ── Fallback statis ───────────────────────────────────────────────────────
  if (!dataset || !apiData?.activated) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="leading-none">Customer Activity</CardTitle>
          <CardDescription>
            <span className="@[540px]/card:block hidden">Customer activity for the last 3 months</span>
            <span className="@[540px]/card:hidden">Last 3 months</span>
          </CardDescription>
          <CardAction className="flex items-center gap-2">
            <Select defaultValue="quarter">
              <SelectTrigger size="sm" className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup><SelectLabel>Period</SelectLabel>
                  <SelectItem value="quarter">3 months</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">View report</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer config={STATIC_CONFIG} className="aspect-auto h-80 w-full">
            <ComposedChart data={STATIC_DATA} margin={{ top: 0 }}>
              <defs>
                <linearGradient id="fillNC" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-newCustomers)" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="var(--color-newCustomers)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeOpacity={0.5} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48}
                tickFormatter={(v) => parseISO(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-50" indicator="line"
                labelFormatter={(v) => format(parseISO(v), "d MMMM yyyy")} />} />
              <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />
              <Area dataKey="newCustomers" type="natural" fill="url(#fillNC)"
                stroke="var(--color-newCustomers)" strokeWidth={1.25} dot={false} fillOpacity={1} />
              <Line dataKey="activeAccounts" type="natural" stroke="var(--color-activeAccounts)" strokeWidth={1.4} dot={false} />
              <Line dataKey="returningUsers" type="natural" stroke="var(--color-returningUsers)" strokeWidth={1.2} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    );
  }

  const numCols = apiData.numeric_columns ?? [];
  const rows    = apiData.preview?.rows ?? [];

  if (numCols.length === 0) {
    return (
      <Card className="@container/card">
        <CardHeader>
          <CardTitle className="leading-none">Performance Overview</CardTitle>
          <CardDescription>Dataset tidak memiliki kolom numerik.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const c1 = col1 || numCols[0];
  const c2 = col2 || numCols[1] || numCols[0];
  const c3 = col3 || numCols[2] || numCols[0];

  // Gunakan key yang CSS-safe
  const k1 = toKey(c1);
  const k2 = toKey(c2);
  const k3 = toKey(c3);

  const dynamicConfig: ChartConfig = {
    [k1]: { label: c1, color: "var(--chart-1)" },
    [k2]: { label: c2, color: "var(--chart-2)" },
    [k3]: { label: c3, color: "var(--chart-3)" },
  };

  const chartData = buildChartData(rows, c1, c2, c3);

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle className="leading-none">Performance Overview</CardTitle>
        <CardDescription>
          <span className="@[540px]/card:block hidden">
            Tren kolom numerik — {apiData.dataset?.fileName}
          </span>
          <span className="@[540px]/card:hidden">{apiData.dataset?.fileName}</span>
        </CardDescription>
        <CardAction className="flex items-center gap-2 flex-wrap">
          <Select value={c1} onValueChange={setCol1}>
            <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectLabel>Kolom 1 (Area)</SelectLabel>
                {numCols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={c2} onValueChange={setCol2}>
            <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup><SelectLabel>Kolom 2 (Line)</SelectLabel>
                {numCols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectGroup>
            </SelectContent>
          </Select>
          {numCols.length >= 3 && (
            <Select value={c3} onValueChange={setCol3}>
              <SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup><SelectLabel>Kolom 3 (Line)</SelectLabel>
                  {numCols.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer config={dynamicConfig} className="aspect-auto h-80 w-full">
          <ComposedChart data={chartData} margin={{ top: 0 }}>
            <defs>
              <linearGradient id="fillDyn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={`var(--color-${k1})`} stopOpacity={0.36} />
                <stop offset="95%" stopColor={`var(--color-${k1})`} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeOpacity={0.5} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={48}
              tickFormatter={(v) => parseISO(v).toLocaleDateString("id-ID", { month: "short", day: "numeric" })} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent className="w-52" indicator="line"
              labelFormatter={(v) => format(parseISO(v), "d MMMM yyyy")} />} />
            <ChartLegend verticalAlign="top" content={<ChartLegendContent className="mb-5 justify-end" />} />
            <Area dataKey={k1} type="natural" fill="url(#fillDyn)"
              stroke={`var(--color-${k1})`} strokeWidth={1.25} dot={false} fillOpacity={1} />
            <Line dataKey={k2} type="natural" stroke={`var(--color-${k2})`} strokeWidth={1.4} dot={false} />
            {numCols.length >= 3 && (
              <Line dataKey={k3} type="natural" stroke={`var(--color-${k3})`} strokeWidth={1.2} dot={false} />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}