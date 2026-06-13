"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertCircle, BarChart3, HelpCircle, FileX, TrendingUp, Info } from "lucide-react";
import api from "@/lib/axios";

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
        const response = await api.get("/api/insights");
        if (response.data?.status === "success") {
          setData(response.data.result);
        } else {
          setError("Gagal memuat insight cerdas.");
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || "Terjadi kesalahan saat memuat insight.");
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Menghasilkan Executive Insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Intelligent Executive Insights</h2>
        <p className="text-muted-foreground">
          Ringkasan otomatis dari dataset Anda berdasarkan 7 pilar analisis statistika utama.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 1. Highest Average Values */}
        <Card className="col-span-1 lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" /> Rata-rata Tertinggi
              </CardTitle>
            </div>
            <CardDescription>Variabel dengan nilai pusat dominan</CardDescription>
          </CardHeader>
          <CardContent>
            {data.highest_average.length > 0 ? (
              <div className="space-y-4">
                {data.highest_average.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.column}</span>
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {item.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada data numerik.</p>
            )}
          </CardContent>
        </Card>

        {/* 2. Most Missing Values */}
        <Card className="col-span-1 lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <FileX className="w-5 h-5 text-red-500" /> Data Hilang (Missing)
              </CardTitle>
            </div>
            <CardDescription>Variabel dengan nilai kosong terbanyak</CardDescription>
          </CardHeader>
          <CardContent>
            {data.most_missing.length > 0 ? (
              <div className="space-y-4">
                {data.most_missing.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.column}</span>
                      <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 border-0">
                        {item.missing_count} ({item.missing_percentage.toFixed(1)}%)
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                <CheckCircle2 className="w-4 h-4" />
                <p>Kualitas data sangat baik. Tidak ada missing values.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Highest Number of Outliers */}
        <Card className="col-span-1 lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Outlier Terbanyak
              </CardTitle>
            </div>
            <CardDescription>Terdeteksi menggunakan metode IQR</CardDescription>
          </CardHeader>
          <CardContent>
            {data.highest_outliers.length > 0 ? (
              <div className="space-y-4">
                {data.highest_outliers.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.column}</span>
                      <Badge variant="outline" className="border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/10">
                        {item.outlier_count} baris
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ditemukan anomali/outlier signifikan.</p>
            )}
          </CardContent>
        </Card>

        {/* 4. Largest Standard Deviation */}
        <Card className="col-span-1 lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-500" /> Volatilitas Tinggi
              </CardTitle>
            </div>
            <CardDescription>Variabel dengan standar deviasi terbesar</CardDescription>
          </CardHeader>
          <CardContent>
            {data.largest_std.length > 0 ? (
              <div className="space-y-4">
                {data.largest_std.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{item.column}</span>
                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        SD: {item.std.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.insight}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada data numerik.</p>
            )}
          </CardContent>
        </Card>

        {/* 5. Strongest Correlations */}
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Korelasi Terkuat
              </CardTitle>
            </div>
            <CardDescription>Hubungan antar variabel numerik (Pearson)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" /> Korelasi Positif
                </h4>
                {data.strongest_correlations?.positive?.length > 0 ? (
                  <div className="space-y-3">
                    {data.strongest_correlations.positive.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate pr-2" title={item.pair}>{item.pair}</span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{item.value.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{item.insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Tidak ada korelasi positif signifikan.</p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-rose-700 dark:text-rose-400 mb-3 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" /> Korelasi Negatif
                </h4>
                {data.strongest_correlations?.negative?.length > 0 ? (
                  <div className="space-y-3">
                    {data.strongest_correlations.negative.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium truncate pr-2" title={item.pair}>{item.pair}</span>
                          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{item.value.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{item.insight}</p>
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
        <Card className="col-span-1 lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-500" /> Distribusi Normalitas
              </CardTitle>
            </div>
            <CardDescription>Berdasarkan Skewness dan Kurtosis</CardDescription>
          </CardHeader>
          <CardContent>
            {data.data_distribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.data_distribution.slice(0, 4).map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm truncate pr-2" title={item.column}>{item.column}</span>
                      <Badge variant="outline" className={
                        item.label.includes("Normal") 
                          ? "border-green-200 text-green-700 bg-green-50 dark:border-green-900/50 dark:text-green-400 dark:bg-green-900/10 whitespace-nowrap" 
                          : "border-amber-200 text-amber-700 bg-amber-50 dark:border-amber-900/50 dark:text-amber-400 dark:bg-amber-900/10 whitespace-nowrap"
                      }>
                        {item.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      Skew: {item.skewness.toFixed(2)} | Kurt: {item.kurtosis.toFixed(2)}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{item.impact}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada data distribusi yang tersedia.</p>
            )}
          </CardContent>
        </Card>

        {/* 7. Time Series Pattern Summaries */}
        <Card className="col-span-1 lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 transition-all hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-sky-500" /> Time Series Trend
              </CardTitle>
            </div>
            <CardDescription>Analisis tren deret waktu otomatis</CardDescription>
          </CardHeader>
          <CardContent>
            {data.time_series_pattern?.status ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                <HelpCircle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">{data.time_series_pattern.status}</p>
              </div>
            ) : data.time_series_pattern?.datetime_column ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-sm text-slate-500">Kolom Waktu</span>
                  <span className="text-sm font-medium">{data.time_series_pattern.datetime_column}</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-sm text-slate-500">Target Analisis</span>
                  <span className="text-sm font-medium">{data.time_series_pattern.target_column}</span>
                </div>
                <div className="p-3 bg-sky-50 dark:bg-sky-900/10 rounded-md border border-sky-100 dark:border-sky-900/30 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    {data.time_series_pattern.trend === "Upward" ? <ArrowUpRight className="w-4 h-4 text-sky-600" /> : 
                     data.time_series_pattern.trend === "Downward" ? <ArrowDownRight className="w-4 h-4 text-sky-600" /> :
                     <TrendingUp className="w-4 h-4 text-sky-600" />}
                    <span className="font-semibold text-sm text-sky-900 dark:text-sky-300">Trend: {data.time_series_pattern.trend}</span>
                  </div>
                  <p className="text-xs text-sky-700 dark:text-sky-400/80 leading-relaxed">
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
