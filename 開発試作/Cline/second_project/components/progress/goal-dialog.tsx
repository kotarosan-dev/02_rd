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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createGoal } from "@/lib/goals";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalCreated?: () => void;
}

const categories = [
  { value: "スキンケア", label: "スキンケア" },
  { value: "ボディケア", label: "ボディケア" },
  { value: "メンタルケア", label: "メンタルケア" },
  { value: "ヘアケア", label: "ヘアケア" },
  { value: "メイク", label: "メイク" },
];

export function GoalDialog({ open, onOpenChange, onGoalCreated }: GoalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !deadline) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const goal = await createGoal({
        title,
        description,
        category,
        type: 'daily',
        target_value: 0,
        end_date: new Date(deadline).toISOString(),
        status: 'active',
      });

      toast({
        title: "目標を設定しました",
        description: "新しい目標の設定が完了しました",
      });
      
      onOpenChange(false);
      if (onGoalCreated) onGoalCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "エラー",
        description: "目標の設定に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setDeadline("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しい目標を設定</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">目標タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="目標を入力してください"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">詳細説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="目標の詳細を入力してください"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">カテゴリー</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deadline">目標期限</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
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
              {isSubmitting ? "設定中..." : "目標を設定"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}