"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSalesData } from "@/hooks/use-sales-data";
import { useChartConfig } from "./use-chart-config";

const CustomizedXAxis = (props: any) => (
  <XAxis {...props} height={60} tick={{ fontSize: 12 }} />
);

const CustomizedYAxis = (props: any) => (
  <YAxis {...props} width={80} tick={{ fontSize: 12 }} />
);

export function SalesChart() {
  const { data, loading, error } = useSalesData();
  const config = useChartConfig();
  const formatCurrency = (value: number) => `¥${value.toLocaleString()}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>売上推移</CardTitle>
        <CardDescription>過去7日間の売上推移を表示しています</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        {error && (
          <div className="h-[300px] flex items-center justify-center text-destructive">
            データの読み込みに失敗しました
          </div>
        )}
        {!loading && !error && (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={config.margin}
            >
              <CartesianGrid {...config.cartesianGrid} />
              <CustomizedXAxis
                dataKey="date"
                {...config.xAxis}
              />
              <CustomizedYAxis
                {...config.yAxis}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={formatCurrency}
                {...config.tooltip}
              />
              <Line
                dataKey="sales"
                stroke="hsl(var(--primary))"
                {...config.line}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </CardContent>
    </Card>
  );
}