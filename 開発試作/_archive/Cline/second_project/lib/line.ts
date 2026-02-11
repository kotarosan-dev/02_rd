import type { Message } from '@line/bot-sdk';
import { LINE_CHANNEL_ACCESS_TOKEN } from '@/config';
import supabase from '@/lib/supabase';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// チャット機能を使用する場合のみトークンチェックを行う
const checkLineToken = () => {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set. LINE messaging features will be disabled.');
    return false;
  }
  return true;
};

export type LineMessageType = 'text' | 'image' | 'video';

export type LineMessage = {
  type: LineMessageType;
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
};

export async function sendLineMessage(to: string, messages: LineMessage[]): Promise<void> {
  if (!checkLineToken()) return;

  try {
    console.log('Sending LINE message:', { to, messages });

    const response = await fetch('/api/line/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LINE API error:', {
        status: response.status,
        statusText: response.statusText,
        data,
      });
      throw new Error(data.details?.message || data.error || 'Failed to send messages');
    }

    console.log('LINE message sent successfully');
  } catch (error) {
    console.error('Error sending LINE message:', error);
    throw error;
  }
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

// LINEメーザープロフィールの取得
export async function getLineProfile(userId: string): Promise<{
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}> {
  const response = await fetch(`/api/line/profile/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('LINE API error:', error);
    throw new Error('LINEプロフィールの取得に失敗しました');
  }

  return response.json();
}

export interface RichMenuSize {
  width: number;
  height: number;
}

export interface RichMenuBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RichMenuAction {
  type: 'postback' | 'message' | 'uri';
  label?: string;
  data?: string;
  text?: string;
  uri?: string;
}

export interface RichMenuArea {
  bounds: RichMenuBounds;
  action: RichMenuAction;
}

export interface RichMenu {
  size: RichMenuSize;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: RichMenuArea[];
}

// リッチメニューの作成
export async function createLineRichMenu(richMenu: RichMenu) {
  try {
    const response = await fetch('/api/line/richmenu/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(richMenu),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LINE API error:', data);
      throw new Error(data.details?.message || data.error || 'リッチメニューの作成に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Error creating LINE rich menu:', error);
    throw error;
  }
}

// リッチメニュー画像のアップロード
export async function uploadRichMenuImage(richMenuId: string, image: Blob) {
  try {
    const formData = new FormData();
    formData.append('image', image);

    const response = await fetch(`/api/line/richmenu/${richMenuId}/image`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LINE API error:', data);
      throw new Error(data.details?.message || data.error || 'リッチメニュー画像のアップロードに失敗しました');
    }

    return true;
  } catch (error) {
    console.error('Error uploading rich menu image:', error);
    throw error;
  }
}

// デフォルトのリッチメニューを設定
export async function setDefaultRichMenu(richMenuId: string) {
  try {
    const response = await fetch(`/api/line/richmenu/${richMenuId}/default`, {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LINE API error:', data);
      throw new Error(data.details?.message || data.error || 'デフォルトリッチメニューの設定に失敗しました');
    }

    return true;
  } catch (error) {
    console.error('Error setting default rich menu:', error);
    throw error;
  }
}

// 登録済みのLINEユーザー全員にメッセージを送信
export async function sendMessageToAllLineUsers(message: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  
  // LINEと連携済みのチャンネルを取得
  const { data: channels, error } = await supabase
    .from('chat_channels')
    .select('external_id')
    .eq('channel_type', 'line')
    .not('external_id', 'is', null);

  if (error) throw error;

  // 各ユーザーにメッセージを送信
  for (const channel of channels) {
    try {
      const lineMessage = {
        type: 'text' as const,
        text: message,
      };

      console.log('Sending broadcast message:', {
        to: channel.external_id,
        message: lineMessage,
      });

      await sendLineMessage(channel.external_id, [lineMessage]);
    } catch (error) {
      console.error(`Failed to send message to ${channel.external_id}:`, error);
    }
  }
}

// 特定のユーザーグループにメッセージを送信
export async function sendMessageToLineUsers(userIds: string[], message: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  
  // 指定されたユーザーのLINEチャンネルを取得
  const { data: channels, error } = await supabase
    .from('chat_channels')
    .select('external_id')
    .eq('channel_type', 'line')
    .in('user_id', userIds)
    .not('external_id', 'is', null);

  if (error) throw error;

  // 各ユーザーにメッセージを送信
  for (const channel of channels) {
    try {
      const lineMessage = {
        type: 'text' as const,
        text: message,
      };

      console.log('Sending group message:', {
        to: channel.external_id,
        message: lineMessage,
      });

      await sendLineMessage(channel.external_id, [lineMessage]);
    } catch (error) {
      console.error(`Failed to send message to ${channel.external_id}:`, error);
    }
  }
}
 