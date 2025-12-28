"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRewardRecommendations } from "@/lib/recommendations";
import { exchangeReward } from "@/lib/rewards";
import { ExchangeDialog } from "./exchange-dialog";
import supabase from "@/lib/supabase";
import type { RewardRecommendation } from "@/types/rewards";

export function RewardRecommendations() {
  const [recommendations, setRecommendations] = useState<RewardRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState<RewardRecommendation | null>(null);
  const [isExchanging, setIsExchanging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await getRewardRecommendations(user.id);
        if (error) throw error;
        setRecommendations(data || []);
      } catch (error) {
        toast({
          title: "エラー",
          description: "おすすめ特典の読み込みに失敗しました",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [toast]);

  const handleExchange = async () => {
    if (!selectedReward) return;

    try {
      setIsExchanging(true);
      const { error } = await exchangeReward(selectedReward.id);
      
      if (error) throw error;

      toast({
        title: "交換完了",
        description: "特典との交換が完了しました",
      });
      
      setSelectedReward(null);
      // 特典リストを再読み込み
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await getRewardRecommendations(user.id);
        if (data) setRecommendations(data);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "特典の交換に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsExchanging(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (recommendations.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        現在おすすめの特典はありません
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">あなたにおすすめの特典</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map((reward) => (
          <Card key={reward.id} className="overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{reward.title}</h3>
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                </div>
                <Badge variant="outline">{reward.category}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-4 w-4" />
                  <span className="font-bold">{reward.points.toLocaleString()} pt</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  残り{reward.stock}個
                </div>
              </div>

              <p className="text-sm text-muted-foreground italic">
                {reward.reason}
              </p>

              <Button
                className="w-full"
                onClick={() => setSelectedReward(reward)}
              >
                <Gift className="h-4 w-4 mr-2" />
                ポイントと交換
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ExchangeDialog
        open={!!selectedReward}
        onOpenChange={(open) => !open && setSelectedReward(null)}
        title={selectedReward?.title || ""}
        points={selectedReward?.points || 0}
        onConfirm={handleExchange}
        isExchanging={isExchanging}
      />
    </div>
  );
}