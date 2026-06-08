import { BACKEND_URL } from "@/lib/visualization-client";

export type ColumnInsight = {
  column: string;
  type: "numerical" | "categorical";
  insight: string;
};

export type InterpretationResult = {
  overview: {
    stats: {
      file_name: string;
      rows: number;
      columns: number;
      numeric_columns: number;
      categorical_columns: number;
    };
    insight: string;
  };
  column_insights: ColumnInsight[];
  summary: {
    stats: {
      high_missing_columns: string[];
      numeric_columns: number;
      categorical_columns: number;
      rows: number;
    };
    insight: string;
  };
};

export type ReportResult = {
  generated_at: string;
  dataset: {
    fileName: string;
    rows: number;
    columns: number;
    fileSize: string;
    uploadedAt: string;
  };
  numeric_stats: Record<string, Record<string, unknown>>;
  categorical_stats: Record<string, Record<string, unknown>>;
  interpretation: InterpretationResult;
};

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const err = (await res.json()) as { detail?: unknown };
    if (typeof err.detail === "string") return err.detail;
  } catch {
    // ignore
  }
  return fallback;
}

export async function fetchInterpretation(): Promise<InterpretationResult> {
  const res = await fetch(`${BACKEND_URL}/api/interpretation`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Gagal memuat interpretasi."));
  }

  const data = (await res.json()) as { status: string; result: InterpretationResult };
  return data.result;
}

export async function fetchReport(): Promise<ReportResult> {
  const res = await fetch(`${BACKEND_URL}/api/reports`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(await parseError(res, "Gagal memuat laporan."));
  }

  const data = (await res.json()) as { status: string; result: ReportResult };
  return data.result;
}

export async function downloadExport(
  format: "csv" | "xlsx" | "pdf",
  fileName: string,
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/download/${format}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(await parseError(res, `Gagal mengunduh file ${format.toUpperCase()}.`));
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  const match = disposition?.match(/filename="?([^"]+)"?/);
  const downloadName = match?.[1] ?? `${fileName}_export.${format === "xlsx" ? "xlsx" : format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
