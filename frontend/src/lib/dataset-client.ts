export type CurrentDatasetResponse = {
  status: "success";
  dataset: {
    fileName: string;
    rows: number;
    columns: number;
    uploadTime: string;
    fileSize: string;
  };
  preview?: {
    columns: Array<{
      name: string;
      dtype: string;
      type: string;
      missing: number;
      "missing_%": number;
    }>;
    rows: Array<Record<string, unknown>>;
    total_rows: number;
    total_columns: number;
  };
};


export async function fetchCurrentDataset(): Promise<CurrentDatasetResponse | null> {
  const res = await fetch("http://127.0.0.1:8000/api/current-dataset", {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as CurrentDatasetResponse;
  if (data?.status !== "success") return null;
  return data;
}

