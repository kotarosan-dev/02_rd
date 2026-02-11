export interface Goal {
  id: number;
  user_id: string;
  title: string;
  description?: string;
  target_value: number;
  current_value: number;
  type: 'daily' | 'weekly' | 'monthly';
  category: string;
  status: 'active' | 'completed' | 'failed';
  start_date: string;
  end_date: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

export interface GoalComment {
  id: number;
  goal_id: number;
  user_id: string;
  content: string;
  type: 'achievement' | 'advice' | 'diary' | 'admin_feedback';
  image_url?: string;
  effort_points?: string;
  challenges_faced?: string;
  personal_growth?: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
    role?: string;
  };
}

export interface GoalProgress {
  id: number;
  goal_id: number;
  user_id: string;
  progress: number;
  recorded_at: string;
  note?: string;
}

export interface GoalWithProgress extends Goal {
  progress: GoalProgress[];
  comments: GoalComment[];
} 