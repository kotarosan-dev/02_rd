"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  BarChart
} from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface PointTrendsProps {
  data: {
    month: string;
    earned: number;
    used: number;
    balance: number;
  }[];
}

export function PointTrends({ data }: PointTrendsProps) {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme === "dark" ? "hsl(var(--border))" : undefined}
            />
            <XAxis
              dataKey="month"
              stroke={theme === "dark" ? "hsl(var(--foreground))" : undefined}
            />
            <YAxis stroke={theme === "dark" ? "hsl(var(--foreground))" : undefined} />
            <Tooltip
              contentStyle={{
                backgroundColor: theme === "dark" ? "hsl(var(--background))" : "#fff",
                border: "1px solid hsl(var(--border))",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="earned"
              name="獲得ポイント"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="used"
              name="使用ポイント"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="収支"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}