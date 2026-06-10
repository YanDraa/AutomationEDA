"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDataset } from "@/context/dataset-context";

type ColInsight = { column: string; type: string; insight: string };
type ApiResult = {
  overview: { stats: Record<string, unknown>; insight: string };
  column_insights: ColInsight[];
  summary: { stats: Record<string, unknown>; insight: string };
};
type ApiResp = { status: string; result?: ApiResult };

// Render teks markdown sederhana (bold **text**)
function MarkdownText({ text }: { text: string }) {
  const lines = text.split("\n").filter((l) => l.trim());
  return (
    <ul className="flex flex-col gap-1.5">
      {lines.map((line, i) => {
        const clean = line.replace(/^[-•]\s*/, "");
        const parts = clean.split(/\*\*(.*?)\*\*/g);
        return (
          <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
            <span>
              {parts.map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function AiInsight() {
  const { dataset } = useDataset();
  const [result, setResult]   = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchInsight = () => {
    if (!dataset) return;
    setLoading(true);
    setError(null);
    fetch("http://127.0.0.1:8000/api/interpretation")
      .then((r) => r.json())
      .then((d: ApiResp) => {
        if (d.status === "success" && d.result) setResult(d.result);
        else setError("Insight tidak tersedia.");
      })
      .catch(() => setError("Gagal menghubungi server."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchInsight(); }, [dataset]); // eslint-disable-line

  if (!dataset) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 leading-none">
          <Sparkles className="size-4 text-primary" />
          AI Generated Insight
        </CardTitle>
        <CardDescription>Interpretasi otomatis dari dataset yang diupload</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" onClick={fetchInsight} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Generating..." : "Regenerate"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className={`h-3 rounded bg-muted ${i === 4 ? "w-2/3" : "w-full"}`} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && !loading && (
          <>
            {/* Overview */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Overview
              </p>
              <MarkdownText text={result.overview.insight} />
            </div>

            {/* Column Insights */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Column Insights
              </p>
              <div className="flex flex-col gap-2">
                {result.column_insights.map((col) => (
                  <div key={col.column} className="rounded-lg border">
                    <button
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
                      onClick={() => setExpanded(expanded === col.column ? null : col.column)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{col.column}</span>
                        <Badge variant="outline" className="text-xs font-normal">
                          {col.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {expanded === col.column ? "▲" : "▼"}
                      </span>
                    </button>
                    {expanded === col.column && (
                      <div className="border-t px-4 py-3">
                        <MarkdownText text={col.insight} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}