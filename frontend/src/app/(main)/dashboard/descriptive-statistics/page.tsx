"use client";

import { BarChart2, Hash, Tag, Upload, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

export default function Page() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div className="flex w-full max-w-full flex-col items-center justify-center gap-4 overflow-x-hidden py-20 text-center">
        <div className="rounded-2xl bg-primary/10 p-5 shadow-inner">
          <BarChart2 className="size-10 text-primary" />
        </div>
        <div>
          <p className="font-bold text-lg text-foreground">Belum ada dataset yang dimuat</p>
          <p className="mt-1 text-muted-foreground text-sm max-w-sm">
            Silakan unggah file dataset terlebih dahulu untuk melakukan analisis statistik deskriptif.
          </p>
        </div>
        <Button asChild size="sm" className="rounded-xl font-semibold shadow-sm mt-2">
          <Link href="/dashboard/upload-data"><Upload className="size-4 mr-2" />Upload Sekarang</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-2xl tracking-tight text-foreground flex items-center gap-2">
          <BarChart2 className="size-6 text-primary" />
          Statistik Deskriptif
        </h1>
        <p className="text-muted-foreground text-sm">
          Pilih dimensi analisis statistik deskriptif di bawah ini untuk mengeksplorasi atribut data Anda.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/dashboard/descriptive-statistics/numerical">
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-blue-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-blue-500/10 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <Hash className="size-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowRight className="size-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Statistik Numerikal</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Analisis ukuran pemusatan dan penyebaran data: Mean, median, modus, standar deviasi, varians, IQR, skewness, kurtosis, pendeteksian outlier, dan uji normalitas.
              </p>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/descriptive-statistics/categorical">
          <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg">
            <div className="absolute -right-6 -top-6 size-24 rounded-full bg-purple-500/10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl bg-purple-500/10 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <Tag className="size-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex size-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowRight className="size-4" />
              </div>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Statistik Kategorikal</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Analisis distribusi data kualitatif: Tabel frekuensi, persentase kontribusi, jumlah nilai unik (cardinality), modus, dan audit nilai hilang per atribut kategori.
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}