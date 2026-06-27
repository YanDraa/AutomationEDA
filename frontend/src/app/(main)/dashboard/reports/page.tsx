"use client";

import { useState } from "react";
import { Download, FileText, Settings, ShieldAlert, BarChart3, Lightbulb } from "lucide-react";

import { EmptyDataset } from "@/components/empty-dataset";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
        title="No dataset loaded"
        description="Upload a file first to configure and generate reports."
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
      <div>
        <h1 className="font-semibold text-3xl tracking-tight">Executive Reporting</h1>
        <p className="mt-2 text-muted-foreground">Konfigurasi dan unduh laporan eksekutif dari hasil analisis data Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/30 pb-4 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Konfigurasi Laporan
              </CardTitle>
              <CardDescription>Pilih bagian analisis yang ingin dimasukkan ke dalam dokumen laporan akhir.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              
              <div className="flex items-center justify-between rounded-xl border border-border/50 p-5 shadow-sm transition-all hover:bg-accent/40">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    <Label htmlFor="missing_data" className="text-base font-semibold cursor-pointer">Missing Data Audit</Label>
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">Tabel ringkasan persentase data hilang pada setiap kolom.</span>
                </div>
                <Switch id="missing_data" checked={sections.missing_data} onCheckedChange={() => handleToggle('missing_data')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 p-5 shadow-sm transition-all hover:bg-accent/40">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <Label htmlFor="outliers" className="text-base font-semibold cursor-pointer">Outliers Report</Label>
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">Informasi jumlah pencilan (outliers) yang terdeteksi secara statistik.</span>
                </div>
                <Switch id="outliers" checked={sections.outliers} onCheckedChange={() => handleToggle('outliers')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 p-5 shadow-sm transition-all hover:bg-accent/40">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    <Label htmlFor="statistical_profile" className="text-base font-semibold cursor-pointer">Statistical Profile</Label>
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">Matriks statistik deskriptif komprehensif (Mean, Median, Min, Max, dll).</span>
                </div>
                <Switch id="statistical_profile" checked={sections.statistical_profile} onCheckedChange={() => handleToggle('statistical_profile')} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/50 p-5 shadow-sm transition-all hover:bg-accent/40">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <Label htmlFor="executive_insights" className="text-base font-semibold cursor-pointer">Executive Insights Narratives</Label>
                  </div>
                  <span className="text-sm text-muted-foreground font-normal">Insight bisnis otomatis dari AI dan kesimpulan tinggi dari pola data.</span>
                </div>
                <Switch id="executive_insights" checked={sections.executive_insights} onCheckedChange={() => handleToggle('executive_insights')} />
              </div>

            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Format File</CardTitle>
              <CardDescription>Pilih jenis file output.</CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as "html" | "pdf")} className="space-y-3">
                <div 
                  className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${format === 'pdf' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                  onClick={() => setFormat("pdf")}
                >
                  <RadioGroupItem value="pdf" id="format-pdf" />
                  <Label htmlFor="format-pdf" className="flex-1 cursor-pointer font-medium">PDF Document<span className="block text-xs text-muted-foreground mt-1">Laporan formal, siap cetak</span></Label>
                </div>
                <div 
                  className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors ${format === 'html' ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'}`} 
                  onClick={() => setFormat("html")}
                >
                  <RadioGroupItem value="html" id="format-html" />
                  <Label htmlFor="format-html" className="flex-1 cursor-pointer font-medium">Interactive HTML<span className="block text-xs text-muted-foreground mt-1">Tampilan dinamis satu file</span></Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-slate-50 shadow-xl overflow-hidden relative border-0">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <FileText className="w-32 h-32" />
            </div>
            <CardHeader className="relative z-10 pb-4">
              <CardTitle className="text-xl">Generate Laporan</CardTitle>
              <CardDescription className="text-slate-300">Sistem akan menyusun {Object.values(sections).filter(Boolean).length} bagian terpilih.</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex justify-between border-b border-slate-700 pb-2">
                  <span className="text-slate-400">Dataset:</span>
                  <span className="font-medium truncate max-w-[150px]">{dataset.fileName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-700 pb-2">
                  <span className="text-slate-400">Baris:</span>
                  <span className="font-medium">{dataset.rows.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Kolom:</span>
                  <span className="font-medium">{dataset.columns.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10 pt-4">
              <Button 
                onClick={handleGenerate} 
                disabled={downloading}
                variant="default"
                className="w-full font-bold shadow-lg bg-white text-slate-900 hover:bg-slate-100 transition-all duration-300"
                size="lg"
              >
                {downloading ? (
                  <>
                    <div className="h-5 w-5 mr-3 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                    Menyusun Laporan...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-3" />
                    Download {format.toUpperCase()}
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
