"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import type { GoalProgress } from "@/types/goals";

interface ProgressHistoryProps {
  history: GoalProgress[];
}

export function ProgressHistory({ history }: ProgressHistoryProps) {
  return (
    <ScrollArea className="h-[300px] pr-4">
      <div className="space-y-4">
        {history.map((record) => (
          <div key={record.id} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {formatDistanceToNow(record.recorded_at, { addSuffix: true, locale: ja })}
              </span>
              <span className="font-medium">{record.progress}%</span>
            </div>
            <Progress value={record.progress} className="h-2" />
            {record.note && (
              <p className="text-sm text-muted-foreground">{record.note}</p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}