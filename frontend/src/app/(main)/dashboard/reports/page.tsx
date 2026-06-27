"use client";

import { useState } from "react";
import {
  Download,
  FileText,
  Settings,
  ShieldAlert,
  BarChart3,
  Lightbulb,
  Sparkles,
  CheckCircle2,
  FileCode,
} from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDataset } from "@/context/dataset-context";
import { generateAndDownloadReport } from "@/lib/reports-client";
import { cn } from "@/lib/utils";

const REPORT_SECTIONS = [
  {
    key: "missing_data" as const,
    icon: ShieldAlert,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    title: "Audit Data Hilang (Missing)",
    description: "Tabel ringkasan dan persentase data kosong pada setiap kolom.",
  },
  {
    key: "outliers" as const,
    icon: ShieldAlert,
    iconClass: "text-destructive",
    bgClass: "bg-destructive/10",
    title: "Laporan Outliers (Anomali)",
    description: "Deteksi dan distribusi pencilan secara statistik menggunakan IQR.",
  },
  {
    key: "statistical_profile" as const,
    icon: BarChart3,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    title: "Profil Statistik Deskriptif",
    description: "Matriks statistik lengkap (Mean, Median, Std Dev, Min, Max, Skewness).",
  },
  {
    key: "executive_insights" as const,
    icon: Lightbulb,
    iconClass: "text-violet-500",
    bgClass: "bg-violet-500/10",
    title: "Narasikan Executive Insights AI",
    description: "Interpretasi otomatis dan kesimpulan tingkat tinggi dari pola data.",
  },
];

export default function Page() {
  const { dataset } = useDataset();
  const [downloading, setDownloading] = useState(false);
  const [format, setFormat] = useState<"html" | "pdf">("pdf");

  const [sections, setSections] = useState({
    missing_data: true,
    outliers: true,
    statistical_profile: true,
    executive_insights: true,
  });

  if (!dataset) {
    return (
      <EmptyDataset
        title="Belum ada dataset yang dimuat"
        description="Unggah file terlebih dahulu untuk mengonfigurasi dan membuat laporan."
      />
    );
  }

  const selectedCount = Object.values(sections).filter(Boolean).length;

  const handleToggle = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    const includedSections = Object.entries(sections)
      .filter(([_, included]) => included)
      .map(([key]) => key);

    if (includedSections.length === 0) {
      alert("Pilih setidaknya satu bagian untuk disertakan dalam laporan.");
      return;
    }

    setDownloading(true);
    try {
      await generateAndDownloadReport(format, includedSections, dataset.fileName);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengunduh laporan.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-6 overflow-x-hidden p-1 pb-10">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            Pelaporan Eksekutif
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Konfigurasi komponen analisis dan unduh laporan akademik komprehensif.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className="max-w-[220px] truncate rounded-lg border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold">
            {dataset.fileName}
          </Badge>
          <Badge variant="secondary" className="rounded-lg px-2.5 py-1 text-[11px] font-semibold">
            {selectedCount} bagian dipilih
          </Badge>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Main configuration */}
        <div className="min-w-0 space-y-6 xl:col-span-8">
          <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md">
            <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Settings className="size-4 text-primary" />
                Konfigurasi Bagian Laporan
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Pilih komponen analisis yang akan dimasukkan ke dalam dokumen laporan akhir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-6 pb-6">
              {REPORT_SECTIONS.map(({ key, icon: Icon, iconClass, bgClass, title, description }) => (
                <div
                  key={key}
                  className={cn(
                    "grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-xl border border-border/40 p-4 transition-colors",
                    sections[key] ? "border-primary/20 bg-primary/[0.03]" : "hover:bg-muted/30",
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
                      bgClass,
                    )}
                  >
                    <Icon className={cn("size-4", iconClass)} />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <Label
                      htmlFor={key}
                      className="block cursor-pointer break-words text-sm font-semibold text-foreground"
                    >
                      {title}
                    </Label>
                    <p className="break-words text-xs leading-relaxed text-muted-foreground">
                      {description}
                    </p>
                  </div>
                  <Switch
                    id={key}
                    checked={sections[key]}
                    onCheckedChange={() => handleToggle(key)}
                    className="mt-1 shrink-0"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: format + generate */}
        <div className="min-w-0 space-y-6 xl:col-span-4 xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-visible rounded-2xl border-border/60 bg-card shadow-sm">
            <CardHeader className="rounded-t-2xl border-b border-border/40 bg-muted/20 pb-3">
              <CardTitle className="text-base font-semibold">Format Output</CardTitle>
              <CardDescription className="text-xs">Pilih format file yang akan diunduh</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 pb-4">
              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                  format === "pdf"
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/40 hover:bg-muted/30",
                )}
                onClick={() => setFormat("pdf")}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">Dokumen PDF</p>
                  <p className="text-[11px] text-muted-foreground">Siap cetak, formal & rapi</p>
                </div>
                {format === "pdf" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>

              <button
                type="button"
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                  format === "html"
                    ? "border-primary bg-primary/10 shadow-xs"
                    : "border-border/40 hover:bg-muted/30",
                )}
                onClick={() => setFormat("html")}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileCode className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground">HTML Interaktif</p>
                  <p className="text-[11px] text-muted-foreground">Tampilan dinamis 1 file</p>
                </div>
                {format === "html" ? (
                  <CheckCircle2 className="size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            </CardContent>
          </Card>

          <Card className="overflow-visible rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-bold">
                <Sparkles className="size-4 text-primary" />
                Generate Laporan
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Sistem akan menyusun {selectedCount} bagian terpilih ke dalam satu dokumen.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <dl className="space-y-2.5 rounded-xl border border-border/40 bg-background/60 p-3.5 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-muted-foreground">Dataset</dt>
                  <dd className="min-w-0 break-all text-right font-semibold text-foreground">
                    {dataset.fileName}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                  <dt className="text-muted-foreground">Total Baris</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {dataset.rows.toLocaleString()}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
                  <dt className="text-muted-foreground">Total Kolom</dt>
                  <dd className="font-semibold tabular-nums text-foreground">
                    {dataset.columns.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </CardContent>
            <CardFooter className="border-0 bg-transparent px-4 pt-2 pb-5">
              <Button
                onClick={handleGenerate}
                disabled={downloading || selectedCount === 0}
                className="h-11 w-full rounded-xl text-xs font-bold shadow-sm"
              >
                {downloading ? (
                  <>
                    <div className="mr-2 size-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Menyusun Laporan...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 size-4" />
                    Unduh {format.toUpperCase()}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
