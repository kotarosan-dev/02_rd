"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface ProgressChartProps {
  data: {
    date: string;
    selfEsteem: number;
    beautyGoals: number;
  }[];
  title: string;
  description?: string;
}

export function ProgressChart({ data, title, description }: ProgressChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const tooltipStyle = {
    backgroundColor: isDark ? "hsl(var(--background))" : "#fff",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    padding: "8px 12px",
    color: isDark ? "hsl(var(--foreground))" : undefined,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "hsl(var(--border))" : undefined}
              />
              <XAxis
                dataKey="date"
                stroke={isDark ? "hsl(var(--foreground))" : undefined}
                tick={{ fill: isDark ? "hsl(var(--foreground))" : undefined }}
                height={60}
                padding={{ left: 0, right: 0 }}
              />
              <YAxis
                stroke={isDark ? "hsl(var(--foreground))" : undefined}
                tick={{ fill: isDark ? "hsl(var(--foreground))" : undefined }}
                width={80}
                padding={{ top: 20, bottom: 20 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="selfEsteem"
                name="自己肯定感スコア"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ strokeWidth: 2, fill: isDark ? "hsl(var(--background))" : "#fff" }}
                activeDot={{ r: 6, strokeWidth: 2, fill: isDark ? "hsl(var(--background))" : "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="beautyGoals"
                name="美容目標達成度"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={{ strokeWidth: 2, fill: isDark ? "hsl(var(--background))" : "#fff" }}
                activeDot={{ r: 6, strokeWidth: 2, fill: isDark ? "hsl(var(--background))" : "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}