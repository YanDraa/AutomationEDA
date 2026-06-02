"use client";

import { BarChart2, GitBranch, Grid3x3, LineChart, Upload } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

const vizMenus = [
  {
    href: "/dashboard/visualizations/univariate",
    icon: BarChart2,
    iconClass: "text-blue-600 dark:text-blue-400",
    bgClass: "bg-blue-500/10",
    title: "Univariate",
    desc: "Distribusi satu variabel: histogram, boxplot, bar chart.",
    badge: null,
  },
  {
    href: "/dashboard/visualizations/bivariate",
    icon: GitBranch,
    iconClass: "text-purple-600 dark:text-purple-400",
    bgClass: "bg-purple-500/10",
    title: "Bivariate",
    desc: "Hubungan dua variabel: scatter plot, heatmap korelasi.",
    badge: null,
  },
  {
    href: "/dashboard/visualizations/multivariate",
    icon: Grid3x3,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-500/10",
    title: "Multivariate",
    desc: "Analisis banyak variabel sekaligus: pair plot, correlation matrix.",
    badge: null,
  },
  {
    href: "/dashboard/visualizations/time-series",
    icon: LineChart,
    iconClass: "text-orange-600 dark:text-orange-400",
    bgClass: "bg-orange-500/10",
    title: "Time Series",
    desc: "Visualisasi data berdasarkan waktu: trend, seasonal decomposition.",
    badge: "New",
  },
];

export default function Page() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4"><BarChart2 className="size-8 text-muted-foreground" /></div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
        </div>
        <Button asChild size="sm"><Link href="/dashboard"><Upload className="size-4" />Upload Sekarang</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Visualizations</h1>
        <p className="mt-1 text-muted-foreground text-sm">Pilih jenis visualisasi untuk mengeksplorasi dataset Anda.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {vizMenus.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className={`flex size-10 items-center justify-center rounded-lg ${m.bgClass}`}>
                    <m.icon className={`size-5 ${m.iconClass}`} />
                  </div>
                  {m.badge && <Badge className="text-xs">{m.badge}</Badge>}
                </div>
                <CardTitle className="mt-2 text-base">{m.title}</CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}