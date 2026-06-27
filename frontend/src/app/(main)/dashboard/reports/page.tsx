"use client";

import { useState } from "react";
import { Download, FileText, Settings, ShieldAlert, BarChart3, Lightbulb, Sparkles, CheckCircle2, FileCode } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useDataset } from "@/context/dataset-context";
import { generateAndDownloadReport } from "@/lib/reports-client";

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
    <div className="flex w-full max-w-5xl flex-col gap-6 mx-auto pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
          <FileText className="size-6 text-primary" />
          Pelaporan Eksekutif
        </h1>
        <p className="text-muted-foreground text-sm">
          Konfigurasi komponen analisis dan unduh laporan akademik komprehensif.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                Konfigurasi Bagian Laporan
              </CardTitle>
              <CardDescription className="text-xs">
                Pilih komponen analisis yang akan dimasukkan ke dalam dokumen laporan akhir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-6">
              
              <div className="flex items-center justify-between rounded-xl border border-border/40 p-4 transition-all hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="missing_data" className="text-sm font-semibold cursor-pointer text-foreground">Audit Data Hilang (Missing)</Label>
                    <p className="text-xs text-muted-foreground">Tabel ringkasan dan persentase data kosong pada setiap kolom.</p>
                  </div>
                </div>
                <Switch id="missing_data" checked={sections.missing_data} onCheckedChange={() => handleToggle('missing_data')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 p-4 transition-all hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 shrink-0 mt-0.5">
                    <ShieldAlert className="w-4 h-4 text-destructive" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="outliers" className="text-sm font-semibold cursor-pointer text-foreground">Laporan Outliers (Anomali)</Label>
                    <p className="text-xs text-muted-foreground">Deteksi dan distribusi pencilan secara statistik menggunakan IQR.</p>
                  </div>
                </div>
                <Switch id="outliers" checked={sections.outliers} onCheckedChange={() => handleToggle('outliers')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 p-4 transition-all hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10 shrink-0 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="statistical_profile" className="text-sm font-semibold cursor-pointer text-foreground">Profil Statistik Deskriptif</Label>
                    <p className="text-xs text-muted-foreground">Matriks statistik lengkap (Mean, Median, Std Dev, Min, Max, Skewness).</p>
                  </div>
                </div>
                <Switch id="statistical_profile" checked={sections.statistical_profile} onCheckedChange={() => handleToggle('statistical_profile')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 p-4 transition-all hover:bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/10 shrink-0 mt-0.5">
                    <Lightbulb className="w-4 h-4 text-violet-500" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="executive_insights" className="text-sm font-semibold cursor-pointer text-foreground">Narasikan Executive Insights AI</Label>
                    <p className="text-xs text-muted-foreground">Interpretasi otomatis dan kesimpulan tingkat tinggi dari pola data.</p>
                  </div>
                </div>
                <Switch id="executive_insights" checked={sections.executive_insights} onCheckedChange={() => handleToggle('executive_insights')} />
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden bg-card">
            <CardHeader className="border-b border-border/40 pb-3 bg-muted/20">
              <CardTitle className="text-base font-semibold">Format Output</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div 
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  format === 'pdf' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/40 hover:bg-muted/30'
                }`} 
                onClick={() => setFormat("pdf")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">Dokumen PDF</p>
                  <p className="text-[11px] text-muted-foreground">Siap cetak, formal & rapi</p>
                </div>
                {format === 'pdf' && <CheckCircle2 className="size-4 text-primary shrink-0" />}
              </div>

              <div 
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  format === 'html' ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/40 hover:bg-muted/30'
                }`} 
                onClick={() => setFormat("html")}
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <FileCode className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">HTML Interaktif</p>
                  <p className="text-[11px] text-muted-foreground">Tampilan dinamis 1 file</p>
                </div>
                {format === 'html' && <CheckCircle2 className="size-4 text-primary shrink-0" />}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileText className="w-36 h-36" />
            </div>
            <CardHeader className="relative z-10 pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-primary-foreground" />
                Generate Laporan
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Sistem akan menyusun {Object.values(sections).filter(Boolean).length} bagian terpilih.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 pt-1">
              <div className="space-y-2 text-xs text-slate-200">
                <div className="flex justify-between border-b border-slate-700/60 pb-2">
                  <span className="text-slate-400">Dataset:</span>
                  <span className="font-semibold truncate max-w-[150px]">{dataset.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-2">
                  <span className="text-slate-400">Total Baris:</span>
                  <span className="font-semibold">{dataset.rows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Total Kolom:</span>
                  <span className="font-semibold">{dataset.columns.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10 pt-4">
              <Button 
                onClick={handleGenerate} 
                disabled={downloading}
                className="w-full font-bold shadow-lg bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-300 h-11 text-xs"
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Menyusun Laporan...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
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
