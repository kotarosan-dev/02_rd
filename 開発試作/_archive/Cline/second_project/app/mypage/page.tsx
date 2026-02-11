import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { MyPageClient } from '@/app/mypage/mypage-client';
import type { GoalWithProgress } from '@/types/goal';
import { redirect } from 'next/navigation';

// キャッシュ時間を5分に設定
export const revalidate = 300;

export default async function MyPage() {
  const supabase = createServerComponentClient({ cookies });
  
  try {
    // 並列でデータを取得
    const [authResponse, goalsResponse] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('goals')
        .select(`
          *,
          progress: goal_progress(
            id,
            progress,
            recorded_at,
            note
          ),
          comments: goal_comments(
            id,
            content,
            type,
            created_at,
            profiles(username, avatar_url)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    const user = authResponse.data.user;

    if (!user || authResponse.error) {
      redirect('/auth');
    }

    // ゴールデータのフィルタリング
    const goals = goalsResponse.data?.filter(goal => goal.user_id === user.id) || [];

    if (goalsResponse.error) {
      throw goalsResponse.error;
    }

    return <MyPageClient goals={goals as GoalWithProgress[]} userId={user.id} />;

  } catch (error) {
    console.error('データ取得エラー:', error);
    return <div className="p-4">データの取得に失敗しました。しばらく時間をおいて再度お試しください。</div>;
  }
}