import { supabase } from './supabase';
import type { Reward } from '@/types/rewards';

// Add null check helper at the beginning
const checkSupabaseClient = () => {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  return supabase;
};

export async function getRewards() {
  try {
    const client = checkSupabaseClient();
    // Check authentication first
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { data: [], error: new Error('認証が必要です') };
    }

    const { data, error } = await client
      .from('rewards')
      .select('*')
      .gt('stock', 0)
      .order('points', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return { data: [], error };
    }

    return { data: data as Reward[], error: null };
  } catch (error) {
    console.error('Error fetching rewards:', error);
    return { 
      data: [], 
      error: error instanceof Error ? error : new Error('特典の取得に失敗しました') 
    };
  }
}

export async function getAvailablePoints() {
  try {
    const client = checkSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { data: 0, error: new Error('認証が必要です') };
    }

    const { data, error } = await client
      .from('goal_achievements')
      .select('points')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching achievements:', error);
      return { data: 0, error };
    }

    // 使用済みポイントを取得
    const { data: usedPoints, error: usedError } = await client
      .from('reward_exchanges')
      .select('rewards(points)')
      .eq('user_id', user.id);

    if (usedError) {
      console.error('Error fetching used points:', usedError);
      return { data: 0, error: usedError };
    }

    const totalPoints = data?.reduce((acc, curr) => acc + curr.points, 0) || 0;
    const totalUsed = usedPoints?.reduce((acc, curr) => acc + (curr.rewards[0]?.points || 0), 0) || 0;

    return { data: totalPoints - totalUsed, error: null };
  } catch (error) {
    console.error('Error fetching available points:', error);
    return { data: 0, error };
  }
}

export async function exchangeReward(rewardId: number) {
  try {
    const client = checkSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // 特典の情報を取得
    const { data: reward, error: rewardError } = await client
      .from('rewards')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (rewardError) throw rewardError;
    if (!reward) throw new Error('特典が見つかりません');
    if (reward.stock <= 0) throw new Error('在庫切れです');

    // 利用可能ポイントを確認
    const { data: availablePoints, error: pointsError } = await getAvailablePoints();
    if (pointsError) throw pointsError;
    if (!availablePoints || availablePoints < reward.points) {
      throw new Error('ポイントが不足しています');
    }

    // 特典交換を記録
    const { error: exchangeError } = await client
      .from('reward_exchanges')
      .insert({
        user_id: user.id,
        reward_id: rewardId,
      });

    if (exchangeError) throw exchangeError;

    // 在庫を減らす
    const { error: updateError } = await client
      .from('rewards')
      .update({ stock: reward.stock - 1 })
      .eq('id', rewardId);

    if (updateError) throw updateError;

    return { error: null };
  } catch (error) {
    console.error('Error exchanging reward:', error);
    return { error };
  }
}

export async function createReward(data: Omit<Reward, 'id' | 'created_at'>) {
  try {
    const client = checkSupabaseClient();
    // Check if user is admin
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');

    const { error } = await client
      .from('rewards')
      .insert(data);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error creating reward:', error);
    return { error };
  }
}

export async function updateReward(
  id: number,
  data: Partial<Omit<Reward, 'id' | 'created_at'>>
) {
  try {
    const client = checkSupabaseClient();
    // Check if user is admin
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');

    const { error } = await client
      .from('rewards')
      .update(data)
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating reward:', error);
    return { error };
  }
}

export async function deleteReward(id: number) {
  try {
    const client = checkSupabaseClient();
    // Check if user is admin
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');

    const { error } = await client
      .from('rewards')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting reward:', error);
    return { error };
  }
}

export async function getRewardHistory() {
  try {
    const client = checkSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    const { data, error } = await client
      .from('reward_exchanges')
      .select(`
        *,
        reward:rewards (
          id,
          title,
          description,
          points,
          category
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching reward history:', error);
    return { data: null, error };
  }
}

export async function getRewardAnalytics() {
  try {
    const client = checkSupabaseClient();
    const { data: exchanges, error: exchangesError } = await client
      .from('reward_exchanges')
      .select(`
        *,
        rewards (
          id,
          title,
          category,
          points
        )
      `);

    if (exchangesError) throw exchangesError;

    // 総交換回数
    const totalExchanges = exchanges.length;

    // 総ポイント使用量
    const totalPointsUsed = exchanges.reduce((sum, exchange) => 
      sum + exchange.rewards.points, 0);

    // アクティブユーザー数（過去30日間で特典を交換したユニークユーザー数）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = new Set(
      exchanges
        .filter(e => new Date(e.created_at) >= thirtyDaysAgo)
        .map(e => e.user_id)
    ).size;

    // 日付別交換数
    const usageHistory = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        exchanges: exchanges.filter(e => 
          e.created_at.split('T')[0] === dateStr
        ).length
      };
    }).reverse();

    // カテゴリー別分布
    const categoryDistribution = Object.entries(
      exchanges.reduce((acc, exchange) => {
        const category = exchange.rewards.category;
        acc[category] = Number(acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([category, count]) => ({
      category,
      count: Number(count)
    }));

    // 人気特典ランキング
    interface PopularReward {
      id: number;
      title: string;
      category: string;
      points: number;
      exchangeCount: number;
    }

    const popularRewards = (Object.values(
      exchanges.reduce((acc, exchange) => {
        const reward = exchange.rewards;
        if (!acc[reward.id]) {
          acc[reward.id] = {
            id: reward.id,
            title: reward.title,
            category: reward.category,
            points: reward.points,
            exchangeCount: 0
          };
        }
        acc[reward.id].exchangeCount = Number(acc[reward.id].exchangeCount) + 1;
        return acc;
      }, {} as Record<string, PopularReward>)
    ) as PopularReward[]).sort((a, b) => b.exchangeCount - a.exchangeCount)
    .slice(0, 10);

    return {
      data: {
        totalExchanges,
        totalPointsUsed,
        activeUsers,
        usageHistory,
        categoryDistribution,
        popularRewards
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating reward analytics:', error);
    return { data: null, error };
  }
}