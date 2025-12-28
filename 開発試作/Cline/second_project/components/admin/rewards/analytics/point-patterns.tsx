"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { Card } from "@/components/ui/card";
import { useTheme } from "next-themes";

interface PointPatternsProps {
  achievementPatterns: number[];
  exchangePatterns: number[];
}

const timeSlots = [
  "0時-6時",
  "6時-12時",
  "12時-18時",
  "18時-24時"
];

export function PointPatterns({ achievementPatterns, exchangePatterns }: PointPatternsProps) {
  const { theme } = useTheme();

  const data = timeSlots.map((slot, index) => ({
    timeSlot: slot,
    achievements: achievementPatterns[index],
    exchanges: exchangePatterns[index]
  }));

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={theme === "dark" ? "hsl(var(--border))" : undefined}
          />
          <XAxis
            dataKey="timeSlot"
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
          <Bar
            dataKey="achievements"
            name="目標達成"
            fill="hsl(var(--chart-1))"
          />
          <Bar
            dataKey="exchanges"
            name="特典交換"
            fill="hsl(var(--chart-2))"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}