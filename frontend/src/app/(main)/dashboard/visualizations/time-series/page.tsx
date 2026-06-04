"use client";

import { Construction } from "lucide-react";

import { VizPageShell } from "@/components/visualizations/viz-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Page() {
  return (
    <VizPageShell
      title="Time Series"
      description="Visualisasi data berbasis waktu (segera hadir)."
    >
      {() => (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Series Analysis</CardTitle>
            <CardDescription>
              Endpoint backend untuk time series belum tersedia. Menu ini akan dihubungkan
              setelah fitur backend siap.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Construction className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Sedang dalam pengembangan.</p>
          </CardContent>
        </Card>
      )}
    </VizPageShell>
  );
}
