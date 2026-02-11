"use client";

import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, CheckCircle2, Clock } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { ProgressHistory } from "./progress-history";
import { AchievementDialog } from "./achievement-dialog";
import { ProgressDialog } from "./progress-dialog";
import { getGoalProgress } from "@/lib/goals";
import type { GoalProgress } from "@/types/goals";

interface GoalCardProps {
  id: number;
  title: string;
  description: string;
  progress: number;
  deadline: Date;
  category: string;
  onProgressUpdated: () => void;
}

export function GoalCard({
  id,
  title,
  description,
  progress,
  deadline,
  category,
  onProgressUpdated,
}: GoalCardProps) {
  const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isCompleted = progress === 100;
  const [showHistory, setShowHistory] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [showAchievementDialog, setShowAchievementDialog] = useState(false);
  const [progressHistory, setProgressHistory] = useState<GoalProgress[]>([]);

  const loadProgressHistory = useCallback(async () => {
    if (showHistory) {
      const { data } = await getGoalProgress(id);
      if (data) setProgressHistory(data);
    }
  }, [id, showHistory]);

  useEffect(() => {
    loadProgressHistory();
  }, [loadProgressHistory]);
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {category}
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>進捗状況</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => setShowHistory(!showHistory)}
            >
              履歴
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0"
              onClick={() => setShowProgressDialog(true)}
              disabled={isCompleted}
            >
              {progress}%
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        {showHistory && (
          <div className="pt-4">
            <ProgressHistory history={progressHistory} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-1 text-muted-foreground">
          <Target className="h-4 w-4" />
          <span>{isCompleted ? "目標達成" : `残り${daysLeft}日`}</span>
        </div>
        {isCompleted ? (
          <div className="flex items-center space-x-1 text-green-500">
            <CheckCircle2 className="h-4 w-4" />
            <span>完了</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{deadline.toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <ProgressDialog
        goalId={id}
        currentProgress={progress}
        open={showProgressDialog}
        onOpenChange={(open) => {
          setShowProgressDialog(open);
          if (!open && progress === 100) {
            setShowAchievementDialog(true);
          }
        }}
        onProgressUpdated={() => {
          onProgressUpdated();
          loadProgressHistory();
        }}
      />
      <AchievementDialog
        open={showAchievementDialog}
        onOpenChange={setShowAchievementDialog}
        goalTitle={title}
        points={100}
      />
    </Card>
  );
}