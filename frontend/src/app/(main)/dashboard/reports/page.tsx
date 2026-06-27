"use client";

import { useState } from "react";
import { Download, FileText, Settings, ShieldAlert, BarChart3, Lightbulb, Sparkles, CheckCircle2, FileCode, SlidersHorizontal, ArrowRight } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    } fiwally {
      setDownloading(false);
    }
  };

  const selectedCount = Object.values(sections).filter(Boolean).length;

  return (
    <div className="flex w-full min-w-0 max-w-5xl flex-col gap-6 mx-auto pb-10 p-1">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
            <FileText className="size-6 text-primary" />
            Pelaporan Eksekutif Akademik
          </h1>
          <Badge variant="outline" className="rounded-xl border-primary/30 bg-primary/10 text-primary px-3 py-1 text-xs font-bold">
            Pusat Ekspor Laporan
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Kustomisasi komponen analisis, pilih format output, dan unduh dokumen eksekutif berkualitas siap cetak.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-0.5">
        {/* Left column: Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-4 bg-muted/20 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  Konfigurasi Komponen Laporan
                </CardTitle>
                <Badge variant="secondary" className="text-[11px] font-bold">
                  {selectedCount} dari 4 Terpilih
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Aktifkan bagian analisis yang ingin disertakan dalam naskah laporan akhir Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 pt-6 pb-6">
              
              {/* Item 1 */}
              <div className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                sections.missing_data ? 'border-amber-500/30 bg-amber-500/5 shadow-xs' : 'border-border/40 hover:bg-muted/30 opacity-70'
              }`}>
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="missing_data" className="text-sm font-bold cursor-pointer text-foreground block break-words">Audit Data Hilang (Missing)</Label>
                      {sections.missing_data && <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 text-[10px] py-0 px-1.5 font-bold">Aktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">Tabel ringkasan dan persentase data kosong pada setiap kolom.</p>
                  </div>
                </div>
                <Switch id="missing_data" checked={sections.missing_data} onCheckedChange={() => handleToggle('missing_data')} className="shrink-0 ml-2" />
              </div>

              {/* Item 2 */}
              <div className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                sections.outliers ? 'border-destructive/30 bg-destructive/5 shadow-xs' : 'border-border/40 hover:bg-muted/30 opacity-70'
              }`}>
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 shrink-0 mt-0.5">
                    <ShieldAlert className="w-5 h-5 text-destructive" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="outliers" className="text-sm font-bold cursor-pointer text-foreground block break-words">Laporan Outliers (Anomali)</Label>
                      {sections.outliers && <Badge className="bg-destructive/20 text-destructive border-0 text-[10px] py-0 px-1.5 font-bold">Aktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">Deteksi dan distribusi pencilan secara statistik menggunakan metode IQR.</p>
                  </div>
                </div>
                <Switch id="outliers" checked={sections.outliers} onCheckedChange={() => handleToggle('outliers')} className="shrink-0 ml-2" />
              </div>

              {/* Item 3 */}
              <div className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                sections.statistical_profile ? 'border-blue-500/30 bg-blue-500/5 shadow-xs' : 'border-border/40 hover:bg-muted/30 opacity-70'
              }`}>
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10 shrink-0 mt-0.5">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="statistical_profile" className="text-sm font-bold cursor-pointer text-foreground block break-words">Profil Statistik Deskriptif</Label>
                      {sections.statistical_profile && <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-0 text-[10px] py-0 px-1.5 font-bold">Aktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">Matriks statistik lengkap (Mean, Median, Std Dev, Min, Max, Skewness, Kurtosis).</p>
                  </div>
                </div>
                <Switch id="statistical_profile" checked={sections.statistical_profile} onCheckedChange={() => handleToggle('statistical_profile')} className="shrink-0 ml-2" />
              </div>

              {/* Item 4 */}
              <div className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 ${
                sections.executive_insights ? 'border-violet-500/30 bg-violet-500/5 shadow-xs' : 'border-border/40 hover:bg-muted/30 opacity-70'
              }`}>
                <div className="flex items-start gap-3.5 min-w-0 pr-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 shrink-0 mt-0.5">
                    <Lightbulb className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="executive_insights" className="text-sm font-bold cursor-pointer text-foreground block break-words">Narasikan Executive Insights AI</Label>
                      {sections.executive_insights && <Badge className="bg-violet-500/20 text-violet-600 dark:text-violet-400 border-0 text-[10px] py-0 px-1.5 font-bold">Aktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground break-words leading-relaxed">Interpretasi otomatis dan kesimpulan tingkat tinggi dari pola data berbasis AI.</p>
                  </div>
                </div>
                <Switch id="executive_insights" checked={sections.executive_insights} onCheckedChange={() => handleToggle('executive_insights')} className="shrink-0 ml-2" />
              </div>

            </CardContent>
          </Card>
        </div>

        {/* Right column: Format & Generate */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 shadow-sm bg-card">
            <CardHeader className="border-b border-border/40 pb-3 bg-muted/20 rounded-t-2xl">
              <CardTitle className="text-base font-semibold">Format Output Document</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4 space-y-3">
              <div 
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  format === 'pdf' ? 'border-primary bg-primary/10 shadow-xs' : 'border-border/40 hover:bg-muted/30'
                }`} 
                onClick={() => setFormat("pdf")}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">Dokumen PDF</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Laporan formal, siap cetak & presentasi</p>
                </div>
                {format === 'pdf' && <CheckCircle2 className="size-5 text-primary shrink-0" />}
              </div>

              <div 
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all ${
                  format === 'html' ? 'border-primary bg-primary/10 shadow-xs' : 'border-border/40 hover:bg-muted/30'
                }`} 
                onClick={() => setFormat("html")}
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                  <FileCode className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground">HTML Interaktif</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Tampilan interaktif mandiri 1 file</p>
                </div>
                {format === 'html' && <CheckCircle2 className="size-5 text-primary shrink-0" />}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileText className="w-40 h-40" />
            </div>
            <CardHeader className="relative z-10 pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="size-5 text-primary-foreground" />
                Generate Laporan
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs">
                Sistem akan menyusun {selectedCount} bagian terpilih secara otomatis.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 pt-1 pb-2">
              <div className="space-y-2.5 text-xs text-slate-200">
                <div className="flex justify-between border-b border-slate-700/60 pb-2 gap-2">
                  <span className="text-slate-400 shrink-0">Dataset:</span>
                  <span className="font-semibold break-all text-right">{dataset.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-2 gap-2">
                  <span className="text-slate-400 shrink-0">Total Baris:</span>
                  <span className="font-semibold">{dataset.rows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1 gap-2">
                  <span className="text-slate-400 shrink-0">Total Kolom:</span>
                  <span className="font-semibold">{dataset.columns.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10 pt-4 pb-5">
              <Button 
                onClick={handleGenerate} 
                disabled={downloading || selectedCount === 0}
                className="w-full font-bold shadow-lg bg-white text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-300 h-11 text-xs gap-2"
              >
                {downloading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Menyusun Laporan...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Unduh Dokumen {format.toUpperCase()}
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
