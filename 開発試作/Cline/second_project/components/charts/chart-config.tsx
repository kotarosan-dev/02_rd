import { useTheme } from "next-themes";
import { useMemo } from "react";

export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  chart1: "hsl(var(--chart-1))",
  chart2: "hsl(var(--chart-2))",
  chart3: "hsl(var(--chart-3))",
  chart4: "hsl(var(--chart-4))",
  chart5: "hsl(var(--chart-5))",
} as const;

export function useChartConfig() {
  const { theme } = useTheme();
  
  return useMemo(() => ({
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
    xAxis: {
      height: 60,
      tick: { 
        fontSize: 12,
        fill: theme === "dark" ? "hsl(var(--foreground))" : undefined
      },
      stroke: theme === "dark" ? "hsl(var(--foreground))" : undefined,
      padding: { left: 0, right: 0 }
    },
    yAxis: {
      width: 80,
      tick: { 
        fontSize: 12,
        fill: theme === "dark" ? "hsl(var(--foreground))" : undefined
      },
      stroke: theme === "dark" ? "hsl(var(--foreground))" : undefined,
      padding: { top: 20, bottom: 20 }
    },
    cartesianGrid: {
      strokeDasharray: "3 3",
      stroke: theme === "dark" ? "hsl(var(--border))" : undefined,
    },
    tooltip: {
      contentStyle: { 
        backgroundColor: theme === "dark" ? "hsl(var(--background))" : "#fff",
        border: "1px solid hsl(var(--border))",
        borderRadius: "8px",
        padding: "8px 12px",
        color: theme === "dark" ? "hsl(var(--foreground))" : undefined,
      },
    },
    line: {
      type: "monotone" as const,
      strokeWidth: 2,
      dot: { 
        strokeWidth: 2,
        fill: theme === "dark" ? "hsl(var(--background))" : "#fff",
      },
      activeDot: { 
        r: 6, 
        strokeWidth: 2,
        fill: theme === "dark" ? "hsl(var(--background))" : "#fff",
      },
    },
    bar: {
      radius: [0, 4, 4, 0],
      fill: CHART_COLORS.primary
    }
  }), [theme]);
}