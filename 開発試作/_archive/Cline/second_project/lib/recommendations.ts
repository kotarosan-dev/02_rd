import { supabase } from './supabase';
import type { RewardRecommendation } from '@/types/rewards';

interface CategoryPreference {
  [key: string]: number;
}

type CategoryEntry = [string, number];

interface PopularReward {
  rewards: {
    id: number;
    title: string;
    description: string;
    points: number;
    category: string;
    stock: number;
    created_at: string;
  };
  count: number;
}

export async function getRewardRecommendations(userId: string): Promise<{ data: RewardRecommendation[] | null, error: Error | null }> {
  try {
    if (!supabase) {
      throw new Error('Supabaseクライアントの初期化に失敗しました');
    }

    // ユーザーの過去の交換履歴を取得
    const { data: history, error: historyError } = await supabase
      .from('reward_exchanges')
      .select(`
        *,
        rewards (
          id,
          title,
          description,
          points,
          category,
          stock
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (historyError) throw historyError;

    // ユーザーの目標達成履歴を取得
    const { data: achievements, error: achievementsError } = await supabase
      .from('goal_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('achievement_date', { ascending: false });

    if (achievementsError) throw achievementsError;

    // ユーザーの獲得ポイントを取得
    const { data: pointsData, error: pointsError } = await supabase
      .from('goal_achievements')
      .select('points')
      .eq('user_id', userId);

    if (pointsError) throw pointsError;

    const totalPoints = pointsData?.reduce((sum, record) => sum + record.points, 0) || 0;

    // お気に入りカテゴリーを分析
    const categoryPreferences = history?.reduce((acc, exchange) => {
      const category = exchange.rewards.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as CategoryPreference);

    const entries = Object.entries(categoryPreferences || {}) as CategoryEntry[];
    const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
    const favoriteCategories = sortedEntries.map(([category]) => category);

    // 全特典を取得
    const { data: allRewards, error: rewardsError } = await supabase
      .from('rewards')
      .select('*')
      .gt('stock', 0)
      .order('points', { ascending: true });

    if (rewardsError) throw rewardsError;

    // レコメンデーション生成
    const recommendations: RewardRecommendation[] = [];

    // 1. 予算内のおすすめ（お気に入りカテゴリー優先）
    const budgetRecommendations = allRewards
      ?.filter(reward => reward.points <= totalPoints)
      .sort((a, b) => {
        const aCategoryIndex = favoriteCategories.indexOf(a.category);
        const bCategoryIndex = favoriteCategories.indexOf(b.category);
        if (aCategoryIndex === bCategoryIndex) {
          return b.points - a.points; // より高額な特典を優先
        }
        return aCategoryIndex - bCategoryIndex;
      })
      .slice(0, 3)
      .map(reward => ({
        ...reward,
        created_at: new Date().toISOString(),
        reason: 'あなたの利用可能ポイント内でおすすめの特典です'
      }));

    recommendations.push(...(budgetRecommendations || []));

    // 2. 人気の特典
    const { data: popularRewards, error: popularError } = await supabase
      .from('reward_exchanges')
      .select(`
        rewards (
          id,
          title,
          description,
          points,
          category,
          stock,
          created_at
        ),
        count
      `)
      .gt('rewards.stock', 0)
      .not('reward_id', 'in', `(${recommendations.map(r => r.id).join(',')})`)
      .order('count', { ascending: false })
      .limit(2);

    if (!popularError && popularRewards) {
      const popularRecommendations: RewardRecommendation[] = (popularRewards as unknown as PopularReward[]).map(({ rewards }) => ({
        id: rewards.id,
        title: rewards.title,
        description: rewards.description,
        points: rewards.points,
        category: rewards.category,
        stock: rewards.stock,
        created_at: rewards.created_at,
        reason: '多くのユーザーに選ばれている人気の特典です'
      }));
      recommendations.push(...popularRecommendations);
    }

    // 3. 目標達成パターンに基づくレコメンド
    const recentAchievements = achievements?.slice(0, 5) || [];
    const achievementCategories = recentAchievements.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    type CategoryCount = [string, number];
    const achievementEntries = Object.entries(achievementCategories) as CategoryCount[];
    const topAchievementCategory = achievementEntries
      .sort((a, b) => b[1] - a[1])
      .map(([category]) => category)[0];

    if (topAchievementCategory) {
      const { data: categoryRewards } = await supabase
        .from('rewards')
        .select('*')
        .eq('category', topAchievementCategory)
        .gt('stock', 0)
        .not('id', 'in', `(${recommendations.map(r => r.id).join(',')})`)
        .limit(1);

      if (categoryRewards?.[0]) {
        recommendations.push({
          ...categoryRewards[0],
          reason: `${topAchievementCategory}カテゴリーでの目標達成が多いあなたにおすすめです`
        });
      }
    }

    return { data: recommendations, error: null };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return { data: null, error: error as Error };
  }
}