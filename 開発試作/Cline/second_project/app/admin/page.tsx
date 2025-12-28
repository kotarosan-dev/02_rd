"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const DashboardStats = dynamic(
  () => import("@/components/admin/dashboard/dashboard-stats").then(mod => mod.DashboardStats),
  { ssr: false, loading: () => <div>Loading stats...</div> }
);

const RecentAppointments = dynamic(
  () => import("@/components/admin/dashboard/recent-appointments").then(mod => mod.RecentAppointments),
  { ssr: false, loading: () => <div>Loading appointments...</div> }
);

const SalesChart = dynamic(
  () => import("@/components/admin/dashboard/sales-chart").then(mod => mod.SalesChart),
  { ssr: false, loading: () => <div>Loading chart...</div> }
);

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>
      <Suspense fallback={<div>Loading stats...</div>}>
        <DashboardStats />
      </Suspense>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Suspense fallback={<div>Loading chart...</div>}>
          <SalesChart />
        </Suspense>
        <Suspense fallback={<div>Loading appointments...</div>}>
          <RecentAppointments />
        </Suspense>
      </div>
    </div>
  );
}