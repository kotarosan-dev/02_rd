"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "next-themes";

interface SeasonalTrendsProps {
  data: {
    category: string;
    counts: number[];
    peak: number;
    low: number;
  }[];
}

const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function SeasonalTrends({ data }: SeasonalTrendsProps) {
  const { theme } = useTheme();
  
  const chartData = months.map((month, index) => ({
    month,
    ...data.reduce((acc, category) => ({
      ...acc,
      [category.category]: category.counts[index]
    }), {})
  }));

  return (
    <div className="space-y-6">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
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
            {data.map((category, index) => (
              <Line
                key={category.category}
                type="monotone"
                dataKey={category.category}
                name={category.category}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((category) => (
          <Card key={category.category} className="p-4">
            <h4 className="font-semibold mb-2">{category.category}</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ピーク</span>
                <Badge variant="outline">{months[category.peak - 1]}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">オフシーズン</span>
                <Badge variant="outline">{months[category.low - 1]}</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}