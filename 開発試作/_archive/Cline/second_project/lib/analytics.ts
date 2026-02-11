import { supabase } from './supabase';
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { SeasonalAnalytics, PointAnalytics, CohortAnalytics, UserSegmentAnalytics } from '@/types/analytics';

interface RewardExchange {
  created_at: string;
  user_id: string;
  rewards: {
    id: number;
    title: string;
    category: string;
    points: number;
  }[];
}

interface SingleReward {
  id: number;
  title: string;
  category: string;
  points: number;
}

interface GoalAchievement {
  points: number;
  achievement_date: string;
  goals: {
    category: string;
  }[];
}

interface MonthlyActivity {
  month: string;
  activeUsers: number;
  exchanges: number;
  usedPoints: number;
}

interface UserStats {
  totalAchievements: number;
  totalPoints: number;
  totalExchanges: number;
  usedPoints: number;
  categories: Set<string>;
  lastActivity: Date;
  firstActivity: Date;
  monthlyActivity?: MonthlyActivity[];
}

interface CohortActivity {
  month: number;
  activeUsers: number;
  achievements: number;
  earnedPoints: number;
  exchanges: number;
  usedPoints: number;
  retentionRate?: number;
}

interface CohortData {
  cohort: string;
  totalUsers: number;
  monthlyActivity: CohortActivity[];
}

export async function getSeasonalAnalytics(): Promise<{ data: SeasonalAnalytics | null, error: Error | null }> {
  try {
    // 過去12ヶ月のデータを取得
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    const { data: exchanges, error: exchangesError } = await supabase
      .from('reward_exchanges')
      .select(`
        created_at,
        user_id,
        rewards (
          id,
          title,
          category,
          points
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (exchangesError) throw exchangesError;

    // 月別の交換データを集計
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthExchanges = (exchanges as RewardExchange[] | null)?.filter(exchange => {
        const exchangeDate = new Date(exchange.created_at);
        return exchangeDate >= monthStart && exchangeDate <= monthEnd;
      });

      // カテゴリー別集計
      const categoryData = monthExchanges?.reduce((acc, exchange) => {
        const reward = exchange.rewards[0];
        if (reward) {
          const category = reward.category;
          acc[category] = (acc[category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      return {
        month: format(month, 'yyyy年M月', { locale: ja }),
        total: monthExchanges?.length || 0,
        categories: categoryData || {}
      };
    });

    // カテゴリー別の季節トレンド
    const categoryTrends = Object.entries(
      (exchanges as RewardExchange[] | null)?.reduce((acc, exchange) => {
        const reward = exchange.rewards[0];
        if (reward) {
          const category = reward.category;
          const month = format(new Date(exchange.created_at), 'M', { locale: ja });
          
          if (!acc[category]) {
            acc[category] = Array(12).fill(0);
          }
          acc[category][parseInt(month) - 1]++;
        }
        return acc;
      }, {} as Record<string, number[]>) || {}
    ).map(([category, counts]) => ({
      category,
      counts,
      peak: counts.indexOf(Math.max(...counts)) + 1,
      low: counts.indexOf(Math.min(...counts)) + 1
    }));

    // 季節ごとの人気カテゴリー
    const seasons = {
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      autumn: [9, 10, 11],
      winter: [12, 1, 2]
    };

    const seasonalPopularity = Object.entries(seasons).reduce((acc, [season, months]) => {
      const seasonExchanges = (exchanges as RewardExchange[] | null)?.filter(exchange => {
        const month = new Date(exchange.created_at).getMonth() + 1;
        return months.includes(month);
      });

      const categories = seasonExchanges?.reduce((catAcc, exchange) => {
        const reward = exchange.rewards[0];
        if (reward) {
          const category = reward.category;
          catAcc[category] = (catAcc[category] || 0) + 1;
        }
        return catAcc;
      }, {} as Record<string, number>);

      acc[season] = Object.entries(categories || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({
          category,
          count
        }));

      return acc;
    }, {} as Record<string, { category: string, count: number }[]>);

    return {
      data: {
        monthlyData,
        categoryTrends,
        seasonalPopularity
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating seasonal analytics:', error);
    return { data: null, error: error as Error };
  }
}

export async function getPointAnalytics(): Promise<{ data: PointAnalytics | null, error: Error | null }> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    // ポイント獲得データを取得
    const { data: achievements, error: achievementsError } = await supabase
      .from('goal_achievements')
      .select(`
        points,
        achievement_date,
        goals (
          category
        )
      `)
      .gte('achievement_date', startDate.toISOString())
      .lte('achievement_date', endDate.toISOString());

    if (achievementsError) throw achievementsError;

    // ポイント使用データを取得
    const { data: exchanges, error: exchangesError } = await supabase
      .from('reward_exchanges')
      .select(`
        created_at,
        rewards (
          points,
          category
        )
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (exchangesError) throw exchangesError;

    // 月別の獲得・使用データを集計
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyData = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthAchievements = achievements?.filter(achievement => {
        const date = new Date(achievement.achievement_date);
        return date >= monthStart && date <= monthEnd;
      });

      const monthExchanges = exchanges?.filter(exchange => {
        const date = new Date(exchange.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      const earnedPoints = monthAchievements?.reduce((sum, achievement) => 
        sum + achievement.points, 0) || 0;

      const usedPoints = monthExchanges?.reduce((sum, exchange) => {
        const reward = exchange.rewards[0];
        return sum + (reward?.points || 0);
      }, 0) || 0;

      return {
        month: format(month, 'yyyy年M月', { locale: ja }),
        earned: earnedPoints,
        used: usedPoints,
        balance: earnedPoints - usedPoints
      };
    });

    // カテゴリー別の獲得ポイント
    const earnedByCategory = (achievements as GoalAchievement[] | null)?.reduce((acc, achievement) => {
      const goal = achievement.goals[0];
      if (goal) {
        const category = goal.category;
        acc[category] = (acc[category] || 0) + achievement.points;
      }
      return acc;
    }, {} as Record<string, number>);

    // カテゴリー別の使用ポイント
    const usedByCategory = exchanges?.reduce((acc, exchange) => {
      const reward = exchange.rewards[0];
      if (reward) {
        const category = reward.category;
        acc[category] = (acc[category] || 0) + reward.points;
      }
      return acc;
    }, {} as Record<string, number>);

    // ポイント獲得パターン分析
    const achievementPatterns = achievements?.reduce((acc, achievement) => {
      const hour = new Date(achievement.achievement_date).getHours();
      const timeSlot = Math.floor(hour / 6); // 6時間ごとの時間帯に分類
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, Array(4).fill(0));

    // ポイント使用パターン分析
    const exchangePatterns = exchanges?.reduce((acc, exchange) => {
      const hour = new Date(exchange.created_at).getHours();
      const timeSlot = Math.floor(hour / 6); // 6時間ごとの時間帯に分類
      acc[timeSlot] = (acc[timeSlot] || 0) + 1;
      return acc;
    }, Array(4).fill(0));

    return {
      data: {
        monthlyData,
        earnedByCategory: Object.entries(earnedByCategory || {})
          .map(([category, points]) => ({ category, points }))
          .sort((a, b) => b.points - a.points),
        usedByCategory: Object.entries(usedByCategory || {})
          .map(([category, points]) => ({ category, points }))
          .sort((a, b) => b.points - a.points),
        achievementPatterns: achievementPatterns || Array(4).fill(0),
        exchangePatterns: exchangePatterns || Array(4).fill(0),
        totalEarned: achievements?.reduce((sum, a) => sum + a.points, 0) || 0,
        totalUsed: exchanges?.reduce((sum, e) => {
          const reward = e.rewards[0];
          return sum + (reward?.points || 0);
        }, 0) || 0
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating point analytics:', error);
    return { data: null, error: error as Error };
  }
}

export async function getCohortAnalytics(): Promise<{ data: CohortAnalytics | null, error: Error | null }> {
  try {
    // ユーザーの初回目標達成日（コホートの開始日）を取得
    const { data: firstAchievements, error: firstAchievementsError } = await supabase
      .from('goal_achievements')
      .select('user_id, achievement_date')
      .order('achievement_date', { ascending: true });

    if (firstAchievementsError) throw firstAchievementsError;

    // ユーザーごとの初回達成月を記録
    const userFirstMonth: Record<string, string> = {};
    firstAchievements?.forEach(achievement => {
      if (!userFirstMonth[achievement.user_id]) {
        userFirstMonth[achievement.user_id] = format(
          new Date(achievement.achievement_date),
          'yyyy-MM'
        );
      }
    });

    // すべての目標達成データを取得
    const { data: allAchievements, error: allAchievementsError } = await supabase
      .from('goal_achievements')
      .select('user_id, achievement_date, points')
      .order('achievement_date', { ascending: true });

    if (allAchievementsError) throw allAchievementsError;

    // すべての特典交換データを取得
    const { data: allExchanges, error: allExchangesError } = await supabase
      .from('reward_exchanges')
      .select(`
        user_id,
        created_at,
        rewards (
          points
        )
      `)
      .order('created_at', { ascending: true });

    if (allExchangesError) throw allExchangesError;

    // コホートごとのデータを集計
    const cohorts = new Map<string, {
      totalUsers: number;
      monthlyActivity: Record<number, {
        activeUsers: number;
        achievements: number;
        earnedPoints: number;
        exchanges: number;
        usedPoints: number;
      }>;
    }>();

    // ユーザーごとの月別アクティビティを集計
    Object.entries(userFirstMonth).forEach(([userId, firstMonth]) => {
      if (!cohorts.has(firstMonth)) {
        cohorts.set(firstMonth, {
          totalUsers: 0,
          monthlyActivity: {},
        });
      }

      const cohort = cohorts.get(firstMonth)!;
      cohort.totalUsers++;

      // このユーザーの全アクティビティを月別に集計
      const userAchievements = allAchievements?.filter(a => a.user_id === userId) || [];
      const userExchanges = allExchanges?.filter(e => e.user_id === userId) || [];

      userAchievements.forEach(achievement => {
        const achievementMonth = format(new Date(achievement.achievement_date), 'yyyy-MM');
        const monthIndex = getMonthDiff(firstMonth, achievementMonth);

        if (!cohort.monthlyActivity[monthIndex]) {
          cohort.monthlyActivity[monthIndex] = {
            activeUsers: 0,
            achievements: 0,
            earnedPoints: 0,
            exchanges: 0,
            usedPoints: 0,
          };
        }

        const monthActivity = cohort.monthlyActivity[monthIndex];
        monthActivity.activeUsers = 1;
        monthActivity.achievements++;
        monthActivity.earnedPoints += achievement.points;
      });

      userExchanges.forEach(exchange => {
        const exchangeMonth = format(new Date(exchange.created_at), 'yyyy-MM');
        const monthIndex = getMonthDiff(firstMonth, exchangeMonth);

        if (!cohort.monthlyActivity[monthIndex]) {
          cohort.monthlyActivity[monthIndex] = {
            activeUsers: 0,
            achievements: 0,
            earnedPoints: 0,
            exchanges: 0,
            usedPoints: 0,
          };
        }

        const monthActivity = cohort.monthlyActivity[monthIndex];
        monthActivity.activeUsers = 1;
        monthActivity.exchanges++;
        const reward = (exchange as RewardExchange).rewards[0];
        if (reward) {
          monthActivity.usedPoints += reward.points;
        }
      });
    });

    // コホートデータを配列に変換
    const cohortData = Array.from(cohorts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        cohort: format(new Date(month + '-01'), 'yyyy年M月', { locale: ja }),
        totalUsers: data.totalUsers,
        monthlyActivity: Object.entries(data.monthlyActivity)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([month, activity]) => ({
            month: parseInt(month),
            ...activity,
            retentionRate: (activity.activeUsers / data.totalUsers) * 100,
          })),
      }));

    // コホート分析の概要統計を計算
    const summary = {
      totalCohorts: cohortData.length,
      averageRetention: calculateAverageRetention(cohortData),
      bestRetentionCohort: findBestRetentionCohort(cohortData),
      averageLifetimeValue: calculateAverageLifetimeValue(cohortData),
    };

    return {
      data: {
        cohorts: cohortData,
        summary
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating cohort analytics:', error);
    return { data: null, error: error as Error };
  }
}

export async function getUserSegmentAnalytics(): Promise<{ data: UserSegmentAnalytics | null, error: Error | null }> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // ユーザーの目標達成データを取得
    const { data: achievements, error: achievementsError } = await supabase
      .from('goal_achievements')
      .select(`
        user_id,
        points,
        achievement_date,
        goals (
          category
        )
      `);

    if (achievementsError) throw achievementsError;

    // ユーザーの特典交換データを取得
    const { data: exchanges, error: exchangesError } = await supabase
      .from('reward_exchanges')
      .select(`
        user_id,
        created_at,
        rewards (
          points,
          category
        )
      `);

    if (exchangesError) throw exchangesError;

    // ユーザーごとの集計データを作成
    const userStats = new Map<string, UserStats>();

    // 目標達成データの集計
    achievements?.forEach(achievement => {
      if (!userStats.has(achievement.user_id)) {
        userStats.set(achievement.user_id, {
          totalAchievements: 0,
          totalPoints: 0,
          totalExchanges: 0,
          usedPoints: 0,
          categories: new Set(),
          lastActivity: new Date(achievement.achievement_date),
          firstActivity: new Date(achievement.achievement_date),
          monthlyActivity: months.map(month => ({
            month: format(month, 'yyyy年M月', { locale: ja }),
            activeUsers: 0,
            exchanges: 0,
            usedPoints: 0
          }))
        });
      }

      const stats = userStats.get(achievement.user_id)!;
      stats.totalAchievements++;
      stats.totalPoints += achievement.points;
      const goal = achievement.goals[0];
      if (goal) {
        stats.categories.add(goal.category);
      }
      
      const achievementDate = new Date(achievement.achievement_date);
      if (achievementDate > stats.lastActivity) {
        stats.lastActivity = achievementDate;
      }
      if (achievementDate < stats.firstActivity) {
        stats.firstActivity = achievementDate;
      }
    });

    // 特典交換データの���計
    (exchanges as RewardExchange[] | null)?.forEach(exchange => {
      const userId = exchange.user_id;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          totalAchievements: 0,
          totalPoints: 0,
          totalExchanges: 0,
          usedPoints: 0,
          categories: new Set(),
          lastActivity: new Date(exchange.created_at),
          firstActivity: new Date(exchange.created_at),
          monthlyActivity: months.map(month => ({
            month: format(month, 'yyyy年M月', { locale: ja }),
            activeUsers: 0,
            exchanges: 0,
            usedPoints: 0
          }))
        });
      }

      const userStat = userStats.get(userId)!;
      userStat.totalExchanges++;
      const reward = exchange.rewards[0];
      if (reward) {
        userStat.usedPoints += reward.points;
      }

      const monthIndex = months.findIndex(month =>
        format(new Date(exchange.created_at), 'yyyy-MM') === format(month, 'yyyy-MM')
      );

      if (monthIndex !== -1 && userStat.monthlyActivity) {
        const monthActivity = userStat.monthlyActivity[monthIndex];
        monthActivity.activeUsers = 1;
        monthActivity.exchanges++;
        const reward = exchange.rewards[0];
        if (reward) {
          monthActivity.usedPoints += reward.points;
        }
      }
    });

    // セグメントの定義と分類
    const now = new Date();
    const segments = {
      vip: [] as string[],
      active: [] as string[],
      moderate: [] as string[],
      risk: [] as string[],
      inactive: [] as string[],
    };

    userStats.forEach((stats, userId) => {
      const daysSinceLastActivity = Math.floor(
        (now.getTime() - stats.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      const monthsSinceFirstActivity = Math.floor(
        (now.getTime() - stats.firstActivity.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      const pointBalance = stats.totalPoints - stats.usedPoints;
      const activityFrequency = monthsSinceFirstActivity > 0 
        ? stats.totalAchievements / monthsSinceFirstActivity 
        : stats.totalAchievements;

      if (
        stats.totalPoints >= 10000 &&
        stats.categories.size >= 3 &&
        daysSinceLastActivity <= 30
      ) {
        segments.vip.push(userId);
      } else if (
        daysSinceLastActivity <= 30 &&
        activityFrequency >= 2
      ) {
        segments.active.push(userId);
      } else if (
        daysSinceLastActivity <= 90 &&
        activityFrequency >= 1
      ) {
        segments.moderate.push(userId);
      } else if (
        daysSinceLastActivity <= 180 &&
        pointBalance > 0
      ) {
        segments.risk.push(userId);
      } else {
        segments.inactive.push(userId);
      }
    });

    // セグメントごとの統計情報を計算
    const segmentStats = Object.entries(segments).map(([segment, userIds]) => {
      const users = userIds.map(id => userStats.get(id)!);
      return {
        segment,
        userCount: users.length,
        averagePoints: Math.round(users.reduce((sum, user) => sum + user.totalPoints, 0) / users.length),
        averageAchievements: Math.round(users.reduce((sum, user) => sum + user.totalAchievements, 0) / users.length),
        averageExchanges: Math.round(users.reduce((sum, user) => sum + user.totalExchanges, 0) / users.length),
        categoryDiversity: Math.round(users.reduce((sum, user) => sum + user.categories.size, 0) / users.length),
        monthlyActivity: months.map((month, index) => ({
          month: format(month, 'yyyy年M月', { locale: ja }),
          activeUsers: users.filter(user => user.monthlyActivity && user.monthlyActivity[index]?.activeUsers > 0).length,
          exchanges: users.reduce((sum, user) => sum + (user.monthlyActivity && user.monthlyActivity[index]?.exchanges || 0), 0),
          usedPoints: users.reduce((sum, user) => sum + (user.monthlyActivity && user.monthlyActivity[index]?.usedPoints || 0), 0)
        }))
      };
    });

    // 時系列でのセグメント推移を計算
    const monthlySegments = Array.from({ length: 6 }, (_, i) => {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() - i);
      const monthKey = format(targetDate, 'yyyy-MM');
      
      return {
        month: format(targetDate, 'yyyy年M月', { locale: ja }),
        vip: 0,
        active: 0,
        moderate: 0,
        risk: 0,
        inactive: 0,
      };
    }).reverse();

    return {
      data: {
        currentSegments: segmentStats,
        segmentTrends: monthlySegments,
      },
      error: null
    };
  } catch (error) {
    console.error('Error generating user segment analytics:', error);
    return { data: null, error: error as Error };
  }
}

// 2つの日付文字列（YYYY-MM形式）の月差を計算
function getMonthDiff(from: string, to: string): number {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

// 平均リテンション率を計算
function calculateAverageRetention(cohorts: CohortData[]): number {
  const retentionRates = cohorts.flatMap(cohort =>
    cohort.monthlyActivity
      .filter(activity => activity.month === 1)
      .map(activity => activity.retentionRate || 0)
  );
  return retentionRates.reduce((sum, rate) => sum + rate, 0) / retentionRates.length;
}

// 最もリテンション率の高いコホートを特定
function findBestRetentionCohort(cohorts: CohortData[]): { cohort: string, retentionRate: number } {
  return cohorts.reduce((best, current) => {
    const currentRetention = current.monthlyActivity
      .find(activity => activity.month === 1)?.retentionRate || 0;
    if (currentRetention > best.retentionRate) {
      return { cohort: current.cohort, retentionRate: currentRetention };
    }
    return best;
  }, { cohort: '', retentionRate: 0 });
}

// 平均ライフタイムバリューを計算
function calculateAverageLifetimeValue(cohorts: CohortData[]): number {
  const lifetimeValues = cohorts.map(cohort => {
    const totalPoints = cohort.monthlyActivity.reduce(
      (sum, activity) => sum + activity.earnedPoints,
      0
    );
    return totalPoints / cohort.totalUsers;
  });
  return lifetimeValues.reduce((sum, value) => sum + value, 0) / lifetimeValues.length;
}