"use client";

import { useMemo } from "react";
import { LineChart, Line, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useChartConfig } from "@/components/admin/dashboard/use-chart-config";
import { useTheme } from "next-themes";

interface RewardUsageChartProps {
  data: {
    date: string;
    exchanges: number;
  }[];
}

export function RewardUsageChart({ data }: RewardUsageChartProps) {
  const config = useChartConfig();
  const { theme } = useTheme();

  const chartData = useMemo(() => data.map(item => ({
    ...item,
    exchanges: Number(item.exchanges)
  })), [data]);

  const xAxisProps = {
    dataKey: "date",
    height: 60,
    tick: { 
      fontSize: 12,
      fill: theme === "dark" ? "hsl(var(--foreground))" : undefined
    },
    stroke: theme === "dark" ? "hsl(var(--foreground))" : undefined,
    padding: { left: 0, right: 0 },
    allowDataOverflow: false,
    type: "category" as const,
    allowDecimals: true,
    interval: 0
  };

  const yAxisProps = {
    width: 80,
    tick: { 
      fontSize: 12,
      fill: theme === "dark" ? "hsl(var(--foreground))" : undefined
    },
    stroke: theme === "dark" ? "hsl(var(--foreground))" : undefined,
    padding: { top: 0, bottom: 0 },
    allowDataOverflow: false,
    type: "number" as const,
    allowDecimals: true,
    interval: 0
  };

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid {...config.cartesianGrid} />
          <XAxis {...xAxisProps} />
          <YAxis {...yAxisProps} />
          <Tooltip {...config.tooltip} />
          <Line
            type="monotone"
            dataKey="exchanges"
            name="交換数"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}