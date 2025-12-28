// @deno-types="https://raw.githubusercontent.com/denoland/deno/main/cli/dts/lib.deno.ns.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import type { WebhookEvent, MessageEvent, TextMessage, FollowEvent } from "https://esm.sh/@line/bot-sdk@7.5.2";

const CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN');
if (!CHANNEL_ACCESS_TOKEN) {
  throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
}

const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET');
if (!CHANNEL_SECRET) {
  throw new Error('LINE_CHANNEL_SECRET is not set');
}

interface WebhookRequestBody {
  destination: string;
  events: Array<WebhookEvent & {
    type: string;
    source: {
      type: string;
      userId?: string;
      groupId?: string;
      roomId?: string;
    };
  }>;
}

interface UserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL) throw new Error('SUPABASE_URL is not set');
if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface LineProfile {
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  userId: string;
}

interface ChatChannel {
  id: string;
  user_id: string | null;
  metadata: Record<string, unknown>;
}

async function handleFollow(event: FollowEvent) {
  const { userId } = event.source;
  if (!userId) return;

  try {
    // LINEユーザー情報を取得
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get LINE profile');
    }

    const profile = await response.json() as LineProfile;

    // チャットチャンネルを作成
    const { data: channel, error: channelError } = await supabase
      .from('chat_channels')
      .insert({
        channel_type: 'line',
        external_id: userId,
        metadata: {
          line_profile: {
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            statusMessage: profile.statusMessage,
          },
        },
      })
      .select()
      .single();

    if (channelError) throw channelError;

    // 紐付け用のトークンを生成
    const token = crypto.randomUUID();
    const { error: linkError } = await supabase
      .from('line_link_tokens')
      .insert({
        token,
        line_user_id: userId,
        channel_id: channel.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24時間有効
      });

    if (linkError) throw linkError;

  } catch (error) {
    console.error('Error handling follow event:', error);
  }
}

async function handleMessage(event: MessageEvent) {
  const { userId } = event.source;
  if (!userId) return;

  try {
    // LINEプロフィールを取得
    const profile = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
    }).then(res => res.json());

    // チャンネルIDを取得
    const { data: channel } = await supabase
      .from('chat_channels')
      .select('id, user_id, metadata')
      .eq('external_id', userId)
      .eq('channel_type', 'line')
      .single();

    if (!channel) return;

    // プロフィール情報を更新
    await supabase
      .from('profiles')
      .update({
        full_name: profile.displayName,
        avatar_url: profile.pictureUrl,
      })
      .eq('id', channel.user_id);

    // メッセージを保存
    await supabase
      .from('chat_messages')
      .insert({
        channel_id: channel.id,
        sender_id: channel.user_id,
        content: event.message.type === 'text' ? event.message.text : `[${event.message.type}メッセージ]`,
        message_type: event.message.type,
        is_from_user: true,
        metadata: {
          line_message: event.message,
          read: false,
        },
      });

    // チャンネルの未読カウントを更新
    await supabase
      .from('chat_channels')
      .update({
        last_message_at: new Date().toISOString(),
        metadata: {
          ...channel.metadata,
          unread_count: ((channel.metadata?.unread_count || 0) + 1),
        },
      })
      .eq('id', channel.id);

  } catch (error) {
    console.error('Error handling message event:', error);
  }
}

serve(async (req) => {
  try {
    // シグネチャの検証
    const signature = req.headers.get('x-line-signature');
    if (!signature) {
      return new Response('Signature missing', { status: 401 });
    }

    const body = await req.json() as WebhookRequestBody;

    const events: WebhookEvent[] = body.events;

    for (const event of events) {
      switch (event.type) {
        case 'follow':
          await handleFollow(event);
          break;
        case 'message':
          await handleMessage(event);
          break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}); 