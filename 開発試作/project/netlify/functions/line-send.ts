import { Handler } from '@netlify/functions';
import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

// 環境変数の存在チェック
if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  throw new Error('LINE_CHANNEL_ACCESS_TOKEN is not set');
}
if (!process.env.LINE_CHANNEL_SECRET) {
  throw new Error('LINE_CHANNEL_SECRET is not set');
}

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
} as const;

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const lineClient = new Client(config);

export const handler: Handler = async (event) => {
  console.log('Function triggered:', {
    method: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body
  });

  try {
    const { customerId, message, lineUserId } = JSON.parse(event.body || '{}');
    console.log('Processing request:', { customerId, message, lineUserId });

    if (!lineUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'LINE User ID is required' })
      };
    }

    // LINEメッセージを送信
    await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });

    // メッセージをデータベースに保存
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customerId)
      .eq('channel', 'line')
      .single();

    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          customer_id: customerId,
          sender_type: 'admin',
          content: message,
          channel: 'line'
        });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Detailed error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to send message',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 