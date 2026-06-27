"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, BarChart3, HelpCircle, FileX, TrendingUp, Info, Sparkles, Loader2 } from "lucide-react";
import { BACKEND_URL } from "@/lib/visualization-client";

interface InsightData {
  highest_average: Array<{ column: string; mean: number; insight: string }>;
  most_missing: Array<{ column: string; missing_count: number; missing_percentage: number; insight: string }>;
  highest_outliers: Array<{ column: string; outlier_count: number; outlier_percentage: number; insight: string }>;
  largest_std: Array<{ column: string; std: number; cv: number; insight: string }>;
  strongest_correlations: {
    positive: Array<{ pair: string; value: number; insight: string }>;
    negative: Array<{ pair: string; value: number; insight: string }>;
  };
  data_distribution: Array<{ column: string; skewness: number; kurtosis: number; label: string; impact: string }>;
  time_series_pattern: {
    datetime_column?: string;
    target_column?: string;
    trend?: string;
    fluctuation_variance?: number;
    insight?: string;
    status?: string;
  };
}

export default function InsightsPage() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/insights`, { credentials: "include" });
        const response = await res.json();
        if (response?.status === "success") {
          setData(response.result);
        } else {
          setError("Gagal memuat insight cerdas.");
        }
      } catch (err: any) {
        setError(err.message || "Terjadi kesalahan saat memuat insight.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground animate-pulse">Menghasilkan Executive Insights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" className="rounded-2xl border-destructive/30 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="font-bold">Gagal Memuat Data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Sparkles className="size-6 text-primary" />
          Intelligent Executive Insights
        </h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan otomatis dari dataset Anda berdasarkan 7 pilar analisis statistika utama.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Highest Average Values */}
        <Card className="col-span-1 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10">
                <BarChart3 className="w-4 h-4 text-blue-500" />
              </div>
              Rata-rata Tertinggi
            </CardTitle>
            <CardDescription className="text-xs">Variabel dengan nilai pusat dominan</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.highest_average.length > 0 ? (
              <div className="space-y-3.5">
                {data.highest_average.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{item.column}</span>
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px]">
                        {item.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Tidak ada data numerik.</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Most Missing Values */}
        <Card className="col-span-1 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-destructive/10">
                <FileX className="w-4 h-4 text-destructive" />
              </div>
              Data Hilang (Missing)
            </CardTitle>
            <CardDescription className="text-xs">Variabel dengan nilai kosong terbanyak</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.most_missing.length > 0 ? (
              <div className="space-y-3.5">
                {data.most_missing.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{item.column}</span>
                      <Badge variant="destructive" className="bg-destructive/10 text-destructive border-0 font-bold text-[11px]">
                        {item.missing_count} ({item.missing_percentage.toFixed(1)}%)
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p className="font-medium">Kualitas data sangat baik. Tidak ada missing values.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Highest Number of Outliers */}
        <Card className="col-span-1 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Outlier Terbanyak
            </CardTitle>
            <CardDescription className="text-xs">Terdeteksi menggunakan metode IQR</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.highest_outliers.length > 0 ? (
              <div className="space-y-3.5">
                {data.highest_outliers.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{item.column}</span>
                      <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold text-[11px]">
                        {item.outlier_count} baris
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Tidak ditemukan anomali/outlier signifikan.</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Largest Standard Deviation */}
        <Card className="col-span-1 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10">
                <Activity className="w-4 h-4 text-purple-500" />
              </div>
              Volatilitas Tinggi
            </CardTitle>
            <CardDescription className="text-xs">Variabel dengan standar deviasi terbesar</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.largest_std.length > 0 ? (
              <div className="space-y-3.5">
                {data.largest_std.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-border/20 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground">{item.column}</span>
                      <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px]">
                        SD: {item.std.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Tidak ada data numerik.</p>
            )}
          </CardContent>
        </Card>

        {/* 5. Strongest Correlations */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              Korelasi Terkuat
            </CardTitle>
            <CardDescription className="text-xs">Hubungan antar variabel numerik (Pearson)</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" /> Korelasi Positif
                </h4>
                {data.strongest_correlations?.positive?.length > 0 ? (
                  <div className="space-y-3">
                    {data.strongest_correlations.positive.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex flex-col gap-1 p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground truncate pr-2" title={item.pair}>{item.pair}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{item.value.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{item.insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada korelasi positif signifikan.</p>
                )}
              </div>
              
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" /> Korelasi Negatif
                </h4>
                {data.strongest_correlations?.negative?.length > 0 ? (
                  <div className="space-y-3">
                    {data.strongest_correlations.negative.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex flex-col gap-1 p-2 rounded-xl border border-rose-500/20 bg-rose-500/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground truncate pr-2" title={item.pair}>{item.pair}</span>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{item.value.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">{item.insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada korelasi negatif signifikan.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6. Data Distribution Normality */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/10">
                <Info className="w-4 h-4 text-indigo-500" />
              </div>
              Distribusi Normalitas
            </CardTitle>
            <CardDescription className="text-xs">Berdasarkan Skewness dan Kurtosis</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.data_distribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.data_distribution.slice(0, 4).map((item, i) => (
                  <div key={i} className="p-3 bg-muted/20 rounded-xl border border-border/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-foreground truncate pr-2" title={item.column}>{item.column}</span>
                      <Badge variant="outline" className={`text-[10px] py-0.5 px-2 font-semibold ${
                        item.label.includes("Normal") 
                          ? "border-emerald-500/30 text-emerald-600 bg-emerald-500/10" 
                          : "border-amber-500/30 text-amber-600 bg-amber-500/10"
                      }`}>
                        {item.label}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Skew: {item.skewness.toFixed(2)} | Kurt: {item.kurtosis.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-muted-foreground/90 leading-relaxed">{item.impact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-2">Tidak ada data distribusi yang tersedia.</p>
            )}
          </CardContent>
        </Card>

        {/* 7. Time Series Pattern Summaries */}
        <Card className="col-span-1 shadow-sm border-border/60 rounded-2xl overflow-hidden bg-card transition-all hover:shadow-md">
          <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10">
                <Activity className="w-4 h-4 text-sky-500" />
              </div>
              Time Series Trend
            </CardTitle>
            <CardDescription className="text-xs">Analisis tren deret waktu otomatis</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {data.time_series_pattern?.status ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <HelpCircle className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-xs">{data.time_series_pattern.status}</p>
              </div>
            ) : data.time_series_pattern?.datetime_column ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-xs text-muted-foreground">Kolom Waktu</span>
                  <span className="text-xs font-semibold text-foreground">{data.time_series_pattern.datetime_column}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/20 pb-2">
                  <span className="text-xs text-muted-foreground">Target Analisis</span>
                  <span className="text-xs font-semibold text-foreground">{data.time_series_pattern.target_column}</span>
                </div>
                <div className="p-3 bg-sky-500/10 rounded-xl border border-sky-500/20 mt-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    {data.time_series_pattern.trend === "Upward" ? <ArrowUpRight className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : 
                     data.time_series_pattern.trend === "Downward" ? <ArrowDownRight className="w-4 h-4 text-sky-600 dark:text-sky-400" /> :
                     <TrendingUp className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
                    <span className="font-bold text-xs text-sky-700 dark:text-sky-300">Trend: {data.time_series_pattern.trend}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {data.time_series_pattern.insight}
                  </p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
