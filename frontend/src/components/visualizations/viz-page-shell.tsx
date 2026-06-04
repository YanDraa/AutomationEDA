"use client";

import type { ReactNode } from "react";

import { BarChart2, Upload } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDatasetColumns } from "@/hooks/use-dataset-columns";

type VizPageShellProps = {
  title: string;
  description: string;
  children: (ctx: {
    numericColumns: string[];
    categoricalColumns: string[];
    loading: boolean;
  }) => ReactNode;
};

export function VizPageShell({ title, description, children }: VizPageShellProps) {
  const { numericColumns, categoricalColumns, activated, loading, error } = useDatasetColumns();

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-[420px] w-full" />
      </div>
    );
  }

  if (!activated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="rounded-full bg-muted p-4">
          <BarChart2 className="size-8 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Belum ada dataset aktif</p>
          <p className="mt-1 text-muted-foreground text-sm">
            Upload file terlebih dahulu agar dropdown kolom terisi.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard">
            <Upload className="size-4" />
            Upload Sekarang
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
        {error ? <p className="mt-2 text-destructive text-sm">{error}</p> : null}
      </div>
      {children({ numericColumns, categoricalColumns, loading })}
    </div>
  );
}
