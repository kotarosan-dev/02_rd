"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, CalendarCheck } from "lucide-react";
import { getSalesOverview } from "@/lib/sales";
import type { SalesOverviewData } from "@/types/sales";

interface SalesOverviewProps {
  period: "daily" | "weekly" | "monthly";
}

interface SalesOverviewResponse {
  data: SalesOverviewData | null;
  error: Error | null;
}

export function SalesOverview({ period }: SalesOverviewProps) {
  const [data, setData] = useState<SalesOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await getSalesOverview(period) as SalesOverviewResponse;
        if (response.error) throw response.error;
        setData(response.data);
      } catch (error) {
        console.error("Error loading sales overview:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [period]);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-6 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4" />
          <div className="h-8 bg-muted rounded w-2/3" />
        </Card>
      ))}
    </div>;
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">総売上</p>
            <p className="text-2xl font-bold">
              ¥{data.totalSales.toLocaleString()}
            </p>
          </div>
          <div className={`p-2 rounded-full ${
            data.salesGrowth >= 0 
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}>
            {data.salesGrowth >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          前期比 {data.salesGrowth >= 0 ? "+" : ""}
          {data.salesGrowth}%
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">予約件数</p>
            <p className="text-2xl font-bold">
              {data.totalAppointments.toLocaleString()}件
            </p>
          </div>
          <div className="p-2 rounded-full bg-blue-500/10 text-blue-500">
            <CalendarCheck className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          前期比 {data.appointmentsGrowth >= 0 ? "+" : ""}
          {data.appointmentsGrowth}%
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">客単価</p>
            <p className="text-2xl font-bold">
              ¥{data.averageOrderValue.toLocaleString()}
            </p>
          </div>
          <div className={`p-2 rounded-full ${
            data.aovGrowth >= 0 
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}>
            {data.aovGrowth >= 0 ? (
              <TrendingUp className="h-5 w-5" />
            ) : (
              <TrendingDown className="h-5 w-5" />
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          前期比 {data.aovGrowth >= 0 ? "+" : ""}
          {data.aovGrowth}%
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">来店客数</p>
            <p className="text-2xl font-bold">
              {data.uniqueCustomers.toLocaleString()}人
            </p>
          </div>
          <div className="p-2 rounded-full bg-purple-500/10 text-purple-500">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          前期比 {data.customersGrowth >= 0 ? "+" : ""}
          {data.customersGrowth}%
        </p>
      </Card>
    </div>
  );
}