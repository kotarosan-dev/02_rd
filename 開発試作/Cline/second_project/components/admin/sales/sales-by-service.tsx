"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, CartesianGrid, Tooltip, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useChartConfig } from "@/components/charts/chart-config";
import { useTheme } from "next-themes";
import { getSalesByService } from "@/lib/sales";
import type { SalesByServiceData } from "@/types/sales";

interface SalesByServiceProps {
  period: "daily" | "weekly" | "monthly";
}

export function SalesByService({ period }: SalesByServiceProps) {
  const [data, setData] = useState<SalesByServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const config = useChartConfig();
  const { theme } = useTheme();

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const { data, error } = await getSalesByService(period);
        if (error) throw error;
        setData(data);
      } catch (error) {
        console.error("Error loading sales by service:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  if (loading) {
    return <div className="h-[300px] animate-pulse bg-muted rounded-lg" />;
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid {...config.cartesianGrid} />
          <XAxis
            type="number"
            {...config.xAxis}
            tickFormatter={(value) => `¥${value.toLocaleString()}`}
          />
          <YAxis
            type="category"
            dataKey="name"
            {...config.yAxis}
          />
          <Tooltip 
            {...config.tooltip}
            formatter={(value: number) => [`¥${value.toLocaleString()}`, "売上"]}
          />
          <Bar
            dataKey="sales"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}