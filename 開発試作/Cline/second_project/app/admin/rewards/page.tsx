"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RewardTable } from "@/components/admin/rewards/reward-table";
import { RewardDialog } from "@/components/admin/rewards/reward-dialog";
import { useToast } from "@/hooks/use-toast";
import { getRewards } from "@/lib/rewards";
import type { Reward } from "@/types/rewards";

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const { toast } = useToast();

  const loadRewards = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getRewards();
      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error("Error loading rewards:", error);
      toast({
        title: "エラー",
        description: "特典データの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowDialog(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">特典管理</h1>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新規特典を追加
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : (
        <RewardTable
          rewards={rewards}
          onEdit={handleEdit}
          onRewardUpdated={loadRewards}
        />
      )}

      <RewardDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) setEditingReward(null);
        }}
        reward={editingReward}
        onRewardSaved={loadRewards}
      />
    </div>
  );
}