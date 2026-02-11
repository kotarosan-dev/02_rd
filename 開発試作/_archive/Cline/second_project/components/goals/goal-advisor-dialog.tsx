import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface GoalAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalsCreated?: () => void;
}

export function GoalAdvisorDialog({
  open,
  onOpenChange,
  onGoalsCreated,
}: GoalAdvisorDialogProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) {
      toast({
        title: "入力エラー",
        description: "目標や実現したいことを入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/goals/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!response.ok) {
        throw new Error("目標の分析に失敗しました");
      }

      const data = await response.json();
      onOpenChange(false);
      onGoalsCreated?.();
      toast({
        title: "目標を分析しました",
        description: "AIが目標を具体的な形に分解しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "目標の分析に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>AIアドバイザー</DialogTitle>
            <DialogDescription>
              あなたの目標や実現したいことを教えてください。AIが具体的な目標に分解します。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="例：プログラミングスキルを向上させて、実務で使えるレベルになりたい..."
                className="h-32"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              分析する
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 