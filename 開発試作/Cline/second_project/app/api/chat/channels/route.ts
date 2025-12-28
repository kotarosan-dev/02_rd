import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    // 管理者権限の確認
    await requireAdmin();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // チーザーが管理者でないことを確認
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (userProfile?.role === 'admin') {
      return NextResponse.json({ error: 'Cannot analyze admin users' }, { status: 400 });
    }

    // チャンネル一覧を取得（ビューを使用）
    const { data: channels, error } = await supabase
      .from('chat_channels_with_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // チャンネル情報をフォーマット
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      lastMessage: channel.last_message || '',
      type: channel.channel_type,
      lastMessageAt: channel.last_message_at,
      userName: channel.full_name || '名称未設定',
      userEmail: channel.email || '',
    }));

    return NextResponse.json({ channels: formattedChannels });
  } catch (error) {
    console.error('Error in channels API:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 