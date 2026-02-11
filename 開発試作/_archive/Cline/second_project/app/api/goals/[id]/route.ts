import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';
import type { Goal } from '@/types/goal';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return new NextResponse('認証が必要です', { status: 401 });
    }

    const body = await request.json();
    const updates = body as Partial<Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

    // 目標の所有者を確認
    const { data: goal, error: fetchError } = await supabase
      .from('goals')
      .select('user_id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    if (goal.user_id !== session.user.id) {
      return new NextResponse('権限がありません', { status: 403 });
    }

    // 目標を更新
    const { error: updateError } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', params.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('目標更新エラー:', error);
    return new NextResponse('目標の更新に失敗しました', { status: 500 });
  }
} 