import supabase from './supabase';

export async function subscribeToPlan(userId: string, plan: string) {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: userId,
          plan_name: plan,
          status: 'active'
        }
      ]);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('サブスクリプションエラー:', error);
    return { data: null, error };
  }
}