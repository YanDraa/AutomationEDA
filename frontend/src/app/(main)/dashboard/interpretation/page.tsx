"use client";

import { useEffect, useState } from "react";

import { AlertCircle, RefreshCw, Sparkles, FileText, CheckCircle2 } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataset } from "@/context/dataset-context";
import { fetchInterpretation, type InterpretationResult } from "@/lib/reports-client";

export default function Page() {
  const { dataset } = useDataset();
  const [data, setData] = useState<InterpretationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInterpretation = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchInterpretation();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat interpretasi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataset) return;
    void loadInterpretation();
  }, [dataset]);

  if (!dataset) {
    return (
      <EmptyDataset
        title="Belum ada dataset yang dimuat"
        description="Unggah file terlebih dahulu untuk menghasilkan interpretasi otomatis."
      />
    );
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            Interpretasi AI
          </h1>
          <p className="text-muted-foreground text-sm">
            Interpretasi otomatis hasil analisis EDA pada dataset Anda secara naratif.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInterpretation()} disabled={loading} className="rounded-xl border-border/60 text-xs font-semibold shrink-0">
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm font-medium">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <AiInsightPanel
            insight={data.overview.insight}
            loading={false}
            error={null}
            visible
          />

          <div className="space-y-3">
            <h2 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Interpretasi Per Kolom
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {data.column_insights.map((item) => (
                <Card key={`${item.type}-${item.column}`} className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card transition-all hover:shadow-md">
                  <CardHeader className="pb-2 border-b border-border/40 bg-muted/20 py-3 px-4">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-xs font-bold text-foreground">{item.column}</CardTitle>
                      <Badge variant="outline" className="rounded-lg text-[10px] uppercase font-bold py-0.5 px-2 bg-background border-border/60">
                        {item.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 px-4 pb-4">
                    <p className="whitespace-pre-line text-muted-foreground text-xs leading-relaxed">
                      {item.insight.replace(/\*\*/g, "")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card className="rounded-2xl border-l-4 border-l-primary border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="border-b border-border/40 pb-3 bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                Kesimpulan Eksekutif
              </CardTitle>
              <CardDescription className="text-xs">Ringkasan temuan utama dan rekomendasi dari seluruh dataset</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="whitespace-pre-line text-muted-foreground text-xs leading-relaxed">
                {data.summary.insight.replace(/\*\*/g, "")}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
