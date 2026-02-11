// ユーザー基本情報の型定義
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
}

// プロフィール情報の型定義
export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role: string;
}

// 通知の型定義
export interface Notification {
  id: number;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'achievement' | 'milestone';
  goal_id?: number;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  actor_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
} 