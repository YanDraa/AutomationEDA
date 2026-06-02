"use client";

import { BarChart2, Construction } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

export default function Page() {
  const { dataset } = useDataset();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Univariate Analysis</h1>
        <p className="mt-1 text-muted-foreground text-sm">Distribusi satu variabel pada dataset Anda.</p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
            <BarChart2 className="size-5 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="mt-2 text-base">Histogram & Boxplot</CardTitle>
          <CardDescription>
            {dataset ? `Dataset: ${dataset.fileName} — ${dataset.columns} kolom, ${dataset.rows.toLocaleString()} baris` : "Belum ada dataset."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Construction className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Visualisasi sedang dalam pengembangan.</p>
        </CardContent>
      </Card>
    </div>
  );
}