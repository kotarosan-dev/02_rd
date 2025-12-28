import supabase from './supabase';
import type { ChatChannel, ChatMessage, AISuggestion, ChannelType } from '@/types/chat';
import { sendLineMessage } from './line';

interface ChatChannelResponse {
  id: string;
  user_id: string;
  channel_type: ChannelType;
  external_id: string | null;
  created_at: string;
  last_message_at: string | null;
  metadata: Record<string, unknown>;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ChatMessageResponse {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_from_user: boolean;
  created_at: string;
  metadata: Record<string, unknown>;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

// チッセージのマッピング関数を追加
function mapMessage(data: ChatMessageResponse): ChatMessage {
  return {
    id: data.id,
    channelId: data.channel_id,
    senderId: data.sender_id,
    content: data.content,
    messageType: data.message_type as "text" | "image" | "video",
    isFromUser: data.is_from_user,
    createdAt: new Date(data.created_at),
    metadata: data.metadata || {},
    sender: data.profiles ? {
      id: data.profiles.id,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
    } : undefined,
  };
}

// チャンネルのマッピング関数を追加
function mapChannel(data: ChatChannelResponse): ChatChannel {
  return {
    id: data.id,
    userId: data.user_id,
    channelType: data.channel_type,
    externalId: data.external_id,
    createdAt: new Date(data.created_at),
    lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : null,
    metadata: data.metadata,
    user: data.profiles ? {
      id: data.profiles.id,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
    } : undefined,
  };
}

// チャンネル一覧の取得
export async function getChannels(): Promise<ChatChannel[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('プロフィールが見つかりません');

  console.log('🔍 プロフィール情報:', {
    userId: user.id,
    role: profile.role
  });

  // 管理者の場合は全てのチャンネルを取得、ユーザーの場合は自分のチャンネルのみ取得
  const query = supabase
    .from('chat_channels_with_profiles')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (profile.role !== 'admin') {
    query.eq('user_id', user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ チャンネル取得エラー:', error);
    throw error;
  }

  console.log('📊 取得したチャンネル:', data);
  
  return data.map(mapChannel);
}

// チャンネルのメッセージ履歴取得
export async function getMessages(channelId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles!chat_messages_sender_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) throw error;
  return data.map(mapMessage);
}

// メッセージの送信
export async function sendMessage(channelId: string, content: string, messageType: 'text' | 'image' | 'video' = 'text'): Promise<ChatMessage> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  // チャンネル情報の取得
  const { data: channel } = await supabase
    .from('chat_channels')
    .select(`
      *,
      profiles!chat_channels_user_id_fkey (
        id,
        full_name,
        role
      )
    `)
    .eq('id', channelId)
    .maybeSingle();

  if (!channel) throw new Error('チャンネルが見つかりません');

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('プロフィールが見つかりません');

  // メッセージの送信者がチャンネルの所有者（ユーザー）かどうかを確認
  const isFromUser = profile.role === 'user';

  // メッセージの保存
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      channel_id: channelId,
      sender_id: profile.id,
      content,
      message_type: messageType,
      is_from_user: isFromUser,
      metadata: {
        read: false,
      },
    })
    .select(`
      *,
      profiles!chat_messages_sender_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  if (!data) throw new Error('メッセージの送信に失敗しました');

  // 最終メッセージ時刻を更新
  await supabase
    .from('chat_channels')
    .update({ 
      last_message_at: new Date().toISOString(),
      metadata: {
        ...channel.metadata,
        unread_count: ((channel.metadata?.unread_count || 0) + 1), // 未読カウントをmetadataに保存
      },
    })
    .eq('id', channelId);

  // LINEチャンネルの場合、LINEにメッセージを送信
  if (channel.channel_type === 'line' && channel.external_id) {
    const lineMessage = {
      type: messageType,
      ...(messageType === 'text' ? { text: content } : {}),
      ...(messageType === 'image' ? {
        originalContentUrl: content,
        previewImageUrl: content,
      } : {}),
      ...(messageType === 'video' ? {
        originalContentUrl: content,
        previewImageUrl: content.replace(/\.[^.]+$/, '.jpg'),
      } : {}),
    };

    console.log('Sending LINE message:', {
      to: channel.external_id,
      message: lineMessage,
    });

    await sendLineMessage(channel.external_id, [lineMessage]);
  }

  return mapMessage(data);
}

// メッセージを既読にする
export async function markMessagesAsRead(channelId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  // メッセージの既読状態を更新
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('channel_id', channelId)
    .eq('is_from_user', true)
    .eq('metadata->read', false);

  if (messages && messages.length > 0) {
    // 既読状態を更新
    await Promise.all(messages.map(async (message) => {
      await supabase
        .from('chat_messages')
        .update({
          metadata: {
            ...message.metadata,
            read: true,
            read_at: new Date().toISOString()
          }
        })
        .eq('id', message.id);
    }));

    // チャンネルの未読カウントをリセット
    const { data: channel } = await supabase
      .from('chat_channels')
      .select('metadata')
      .eq('id', channelId)
      .single();

    if (channel) {
      await supabase
        .from('chat_channels')
        .update({
          metadata: {
            ...channel.metadata,
            unread_count: 0
          }
        })
        .eq('id', channelId);
    }
  }
}

// AIによる提案の生成
export async function generateAISuggestion(channelId: string, messages: ChatMessage[]): Promise<AISuggestion> {
  try {
    // APIエンドポイントを呼び出してAI提案を生成
    const response = await fetch('/api/chat/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('AI提案の生成に失敗しました');
    }

    const { suggestion } = await response.json();

    // 提案をデータベースに保存
    const { data, error } = await supabase
      .from('ai_suggestions')
      .insert({
        channel_id: channelId,
        suggestion_type: 'advice',
        content: suggestion,
        metadata: {
          model: "gpt-4",
          messages_count: messages.length,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      id: data.id,
      channelId: data.channel_id,
      suggestionType: data.suggestion_type,
      createdAt: new Date(data.created_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    throw error;
  }
}

// チャンネルの作成
export async function createChannel(): Promise<ChatChannel> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('認証が必要です');

  // プロフィール情報の取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) throw new Error('プロフィールが見つかりません');

  // チャンネルの作成
  const { data, error } = await supabase
    .from('chat_channels')
    .insert({
      user_id: user.id,
      channel_type: 'direct',
      metadata: {
        userName: profile.full_name,
        userEmail: profile.email,
      },
    })
    .select(`
      *,
      profiles!chat_channels_user_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .single();

  if (error) throw error;
  if (!data) throw new Error('チャンネルの作成に失敗しました');

  return mapChannel(data);
}

// AI提案を使用
export async function useSuggestion(
  channelId: string,
  suggestionId: string,
  content: string
): Promise<void> {
  // メッセージを送信
  await sendMessage(channelId, content);

  // 提案を使用済みにマーク
  await supabase
    .from('ai_suggestions')
    .update({
      used_at: new Date().toISOString(),
    })
    .eq('id', suggestionId);
}

// チャンネルのメッセージをAIで要約
export async function summarizeChannelMessages(channelId: string): Promise<string> {
  // メッセージ履歴の取得
  const { data: messages } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles!chat_messages_sender_id_fkey (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    return '会話履歴がありません。';
  }

  // メッセージを整形
  const formattedMessages = messages.map(msg => ({
    role: msg.is_from_user ? 'user' : 'assistant',
    content: msg.content,
    sender: msg.profiles?.full_name || '不明',
    timestamp: new Date(msg.created_at).toLocaleString('ja-JP')
  }));

  try {
    // APIエンドポイントを呼び出してAI要約を生成
    const response = await fetch('/api/chat/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: formattedMessages
      }),
    });

    if (!response.ok) {
      throw new Error('AI要約の生成に失敗しました');
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('AI要約の生成中にエラーが発生:', error);
    throw error;
  }
}

// ユーザーの全チャンネルの会話をまとめて要約
export async function summarizeAllChannels(): Promise<{ channelId: string; summary: string }[]> {
  const channels = await getChannels();
  const summaries = await Promise.all(
    channels.map(async (channel) => {
      try {
        const summary = await summarizeChannelMessages(channel.id);
        return {
          channelId: channel.id,
          summary
        };
      } catch (error) {
        console.error(`チャンネル ${channel.id} の要約中にエラーが発生:`, error);
        return {
          channelId: channel.id,
          summary: 'エラーが発生しました'
        };
      }
    })
  );

  return summaries;
} 