"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataset } from "@/context/dataset-context";

import staticCustomers from "./data.json";
import type { RecentCustomerRow } from "./recent-customers-table/schema";
import { RecentCustomersTable } from "./recent-customers-table/table";
const STATIC_DATA = staticCustomers as RecentCustomerRow[];

function GenericDataTable({ rows, columns }: {
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  return (
    <div className="overflow-auto rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col} className="h-10 px-3 text-xs font-medium whitespace-nowrap">
                {col}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length > 0 ? (
            rows.map((row, i) => (
              <TableRow key={i} className="hover:bg-muted/20">
                {columns.map((col) => (
                  <TableCell key={col} className="px-3 py-2.5 text-sm whitespace-nowrap">
                    {row[col] === null || row[col] === undefined
                      ? <span className="text-muted-foreground/50 italic text-xs">—</span>
                      : String(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                Tidak ada data.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

type ApiResponse = {
  activated: boolean;
  dataset?: { fileName: string; rows: number; columns: number };
  preview?: {
    columns: { name: string }[];
    rows: Record<string, unknown>[];
  };
};

export function SubscriberOverview() {
  const { dataset } = useDataset();
  const [apiData, setApiData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    if (!dataset) { setApiData(null); return; }
    fetch("http://localhost:8000/api/current-dataset", { credentials: "include" })
      .then((r) => r.json())
      .then((d: ApiResponse) => setApiData(d))
      .catch(() => {});
  }, [dataset]);

  if (!dataset || !apiData?.activated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold leading-none">
            {STATIC_DATA.length.toLocaleString()} Customers
          </CardTitle>
          <CardDescription className="text-xs">
            Recent customer records with plan, billing, status, and signup activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <RecentCustomersTable data={STATIC_DATA} />
        </CardContent>
      </Card>
    );
  }

  const previewRows    = apiData.preview?.rows ?? [];
  const previewColumns = (apiData.preview?.columns ?? []).map((c) => c.name);
  const fileName       = apiData.dataset?.fileName ?? dataset.fileName;
  const totalRows      = apiData.dataset?.rows ?? previewRows.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold leading-none">
          Dataset Preview — {fileName}
        </CardTitle>
        <CardDescription className="text-xs">
          {totalRows.toLocaleString()} total records · menampilkan 10 baris pertama · {previewColumns.length} kolom
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <GenericDataTable rows={previewRows} columns={previewColumns} />
      </CardContent>
    </Card>
  );
}