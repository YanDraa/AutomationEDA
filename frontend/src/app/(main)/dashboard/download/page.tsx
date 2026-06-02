"use client";

import { Download, FileDown, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

export default function Page() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4"><Download className="size-8 text-muted-foreground" /></div>
        <div>
          <p className="font-medium">Belum ada dataset</p>
          <p className="mt-1 text-muted-foreground text-sm">Upload file terlebih dahulu.</p>
        </div>
        <Button asChild size="sm"><Link href="/dashboard"><Upload className="size-4" />Upload Sekarang</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">Download</h1>
        <p className="mt-1 text-muted-foreground text-sm">Unduh hasil analisis EDA dalam berbagai format.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { format: "CSV", desc: "Data hasil cleaning & preprocessing", icon: FileDown },
          { format: "XLSX", desc: "Spreadsheet lengkap dengan statistik", icon: FileDown },
          { format: "PDF", desc: "Laporan lengkap siap presentasi", icon: FileDown },
        ].map((f) => (
          <Card key={f.format}>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <f.icon className="size-5 text-primary" />
              </div>
              <CardTitle className="mt-2 text-base">{f.format}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" size="sm" disabled>
                <Download className="size-4" />
                Download {f.format}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}