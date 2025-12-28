"use client";

import supabase from '@/lib/supabase';
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exchangeReward } from "@/lib/rewards";
import { ExchangeDialog } from "./exchange-dialog";
import type { Reward } from "@/types/rewards";

interface RewardCardProps extends Reward {
  userPoints: number;
  onExchange: () => void;
}

export function RewardCard({
  id,
  title,
  description,
  points,
  category,
  stock,
  userPoints,
  onExchange,
}: RewardCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const { toast } = useToast();

  const handleExchange = async () => {
    try {
      setIsExchanging(true);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "エラー",
          description: "特典を交換するにはログインが必要です",
          variant: "destructive",
        });
        return;
      }

      if (!canExchange) {
        toast({
          title: "エラー",
          description: "ポイントが不足しているか、在庫切れです",
          variant: "destructive",
        });
        return;
      }

      const { error } = await exchangeReward(id);
      
      if (error) {
        console.error('Reward exchange error:', error);
        throw error;
      }

      toast({
        title: "交換完了",
        description: `${title}との交換が完了しました`,
      });
      
      setShowDialog(false);
      onExchange();
    } catch (error) {
      console.error('Error in handleExchange:', error);
      toast({
        title: "エラー",
        description: error instanceof Error 
          ? error.message 
          : "特典の交換処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsExchanging(false);
    }
  };

  const canExchange = userPoints >= points && stock > 0;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Badge variant={canExchange ? "default" : "secondary"}>
              {category}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-yellow-500">
              <Star className="h-4 w-4" />
              <span className="font-bold">{points.toLocaleString()} pt</span>
            </div>
            <div className="text-sm text-muted-foreground">
              残り{stock}個
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => setShowDialog(true)}
            disabled={!canExchange}
          >
            <Gift className="h-4 w-4 mr-2" />
            {canExchange ? "ポイントと交換" : "ポイント不足"}
          </Button>
        </div>
      </Card>

      <ExchangeDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title={title}
        points={points}
        onConfirm={handleExchange}
        isExchanging={isExchanging}
      />
    </>
  );
}