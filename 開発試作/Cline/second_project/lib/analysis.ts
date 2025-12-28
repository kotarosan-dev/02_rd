import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';
import type { ChatMessage } from '@/types/chat';

// ユーザーの行動パターン分析
export async function analyzeUserBehavior(userId: string) {
  const supabase = createRouteHandlerClient({ cookies });

  // チャットメッセージの取得
  const { data: messages } = await supabase
    .from('chat_messages')
    .select(`
      *,
      chat_channels!inner (
        user_id
      )
    `)
    .eq('chat_channels.user_id', userId)
    .order('created_at', { ascending: true });

  // 予約履歴の取得
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  // データを整形
  const userData = {
    messages: messages?.map(msg => ({
      content: msg.content,
      timestamp: msg.created_at,
      type: msg.message_type,
    })) || [],
    bookings: bookings?.map(booking => ({
      service: booking.service_id,
      datetime: booking.datetime,
      status: booking.status,
    })) || [],
  };

  try {
    // OpenAIクライアントを関数内で初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'あなたはユーザーの行動パターンを分析するエキスパートです。チャットログと予約履歴から、ユーザーの特徴、傾向、好みを分析してください。'
        },
        {
          role: 'user',
          content: JSON.stringify(userData)
        }
      ],
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || '分析を生成できませんでした。';
  } catch (error) {
    console.error('Error analyzing user behavior:', error);
    throw error;
  }
}

// カスタマイズされた文章作成
export async function generateCustomContent(
  userId: string,
  purpose: 'follow_up' | 'recommendation' | 'reminder'
) {
  const supabase = createRouteHandlerClient({ cookies });

  // ユーザープロフィールの取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  // 最近のチャット履歴を取得
  const { data: recentMessages } = await supabase
    .from('chat_messages')
    .select(`
      *,
      chat_channels!inner (
        user_id
      )
    `)
    .eq('chat_channels.user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  const userContext = {
    profile,
    recentMessages: recentMessages?.map(msg => ({
      content: msg.content,
      timestamp: msg.created_at,
    })),
  };

  const promptTemplates = {
    follow_up: 'このユーザーへのフォローアップメッセージを作成してください。最近の会話を考慮し、親しみやすく、かつ専門的な印象を与える文章にしてください。',
    recommendation: 'このユーザーの興味や行動パターンに基づいて、おすすめのサービスを提案する文章を作成してください。',
    reminder: '予約の確認や次回の予約を促す、やさしいリマインダーメッセージを作成してください。',
  };

  try {
    // OpenAIクライアントを関数内で初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: promptTemplates[purpose]
        },
        {
          role: 'user',
          content: JSON.stringify(userContext)
        }
      ],
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content || '文章を生成できませんでした。';
  } catch (error) {
    console.error('Error generating custom content:', error);
    throw error;
  }
}

// チャットログの感情分析
export async function analyzeChatSentiment(channelId: string) {
  const supabase = createRouteHandlerClient({ cookies });

  // チャットメッセージとユーザー情報を取得
  const { data: messages } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles!chat_messages_sender_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: true });

  if (!messages || messages.length === 0) {
    return '分析するメッセージがありません。';
  }

  // チャンネル情報を取得
  const { data: channel } = await supabase
    .from('chat_channels')
    .select(`
      *,
      profiles!chat_channels_user_id_fkey (
        id,
        full_name,
        email
      )
    `)
    .eq('id', channelId)
    .single();

  // メッセージを時系列で整理
  const conversationData = {
    channel: {
      id: channel?.id,
      type: channel?.channel_type,
      userName: channel?.profiles?.full_name || '不明',
    },
    messages: messages.map(msg => ({
      content: msg.content,
      isFromUser: msg.is_from_user,
      timestamp: msg.created_at,
      senderName: msg.profiles?.full_name || '不明',
      messageType: msg.message_type,
    })),
  };

  try {
    // OpenAIクライアントを関数内で初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたは会話分析の専門家です。チャットログから以下の観点で分析を行ってください：

1. 感情の変化
- 会話全体を通じての感情の流れ
- 特に強い感情が表れた箇所
- ポジティブ/ネガティブな感情の比率

2. コミュニケーションパターン
- 応答の速さや頻度
- 会話の深さ（表面的か深い議論か）
- 使用される言葉の特徴

3. 関心事項とニーズ
- 繰り返し言及されるトピック
- 明示的/暗示的な要望
- 未解決の課題

4. 満足度評価
- サービスへの満足度
- 不満や懸念事項
- 改善の機会

5. 行動傾向
- 意思決定パターン
- 情報収集の方法
- 予約や購入に関する傾向

分析結果は箇条書きで、できるだけ具体的に示してください。`
        },
        {
          role: 'user',
          content: JSON.stringify(conversationData)
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || '分析を生成できませんでした。';
  } catch (error) {
    console.error('Error analyzing chat sentiment:', error);
    throw error;
  }
} 