"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useChartConfig } from "@/components/admin/dashboard/use-chart-config";
import { useTheme } from "next-themes";
import { getSalesChart } from "@/lib/sales";
import type { SalesChartData } from "@/types/sales";

interface SalesChartProps {
  period: "daily" | "weekly" | "monthly";
}

export function SalesChart({ period }: SalesChartProps) {
  const [data, setData] = useState<SalesChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const config = useChartConfig();
  const { theme } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data, error } = await getSalesChart(period);
        if (error) throw error;
        setData(data);
      } catch (error) {
        console.error("Error loading sales chart:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  if (loading) {
    return <div className="h-[400px] animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid {...config.cartesianGrid} />
          <XAxis
            dataKey="date"
            {...config.xAxis}
          />
          <YAxis
            {...config.yAxis}
            tickFormatter={(value) => `¥${value.toLocaleString()}`}
          />
          <Tooltip 
            {...config.tooltip}
            formatter={(value: number) => [`¥${value.toLocaleString()}`, "売上"]}
          />
          <Line
            dataKey="sales"
            name="売上"
            stroke="hsl(var(--primary))"
            {...config.line}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}