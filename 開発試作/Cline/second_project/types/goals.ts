export interface GoalProgress {
  id: number;
  goal_id: number;
  progress: number;
  note?: string;
  recorded_at: Date | string;
  created_at: Date | string;
} 