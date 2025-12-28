import supabase from '@/lib/supabase';
import type { Goal } from '@/types/goal';

interface CreateGoalParams {
  title: string;
  description: string;
  category: string;
  type: 'daily' | 'weekly' | 'monthly';
  target_value: number;
  end_date: string;
  status: 'active' | 'completed' | 'failed';
}

export async function createGoal(params: CreateGoalParams): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      ...params,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateGoal(id: number, updates: Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('認証が必要です');
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteGoal(id: number) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('認証が必要です');
  }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function getGoalProgress(goalId: number) {
  const { data, error } = await supabase
    .from('goal_progress')
    .select('*')
    .eq('goal_id', goalId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return { data };
}

export async function updateGoalProgress(
  goalId: number,
  progress: number,
  note?: string
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  // goal_progressテーブルに新しいレコードを追加
  const { data: progressData, error: progressError } = await supabase
    .from('goal_progress')
    .insert({
      goal_id: goalId,
      user_id: user.id,
      progress,
      note
    })
    .select()
    .single();

  if (progressError) throw progressError;

  // goalsテーブルの更新
  const { error: goalError } = await supabase
    .from('goals')
    .update({
      current_value: progress,
      updated_at: new Date().toISOString()
    })
    .eq('id', goalId)
    .eq('user_id', user.id);

  if (goalError) throw goalError;

  return progressData;
}

export async function getLatestProgress(goalId: number) {
  // まずgoalsテーブルから目標の情報を取得
  const { data: goal, error: goalError } = await supabase
    .from('goals')
    .select('current_value, target_value')
    .eq('id', goalId)
    .single();

  if (goalError) throw goalError;
  if (!goal) return null;

  // 最新の進捗記録を取得
  const { data: progressData, error: progressError } = await supabase
    .from('goal_progress')
    .select('progress, recorded_at')
    .eq('goal_id', goalId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  // 進捗記録がない場合は、goalsテーブルの値から計算
  if (progressError && progressError.code === 'PGRST116') {
    return {
      progress: goal.current_value,
      recorded_at: new Date()
    };
  }

  if (progressError) throw progressError;

  return progressData;
}

export async function getGoalLikes(goalId: number) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { data: { totalClaps: 0, userClaps: 0 } };
    }

    // まず現在のユーザーのいいねを取得
    const { data: userLike, error: userError } = await supabase
      .from('goal_likes')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user likes:', userError);
      throw userError;
    }

    // 全てのいいねを取得
    const { data: allLikes, error: likesError } = await supabase
      .from('goal_likes')
      .select('*')
      .eq('goal_id', goalId);

    if (likesError) {
      console.error('Error fetching all likes:', likesError);
      throw likesError;
    }

    const userClaps = userLike?.clap_number || 0;
    const totalClaps = allLikes?.reduce((sum, row) => sum + (row.clap_number || 0), 0) || 0;

    return { data: { totalClaps, userClaps } };
  } catch (error) {
    console.error('Error in getGoalLikes:', error);
    return { data: { totalClaps: 0, userClaps: 0 } };
  }
}

export async function toggleGoalLike(goalId: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // upsertを使用して重複を防ぐ
    const { data, error } = await supabase
      .from('goal_likes')
      .upsert(
        {
          goal_id: goalId,
          user_id: user.id,
          clap_number: 1
        },
        {
          onConflict: 'goal_id,user_id',
          ignoreDuplicates: false
        }
      )
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') {
        // 既に存在する場合は削除
        const { error: deleteError } = await supabase
          .from('goal_likes')
          .delete()
          .eq('goal_id', goalId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
      } else {
        throw error;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error toggling goal like:', error);
    throw error;
  }
}

export async function incrementClap(goalId: number) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('ログインが必要です');
    }

    const { data: existingLike, error: fetchError } = await supabase
      .from('goal_likes')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    const currentClaps = existingLike?.clap_number || 0;
    if (currentClaps >= 10) {
      throw new Error('最大応援数に達しています');
    }

    if (!existingLike) {
      const { error: insertError } = await supabase
        .from('goal_likes')
        .insert([
          { goal_id: goalId, user_id: session.user.id, clap_number: 1 }
        ])
        .select()
        .single();

      if (insertError) throw insertError;
    } else {
      const { error: updateError } = await supabase
        .from('goal_likes')
        .update({ clap_number: currentClaps + 1 })
        .eq('goal_id', goalId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (updateError) throw updateError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error in incrementClap:', error);
    throw error;
  }
}