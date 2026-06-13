export const BACKEND_URL = "http://localhost:8000";

export type HighchartsOptions = Record<string, unknown>;

export type DatasetColumnsPayload = {
  numeric_columns: string[];
  categorical_columns: string[];
  activated: boolean;
};

export async function fetchDatasetColumns(): Promise<DatasetColumnsPayload> {
  const res = await fetch(`${BACKEND_URL}/api/current-dataset`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    return { numeric_columns: [], categorical_columns: [], activated: false };
  }

  const data = (await res.json()) as {
    activated?: boolean;
    numeric_columns?: string[];
    categorical_columns?: string[];
  };

  return {
    numeric_columns: Array.isArray(data.numeric_columns) ? data.numeric_columns : [],
    categorical_columns: Array.isArray(data.categorical_columns) ? data.categorical_columns : [],
    activated: data.activated === true,
  };
}

export async function postVisualizationOptions(
  endpoint: string,
  fields: Record<string, string>,
): Promise<HighchartsOptions> {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  const res = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "POST",
    body: form,
    credentials: "include",
  });

  if (!res.ok) {
    let detail = "Gagal membuat visualisasi.";
    try {
      const err = (await res.json()) as { detail?: string };
      detail = typeof err.detail === "string" ? err.detail : detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as { options?: HighchartsOptions };
  if (!data.options || typeof data.options !== "object") {
    throw new Error("Respons server tidak berisi konfigurasi Highcharts.");
  }

  return data.options;
}
