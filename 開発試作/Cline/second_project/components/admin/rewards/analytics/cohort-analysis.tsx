"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface CohortAnalysisProps {
  data: {
    cohorts: {
      cohort: string;
      totalUsers: number;
      monthlyActivity: {
        month: number;
        activeUsers: number;
        achievements: number;
        earnedPoints: number;
        exchanges: number;
        usedPoints: number;
        retentionRate: number;
      }[];
    }[];
    summary: {
      totalCohorts: number;
      averageRetention: number;
      bestRetentionCohort: {
        cohort: string;
        retentionRate: number;
      };
      averageLifetimeValue: number;
    };
  };
}

export function CohortAnalysis({ data }: CohortAnalysisProps) {
  // 最大の月数を計算
  const maxMonths = Math.max(
    ...data.cohorts.flatMap(cohort =>
      cohort.monthlyActivity.map(activity => activity.month)
    )
  );

  // リテンション率に基づいて背景色を計算
  const getBackgroundColor = (rate: number) => {
    if (rate === 0) return "bg-transparent";
    if (rate < 20) return "bg-red-500/10";
    if (rate < 40) return "bg-orange-500/10";
    if (rate < 60) return "bg-yellow-500/10";
    if (rate < 80) return "bg-green-500/10";
    return "bg-emerald-500/10";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">コホート数</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>分析対象の総コホート数</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold mt-2">
            {data.summary.totalCohorts}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">平均リテンション率</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>2ヶ月目の平均継続率</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold mt-2">
            {data.summary.averageRetention.toFixed(1)}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">最高リテンション</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>最も高いリテンション率を記録したコホート</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {data.summary.bestRetentionCohort.cohort}
          </p>
          <p className="text-2xl font-bold">
            {data.summary.bestRetentionCohort.retentionRate.toFixed(1)}%
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">平均LTV</h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>ユーザーあたりの平均獲得ポイント</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold mt-2">
            {Math.round(data.summary.averageLifetimeValue).toLocaleString()} pt
          </p>
        </Card>
      </div>

      <Card className="p-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-background sticky left-0 z-20">コホート</TableHead>
              <TableHead className="text-right bg-background sticky left-[120px] z-20">ユーザー数</TableHead>
              {Array.from({ length: maxMonths + 1 }).map((_, i) => (
                <TableHead key={i} className="text-right min-w-[100px]">
                  {i}ヶ月目
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.cohorts.map((cohort) => (
              <TableRow key={cohort.cohort}>
                <TableCell className="font-medium bg-background sticky left-0 z-10">
                  {cohort.cohort}
                </TableCell>
                <TableCell className="text-right bg-background sticky left-[120px] z-10">
                  {cohort.totalUsers}
                </TableCell>
                {Array.from({ length: maxMonths + 1 }).map((_, month) => {
                  const activity = cohort.monthlyActivity.find(
                    (a) => a.month === month
                  );
                  return (
                    <TableCell
                      key={month}
                      className={`text-right ${getBackgroundColor(
                        activity?.retentionRate || 0
                      )}`}
                    >
                      {activity ? `${activity.retentionRate.toFixed(1)}%` : "-"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}