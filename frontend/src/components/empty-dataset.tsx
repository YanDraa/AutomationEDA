"use client";

import { Database, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface EmptyDatasetProps {
  title?: string;
  description?: string;
}

export function EmptyDataset({
  title = "No dataset loaded",
  description = "Upload a file first to start exploring your data.",
}: EmptyDatasetProps) {
  return (
    <div className="flex w-full max-w-full flex-col items-center justify-center gap-6 overflow-x-hidden py-24 text-center">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-xl" />
        <div className="relative rounded-2xl border bg-card p-6 shadow-lg">
          <Database className="size-12 text-muted-foreground" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-xl">{title}</p>
        <p className="mt-2 text-muted-foreground text-sm">{description}</p>
      </div>
      <Button asChild size="lg" className="shadow-md">
        <Link href="/dashboard/upload-data">
          <Upload className="size-4" /> Upload Dataset
        </Link>
      </Button>
    </div>
  );
}
