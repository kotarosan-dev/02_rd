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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { createGoal } from "@/lib/goals";
import type { Goal } from "@/types/goal";

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

const types: { value: Goal['type']; label: string }[] = [
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" },
  { value: "monthly", label: "毎月" },
];

export function GoalDialog({ open, onOpenChange, onGoalCreated }: GoalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<Goal['type']>("daily");
  const [targetValue, setTargetValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setType("daily");
    setTargetValue("");
    setEndDate("");
    setIsPublic(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !type || !targetValue || !endDate) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const params = {
        title,
        description,
        category,
        type,
        target_value: Number(targetValue),
        end_date: new Date(endDate).toISOString(),
        status: 'active' as const,
      };
      await createGoal(params);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>新しい目標を設定</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="目標のタイトルを入力"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="目標の詳細を入力"
              />
            </div>
            <div className="grid gap-2">
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
            <div className="grid gap-2">
              <Label htmlFor="type">期間タイプ</Label>
              <Select value={type} onValueChange={(value: Goal['type']) => setType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="期間タイプを選択" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetValue">目標値</Label>
              <Input
                id="targetValue"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="目標値を入力"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">目標期限</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="isPublic">公開設定</Label>
              <Switch
                id="isPublic"
                checked={isPublic}
                onCheckedChange={setIsPublic}
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