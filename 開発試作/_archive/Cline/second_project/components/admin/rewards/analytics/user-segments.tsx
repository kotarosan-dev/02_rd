"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "next-themes";

interface UserSegmentsProps {
  data: {
    currentSegments: {
      segment: string;
      userCount: number;
      averagePoints: number;
      averageAchievements: number;
      averageExchanges: number;
      categoryDiversity: number;
    }[];
    segmentTrends: {
      month: string;
      vip: number;
      active: number;
      moderate: number;
      risk: number;
      inactive: number;
    }[];
  };
}

const segmentLabels = {
  vip: "VIPユーザー",
  active: "アクティブユーザー",
  moderate: "中程度アクティブ",
  risk: "リスクユーザー",
  inactive: "非アクティブ",
};

const segmentDescriptions = {
  vip: "高ポイント獲得、多カテゴリー利用、高頻度アクティブ",
  active: "定期的な目標達成、高い活動頻度",
  moderate: "適度な活動頻度、安定した利用",
  risk: "活動頻度低下、再活性化が必要",
  inactive: "長期間の未活動",
};

const segmentColors = {
  vip: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  active: "bg-green-500/10 text-green-700 dark:text-green-300",
  moderate: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  risk: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  inactive: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function UserSegments({ data }: UserSegmentsProps) {
  const { theme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {data.currentSegments.map((segment, index) => (
          <Card key={segment.segment}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{segmentLabels[segment.segment as keyof typeof segmentLabels]}</span>
                <Badge className={segmentColors[segment.segment as keyof typeof segmentColors]}>
                  {segment.userCount}人
                </Badge>
              </CardTitle>
              <CardDescription>
                {segmentDescriptions[segment.segment as keyof typeof segmentDescriptions]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">平均ポイント</span>
                  <span>{Math.round(segment.averagePoints).toLocaleString()} pt</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">平均目標達成</span>
                  <span>{segment.averageAchievements.toFixed(1)}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">平均交換</span>
                  <span>{segment.averageExchanges.toFixed(1)}回</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">カテゴリー数</span>
                  <span>{segment.categoryDiversity.toFixed(1)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>セグメント推移</CardTitle>
          <CardDescription>
            過去6ヶ月間のユーザーセグメント分布の推移
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.segmentTrends}>
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
                {Object.keys(segmentLabels).map((segment, index) => (
                  <Line
                    key={segment}
                    type="monotone"
                    dataKey={segment}
                    name={segmentLabels[segment as keyof typeof segmentLabels]}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}