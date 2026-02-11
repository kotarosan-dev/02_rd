export interface Reward {
  id: number;
  title: string;
  description: string;
  points: number;
  category: string;
  stock: number;
  created_at: string;
}

export interface RewardExchange {
  id: number;
  user_id: string;
  reward_id: number;
  created_at: string;
  rewards: Reward;
}

export interface RewardAnalytics {
  totalExchanges: number;
  totalPointsUsed: number;
  activeUsers: number;
  usageHistory: {
    date: string;
    exchanges: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
  }[];
  popularRewards: {
    id: number;
    title: string;
    category: string;
    points: number;
    exchangeCount: number;
  }[];
}

export interface RewardRecommendation extends Reward {
  reason: string;
}