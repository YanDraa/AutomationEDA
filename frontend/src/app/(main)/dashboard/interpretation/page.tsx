"use client";

import { Sparkles, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDataset } from "@/context/dataset-context";

export default function Page() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4"><Sparkles className="size-8 text-muted-foreground" /></div>
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
        <h1 className="font-semibold text-2xl">Interpretation</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Interpretasi otomatis hasil analisis EDA pada dataset Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="size-5 text-primary" />
          </div>
          <CardTitle className="mt-2 text-base">AI Interpretation</CardTitle>
          <CardDescription>Dataset: {dataset.fileName}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Fitur interpretasi AI sedang dalam pengembangan.</p>
        </CardContent>
      </Card>
    </div>
  );
}