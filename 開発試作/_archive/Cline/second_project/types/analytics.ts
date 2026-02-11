export interface SeasonalAnalytics {
  monthlyData: {
    month: string;
    total: number;
    categories: Record<string, number>;
  }[];
  categoryTrends: {
    category: string;
    counts: number[];
    peak: number;
    low: number;
  }[];
  seasonalPopularity: Record<string, {
    category: string;
    count: number;
  }[]>;
}

export interface PointAnalytics {
  monthlyData: {
    month: string;
    earned: number;
    used: number;
    balance: number;
  }[];
  earnedByCategory: {
    category: string;
    points: number;
  }[];
  usedByCategory: {
    category: string;
    points: number;
  }[];
  achievementPatterns: number[];
  exchangePatterns: number[];
  totalEarned: number;
  totalUsed: number;
}

export interface CohortAnalytics {
  cohorts: {
    cohort: string;
    totalUsers: number;
    monthlyActivity: {
      month: number;
      activeUsers: number;
      achievements: number;
      earnedPoints: number;
      exchanges: number;
      usedPoints: number;
      retentionRate: number;
    }[];
  }[];
  summary: {
    totalCohorts: number;
    averageRetention: number;
    bestRetentionCohort: {
      cohort: string;
      retentionRate: number;
    };
    averageLifetimeValue: number;
  };
}

export interface UserSegmentAnalytics {
  currentSegments: {
    segment: string;
    userCount: number;
    averagePoints: number;
    averageAchievements: number;
    averageExchanges: number;
    categoryDiversity: number;
  }[];
  segmentTrends: {
    month: string;
    vip: number;
    active: number;
    moderate: number;
    risk: number;
    inactive: number;
  }[];
}