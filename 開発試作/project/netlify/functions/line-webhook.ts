import { Handler } from '@netlify/functions';
import { WebhookEvent, validateSignature, Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.LINE_CHANNEL_SECRET!
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// LINE Clientの初期化
const lineClient = new Client(config);

export const handler: Handler = async (event) => {
  console.log('Webhook received:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body
  });

  try {
    // LINE Webhook URL確認用
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        body: 'LINE Webhook is working!'
      };
    }

    // 重要: LINE Platformからのリクエストであることを確認
    const signature = event.headers['x-line-signature'];
    if (!signature) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Unauthorized request' })
      };
    }

    // リクエストボディが空の場合は400を返す
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is empty' })
      };
    }

    // 署名を検証（セキュリティ上重要）
    const isValid = validateSignature(event.body, config.channelSecret, signature);
    if (!isValid) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid signature' })
      };
    }

    // Webhookイベントを処理
    const webhookEvent = JSON.parse(event.body) as { events: WebhookEvent[] };
    console.log('Webhook event:', webhookEvent);
    
    // イベントが空でも200を返す（LINEプラットォームの仕様）
    if (!webhookEvent.events || webhookEvent.events.length === 0) {
      return {
        statusCode: 200,
        body: ''
      };
    }

    // 各イベントを非同期で処理
    await Promise.all(
      webhookEvent.events.map(async (event) => {
        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        const lineUserId = event.source.userId;
        if (!lineUserId) return;

        try {
          let customer;
          let conversation;
          let message;

          console.log('Attempting to save customer:', {
            lineUserId,
            timestamp: new Date().toISOString()
          });

          // 顧客情報の取得または作成
          const { data: existingCustomer, error: customerError } = await supabase
            .from('customers')
            .select('*')
            .eq('line_user_id', lineUserId)
            .single();

          if (customerError || !existingCustomer) {
            const { data: newCustomer, error: createError } = await supabase
              .from('customers')
              .insert({
                line_user_id: lineUserId,
                name: `LINE User ${lineUserId.slice(-6)}`,
                created_at: new Date().toISOString()
              })
              .select()
              .single();

            if (createError) throw createError;
            customer = newCustomer;
          } else {
            customer = existingCustomer;
          }

          // 会話の取得または作成
          const { data: existingConversation, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', customer.id)
            .eq('channel', 'line')
            .single();

          if (convError || !existingConversation) {
            const { data: newConversation, error: createConvError } = await supabase
              .from('conversations')
              .insert({
                customer_id: customer.id,
                channel: 'line',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (createConvError) throw createConvError;
            conversation = newConversation;
          } else {
            conversation = existingConversation;
          }

          // メッセージを保存する前にログを追加
          console.log('Attempting to save message:', {
            conversation_id: conversation.id,
            customer_id: customer.id,
            content: event.message.text,
            timestamp: new Date().toISOString()
          });

          // メッセージを保存
          const { data: savedMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              customer_id: customer.id,
              sender_type: 'customer',
              content: event.message.text,
              channel: 'line',
              created_at: new Date().toISOString(),
              is_ai_response: false
            })
            .select()
            .single();

          if (messageError) {
            console.error('Message save error details:', {
              error: messageError,
              conversation: conversation,
              customer: customer
            });
            throw messageError;
          }

          console.log('Message saved successfully:', savedMessage);

          // 会話の最終更新時刻とメッセージを更新
          await supabase
            .from('conversations')
            .update({ 
              updated_at: new Date().toISOString(),
              last_message: event.message.text
            })
            .eq('id', conversation.id);

        } catch (error) {
          console.error('Detailed operation error:', error);
          // エラーが発生しても200を返す（LINE仕様）
        }
      })
    );

    return {
      statusCode: 200,
      body: ''
    };

  } catch (error) {
    console.error('Webhook error:', error);
    // エラーが発生しても200を返す（LINE仕様）
    return {
      statusCode: 200,
      body: ''
    };
  }
};