"use client";

import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AiInsightPanelProps = {
  insight: string | null;
  loading: boolean;
  error: string | null;
  visible: boolean;
};

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-medium text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function InsightMarkdown({ content }: { content: string }) {
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));

  if (bulletLines.length > 0) {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
        {bulletLines.map((line) => {
          const text = line.replace(/^[-*]\s+/, "");
          return <li key={line}>{renderInlineMarkdown(text)}</li>;
        })}
      </ul>
    );
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      {lines.map((line) => (
        <p key={line}>{renderInlineMarkdown(line)}</p>
      ))}
    </div>
  );
}

export function AiInsightPanel({ insight, loading, error, visible }: AiInsightPanelProps) {
  if (!visible && !loading) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.02]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" />
          Automated AI Insight
        </CardTitle>
        <CardDescription>
          Wawasan bisnis singkat berdasarkan statistik data — dihasilkan oleh Gemini AI atau
          analisis rule-based.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="size-4 animate-spin" />
            Menghasilkan insight...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="flex items-start gap-2 text-destructive text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {!loading && !error && insight ? <InsightMarkdown content={insight} /> : null}
      </CardContent>
    </Card>
  );
}
