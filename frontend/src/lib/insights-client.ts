import { BACKEND_URL } from "@/lib/visualization-client";

export type UnivariateInsightType = "numerical" | "categorical";

export type InsightResponse = {
  status: string;
  insight: string;
};

async function postInsightForm(
  endpoint: string,
  fields: Record<string, string>,
): Promise<string> {
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
    let detail = "Gagal memuat insight AI.";
    try {
      const err = (await res.json()) as { detail?: unknown };
      if (typeof err.detail === "string") {
        detail = err.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const data = (await res.json()) as InsightResponse;
  if (typeof data.insight !== "string" || !data.insight.trim()) {
    throw new Error("Respons server tidak berisi teks insight.");
  }

  return data.insight.trim();
}

export function fetchUnivariateInsight(
  col: string,
  type: UnivariateInsightType,
): Promise<string> {
  return postInsightForm("/api/insights/univariate", { col, type });
}

export function fetchBivariateInsight(xCol: string, yCol: string): Promise<string> {
  return postInsightForm("/api/insights/bivariate", {
    x_col: xCol,
    y_col: yCol,
  });
}
