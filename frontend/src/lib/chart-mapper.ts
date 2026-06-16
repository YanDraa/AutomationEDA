type ChartOption = { value: string; label: string };

/**
 * Returns chart options and a default chart type based on two column types.
 * xType and yType can be "categorical" or "numeric".
 * The mapping follows the specifications:
 *   a) Numerical vs Numerical – Scatter Plot, Correlation Heatmap, Pair Plot, Regression Plot, Bubble Chart
 *   b) Categorical vs Categorical – Bar Chart, Pie Chart, Count Plot, Pareto Chart, Stacked Bar Chart, Grouped Bar Chart
 *   d) Mixed (Categorical vs Numerical) – Boxplot by Category, Violin Plot by Category, Grouped Bar Chart, Strip Plot
 */
export function getChartOptions(
  xType: "categorical" | "numeric",
  yType: "categorical" | "numeric"
): { options: ChartOption[]; default: string } {
  const opt = (value: string, label: string): ChartOption => ({ value, label });

  // Helper to detect mixed case (order independent)
  const isMixed = (a: string, b: string) =>
    (a === "numeric" && b === "categorical") || (a === "categorical" && b === "numeric");

  // Numerical vs Numerical
  if (xType === "numeric" && yType === "numeric") {
    const options = [
      opt("scatter", "Scatter Plot"),
      // opt("pair-plot", "Pair Plot"), // removed per user request
      opt("regression", "Regression Plot"),
      opt("bubble", "Bubble Chart"),
    ];
    return { options, default: "scatter" };
  }

  // Categorical vs Categorical
  if (xType === "categorical" && yType === "categorical") {
    const options = [
      opt("grouped-bar", "Grouped Bar Chart"),
      opt("pareto", "Pareto Chart"),
      opt("heatmap-crosstab", "Heatmap Crosstab"),
      opt("stacked-bar", "Stacked Bar Chart"),
    ];
    return { options, default: "grouped-bar" };
  }

  // Mixed: Categorical vs Numerical (order does not matter)
  if (isMixed(xType, yType)) {
    const options = [
      opt("boxplot", "Boxplot"),
      opt("bar-aggregation", "Bar Aggregation"),
    ];
    return { options, default: "boxplot" };
  }

  // Fallback (should not occur)
  return { options: [], default: "" };
}
