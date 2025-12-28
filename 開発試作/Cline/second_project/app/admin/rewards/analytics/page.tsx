"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RewardUsageChart } from "@/components/admin/rewards/analytics/reward-usage-chart";
import { CategoryDistribution } from "@/components/admin/rewards/analytics/category-distribution";
import { PopularRewards } from "@/components/admin/rewards/analytics/popular-rewards";
import { SeasonalTrends } from "@/components/admin/rewards/analytics/seasonal-trends";
import { SeasonalPopularity } from "@/components/admin/rewards/analytics/seasonal-popularity";
import { PointTrends } from "@/components/admin/rewards/analytics/point-trends";
import { PointPatterns } from "@/components/admin/rewards/analytics/point-patterns";
import { CategoryPoints } from "@/components/admin/rewards/analytics/category-points";
import { CohortAnalysis } from "@/components/admin/rewards/analytics/cohort-analysis";
import { UserSegments } from "@/components/admin/rewards/analytics/user-segments";
import { getRewardAnalytics } from "@/lib/rewards";
import { getSeasonalAnalytics, getPointAnalytics, getCohortAnalytics, getUserSegmentAnalytics } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import type { RewardAnalytics } from "@/types/rewards";
import type { SeasonalAnalytics, PointAnalytics, CohortAnalytics, UserSegmentAnalytics } from "@/types/analytics";

// データを型安全に変換する関数を追加
const transformAnalyticsData = (data: any): RewardAnalytics => {
  return {
    totalExchanges: data.totalExchanges,
    totalPointsUsed: Number(data.totalPointsUsed), // anyからnumberに変換
    activeUsers: data.activeUsers,
    usageHistory: data.usageHistory,
    categoryDistribution: data.categoryDistribution,
    popularRewards: data.popularRewards.map((reward: any) => ({
      id: Number(reward.id),
      title: String(reward.title),
      category: String(reward.category),
      points: Number(reward.points),
      exchangeCount: Number(reward.exchangeCount)
    }))
  };
};

export default function RewardAnalyticsPage() {
  const [analytics, setAnalytics] = useState<RewardAnalytics | null>(null);
  const [seasonalAnalytics, setSeasonalAnalytics] = useState<SeasonalAnalytics | null>(null);
  const [pointAnalytics, setPointAnalytics] = useState<PointAnalytics | null>(null);
  const [cohortAnalytics, setCohortAnalytics] = useState<CohortAnalytics | null>(null);
  const [segmentAnalytics, setSegmentAnalytics] = useState<UserSegmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const [
          { data, error },
          { data: seasonalData, error: seasonalError },
          { data: pointData, error: pointError },
          { data: cohortData, error: cohortError },
          { data: segmentData, error: segmentError }
        ] = await Promise.all([
          getRewardAnalytics(),
          getSeasonalAnalytics(),
          getPointAnalytics(),
          getCohortAnalytics(),
          getUserSegmentAnalytics()
        ]);

        if (error) throw error;
        if (seasonalError) throw seasonalError;
        if (pointError) throw pointError;
        if (cohortError) throw cohortError;
        if (segmentError) throw segmentError;

        // データを変換してから設定
        setAnalytics(data ? transformAnalyticsData(data) : null);
        setSeasonalAnalytics(seasonalData);
        setPointAnalytics(pointData);
        setCohortAnalytics(cohortData);
        setSegmentAnalytics(segmentData);
      } catch (error) {
        toast({
          title: "エラー",
          description: "分析データの読み込みに失敗しました",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [toast]); // toastを依存配列に追加

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!analytics) {
    return <div className="text-center py-8">データを読み込めませんでした</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">特典分析</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">総交換回数</h3>
          <p className="text-3xl font-bold">{analytics.totalExchanges.toLocaleString()}</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">交換済みポイント</h3>
          <p className="text-3xl font-bold">{analytics.totalPointsUsed.toLocaleString()} pt</p>
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-2">アクティブユーザー</h3>
          <p className="text-3xl font-bold">{analytics.activeUsers.toLocaleString()}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">交換数推移</h3>
          <RewardUsageChart data={analytics.usageHistory} />
        </Card>
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">カテゴリー別分布</h3>
          <CategoryDistribution data={analytics.categoryDistribution} />
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">人気特典ランキング</h3>
        <PopularRewards rewards={analytics.popularRewards} />
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">季節性トレンド</h3>
        {seasonalAnalytics && <SeasonalTrends data={seasonalAnalytics.categoryTrends} />}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">季節別人気カテゴリー</h3>
        {seasonalAnalytics && <SeasonalPopularity data={seasonalAnalytics.seasonalPopularity} />}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ポイント獲得・使用トレンド</h3>
        {pointAnalytics && <PointTrends data={pointAnalytics.monthlyData} />}
      </Card>

      {pointAnalytics && (
        <CategoryPoints
          earnedByCategory={pointAnalytics.earnedByCategory}
          usedByCategory={pointAnalytics.usedByCategory}
        />
      )}

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">時間帯別パターン分析</h3>
        {pointAnalytics && (
          <PointPatterns
            achievementPatterns={pointAnalytics.achievementPatterns}
            exchangePatterns={pointAnalytics.exchangePatterns}
          />
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">コホート分析</h3>
        {cohortAnalytics && <CohortAnalysis data={cohortAnalytics} />}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">ユーザーセグメント分析</h3>
        {segmentAnalytics && <UserSegments data={segmentAnalytics} />}
      </Card>
    </div>
  );
}