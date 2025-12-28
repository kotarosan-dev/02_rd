"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateGoalProgress } from "@/lib/goals";
import { Progress } from "@/components/ui/progress";

interface ProgressDialogProps {
  goalId: number;
  currentProgress: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressUpdated?: () => void;
}

export function ProgressDialog({
  goalId,
  currentProgress,
  open,
  onOpenChange,
  onProgressUpdated,
}: ProgressDialogProps) {
  const [progress, setProgress] = useState(currentProgress.toString());
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const progressValue = Number(progress);

    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      toast({
        title: "入力エラー",
        description: "進捗は0から100の間で入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await updateGoalProgress(goalId, progressValue, note);

      toast({
        title: "進捗を更新しました",
        description: "目標の進捗状況を更新しました",
      });
      
      onOpenChange(false);
      if (onProgressUpdated) onProgressUpdated();
      setNote("");
    } catch (error) {
      console.error('Error updating progress:', error);
      toast({
        title: "エラー",
        description: "進捗の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center text-pink-600 dark:text-pink-400">
              今日の成長を記録
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="grid gap-3">
              <Label htmlFor="progress" className="text-lg">
                達成度 (%)
              </Label>
              <div className="space-y-4">
                <Input
                  id="progress"
                  type="number"
                  min="0"
                  max="100"
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  className="text-lg h-12"
                />
                <Progress value={Number(progress)} className="h-3 bg-pink-100 dark:bg-pink-900/20">
                  <div 
                    className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300" 
                    style={{ width: `${progress}%` }} 
                  />
                </Progress>
              </div>
            </div>
            <div className="grid gap-3">
              <Label htmlFor="note" className="text-lg">
                今日の振り返り
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="今日の頑張りや気づき、感じたことを記録しましょう..."
                className="min-h-[120px] text-lg"
              />
            </div>
            <div className="bg-pink-50 dark:bg-pink-900/10 p-4 rounded-lg">
              <p className="text-sm text-pink-600 dark:text-pink-400">
                ✨ 毎日の小さな進歩が、大きな変化につながります。
                <br />
                今日の自分を認め、明日への一歩を踏み出しましょう。
              </p>
            </div>
          </div>
          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              キャンセル
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
            >
              {isSubmitting ? "記録中..." : "成長を記録する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 