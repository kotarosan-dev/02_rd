"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRewardHistory } from "@/lib/rewards";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { RewardExchange } from "@/types/rewards";

export default function RewardHistoryPage() {
  const [history, setHistory] = useState<RewardExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getRewardHistory();
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "エラー",
        description: "履歴の読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">特典交換履歴</h1>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          交換履歴はありません
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((exchange) => (
            <Card key={exchange.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold">{exchange.rewards.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {exchange.rewards.description}
                  </p>
                </div>
                <Badge variant="outline">{exchange.rewards.category}</Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="h-4 w-4" />
                  <span>{exchange.rewards.points.toLocaleString()} pt</span>
                </div>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(exchange.created_at), {
                    addSuffix: true,
                    locale: ja,
                  })}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}