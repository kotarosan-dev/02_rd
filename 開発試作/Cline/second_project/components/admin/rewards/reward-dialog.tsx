"use client";

import { useState, useEffect } from "react";
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
import { createReward, updateReward } from "@/lib/rewards";
import type { Reward } from "@/types/rewards";

interface RewardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward?: Reward | null;
  onRewardSaved: () => void;
}

const categories = [
  { value: "クーポン", label: "クーポン" },
  { value: "メニュー", label: "メニュー" },
  { value: "商品", label: "商品" },
  { value: "会員特典", label: "会員特典" },
  { value: "サービス", label: "サービス" },
];

export function RewardDialog({
  open,
  onOpenChange,
  reward,
  onRewardSaved,
}: RewardDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("");
  const [category, setCategory] = useState("");
  const [stock, setStock] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (reward) {
      setTitle(reward.title);
      setDescription(reward.description || "");
      setPoints(reward.points.toString());
      setCategory(reward.category);
      setStock(reward.stock.toString());
    } else {
      resetForm();
    }
  }, [reward]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPoints("");
    setCategory("");
    setStock("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !points || !category || !stock) {
      toast({
        title: "入力エラー",
        description: "必須項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const data = {
        title,
        description,
        points: parseInt(points),
        category,
        stock: parseInt(stock),
      };

      const { error } = reward
        ? await updateReward(reward.id, data)
        : await createReward(data);

      if (error) throw error;

      toast({
        title: `特典を${reward ? "更新" : "作成"}しました`,
      });
      
      onOpenChange(false);
      onRewardSaved();
      if (!reward) resetForm();
    } catch (error) {
      toast({
        title: "エラー",
        description: `特典の${reward ? "更新" : "作成"}に失敗しました`,
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
            <DialogTitle>
              {reward ? "特典を編集" : "新規特典を追加"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">タイトル</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="特典のタイトルを入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="特典の説明を入力"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">必要ポイント</Label>
              <Input
                id="points"
                type="number"
                min="0"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                placeholder="交換に必要なポイント数"
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
              <Label htmlFor="stock">在庫数</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="在庫数を入力"
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
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}