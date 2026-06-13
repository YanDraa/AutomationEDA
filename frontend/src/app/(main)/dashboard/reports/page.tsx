"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Download, RefreshCw } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDataset } from "@/context/dataset-context";
import { downloadExport, fetchReport, type ReportResult } from "@/lib/reports-client";

export default function Page() {
  const { dataset } = useDataset();
  const [report, setReport] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchReport();
      setReport(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat laporan.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!dataset) return;
    void loadReport();
  }, [dataset]);

  const handleDownloadPdf = async () => {
    if (!dataset) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadExport("pdf", dataset.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunduh PDF.");
    } finally {
      setDownloading(false);
    }
  };

  if (!dataset) {
    return (
      <EmptyDataset
        title="No dataset loaded"
        description="Upload a file first to generate reports."
      />
    );
  }

  const numericCount = report ? Object.keys(report.numeric_stats).length : 0;
  const categoricalCount = report ? Object.keys(report.categorical_stats).length : 0;

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-semibold text-2xl">Reports</h1>
          <p className="mt-1 text-muted-foreground text-sm">Generate laporan lengkap hasil analisis EDA.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadReport()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Muat Ulang
          </Button>
          <Button size="sm" onClick={() => void handleDownloadPdf()} disabled={loading || downloading}>
            <Download className={`size-4 ${downloading ? "animate-pulse" : ""}`} />
            Download PDF
          </Button>
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {!loading && report ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Dataset</CardTitle>
              <CardDescription>
                {report.dataset.fileName} — {report.dataset.rows.toLocaleString()} baris,{" "}
                {report.dataset.columns} kolom
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="secondary">{numericCount} kolom numerikal</Badge>
              <Badge variant="secondary">{categoricalCount} kolom kategorikal</Badge>
              <Badge variant="outline">Ukuran: {report.dataset.fileSize}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interpretasi Utama</CardTitle>
              <CardDescription>Hasil analisis AI dan rule-based</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 font-medium text-sm">Ringkasan Dataset</p>
                <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
                  {report.interpretation.overview.insight.replace(/\*\*/g, "")}
                </p>
              </div>
              <div>
                <p className="mb-1 font-medium text-sm">Kesimpulan</p>
                <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
                  {report.interpretation.summary.insight.replace(/\*\*/g, "")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Highlight per Kolom</CardTitle>
              <CardDescription>
                {report.interpretation.column_insights.length} kolom dianalisis
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {report.interpretation.column_insights.map((item) => (
                <div key={`${item.type}-${item.column}`} className="rounded-lg border border-border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{item.column}</p>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {item.insight.replace(/\*\*/g, "")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
