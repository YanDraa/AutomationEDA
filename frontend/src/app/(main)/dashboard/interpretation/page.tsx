"use client";

import { useEffect, useState } from "react";

import { AlertCircle, RefreshCw, Sparkles, Upload } from "lucide-react";
import Link from "next/link";

import { AiInsightPanel } from "@/components/visualizations/ai-insight-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <Sparkles className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard">
            <Upload className="size-4" />
            Upload Sekarang
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Interpretation</h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Interpretasi otomatis hasil analisis EDA pada dataset Anda.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadInterpretation()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Muat Ulang
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
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

          <div>
            <h2 className="mb-3 font-medium text-base">Interpretasi per Kolom</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {data.column_insights.map((item) => (
                <Card key={`${item.type}-${item.column}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{item.column}</CardTitle>
                      <Badge variant="outline">{item.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
                      {item.insight.replace(/\*\*/g, "")}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kesimpulan</CardTitle>
              <CardDescription>Ringkasan temuan utama dari seluruh dataset</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
                {data.summary.insight.replace(/\*\*/g, "")}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
