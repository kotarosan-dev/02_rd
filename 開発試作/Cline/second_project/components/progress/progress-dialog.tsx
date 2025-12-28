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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { updateGoalProgress } from "@/lib/goals";

interface ProgressDialogProps {
  goalId: number;
  currentProgress: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressUpdated: () => void;
}

export function ProgressDialog({
  goalId,
  currentProgress,
  open,
  onOpenChange,
  onProgressUpdated,
}: ProgressDialogProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const { error } = await updateGoalProgress(goalId, progress, note);

      if (error) throw error;

      toast({
        title: "進捗を更新しました",
        description: progress === 100 ? "おめでとうございます！目標を達成しました！" : "進捗が記録されました",
      });

      onOpenChange(false);
      onProgressUpdated();
      setNote("");
    } catch (error) {
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>進捗を更新</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>進捗状況 ({progress}%)</Label>
              <Slider
                value={[progress]}
                onValueChange={(value) => setProgress(value[0])}
                max={100}
                step={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">メモ（任意）</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="進捗に関するメモを残せます"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "更新中..." : "進捗を更新"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}