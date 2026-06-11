"use client";

import { BarChart2, Hash, Tag, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

export default function Page() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div className="flex w-full max-w-full flex-col items-center justify-center gap-4 overflow-x-hidden py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <BarChart2 className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard"><Upload className="size-4" />Upload Sekarang</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-full flex-col gap-6 overflow-x-hidden">
      <div>
        <h1 className="font-semibold text-2xl">Descriptive Statistics</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Pilih jenis analisis statistik deskriptif di bawah ini.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/dashboard/descriptive-statistics/numerical">
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-sm">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Hash className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="mt-2 text-base">Statistik Numerikal</CardTitle>
              <CardDescription>
                Mean, median, modus, std, variance, IQR, skewness, kurtosis, outlier, dan uji normalitas.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/descriptive-statistics/categorical">
          <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-sm">
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                <Tag className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="mt-2 text-base">Statistik Kategorikal</CardTitle>
              <CardDescription>
                Frekuensi, persentase, unique values, modus, dan missing values per kolom kategori.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}