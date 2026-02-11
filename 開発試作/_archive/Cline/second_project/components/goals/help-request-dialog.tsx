"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface HelpRequestDialogProps {
  goalId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestSubmitted?: () => void;
}

export function HelpRequestDialog({
  goalId,
  open,
  onOpenChange,
  onRequestSubmitted,
}: HelpRequestDialogProps) {
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("goal_help_requests")
        .insert({
          goal_id: goalId,
          description: description.trim(),
          status: "active"
        });

      if (error) throw error;

      toast({
        title: "ヘルプリクエストを送信しました",
        description: "コミュニティのメンバーからアドバイスをお待ちください",
      });

      setDescription("");
      onOpenChange(false);
      onRequestSubmitted?.();
    } catch (error) {
      console.error("ヘルプリクエスト送信エラー:", error);
      toast({
        title: "エラー",
        description: "ヘルプリクエストの送信に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>アドバイスを求める</DialogTitle>
          <DialogDescription>
            目標達成に向けて困っていることや悩みを共有してください。
            コミュニティのメンバーからアドバイスをもらえます。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：スキンケアの順番がわからない、継続するためのモチベーション維持が難しい..."
            className="min-h-[150px]"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            送信する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 