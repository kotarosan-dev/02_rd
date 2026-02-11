"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SalesOverview } from "@/components/admin/sales/sales-overview";
import { SalesChart } from "@/components/admin/sales/sales-chart";
import { SalesByService } from "@/components/admin/sales/sales-by-service";
import { SalesByStaff } from "@/components/admin/sales/sales-by-staff";

export default function AdminSalesPage() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">売上管理</h1>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="daily">日次</TabsTrigger>
            <TabsTrigger value="weekly">週次</TabsTrigger>
            <TabsTrigger value="monthly">月次</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-8">
        <SalesOverview period={period} />
        
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">売上推移</h2>
          <SalesChart period={period} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">メニュー別売上</h2>
            <SalesByService period={period} />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">スタッフ別売上</h2>
            <SalesByStaff period={period} />
          </Card>
        </div>
      </div>
    </div>
  );
}