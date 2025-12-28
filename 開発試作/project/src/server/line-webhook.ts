import express from 'express';
import { WebhookEvent, Client, middleware } from '@line/bot-sdk';
import { supabase } from '../lib/supabase';
import { generateAIResponse } from '../lib/openai';

const config = {
  channelAccessToken: process.env.VITE_LINE_CHANNEL_ACCESS_TOKEN!,
  channelSecret: process.env.VITE_LINE_CHANNEL_SECRET!
};

const client = new Client(config);
const app = express();

app.use(middleware(config));

app.post('/webhook', async (req, res) => {
  try {
    const events: WebhookEvent[] = req.body.events;

    await Promise.all(
      events.map(async (event) => {
        if (event.type !== 'message' || event.message.type !== 'text') {
          return;
        }

        const lineUserId = event.source.userId;
        if (!lineUserId) return;

        // LINEユーザーIDに紐づく顧客情報を取得
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('line_user_id', lineUserId)
          .single();

        if (!customer) {
          // 新規顧客の場合、顧客情報を作成
          const { data: profile } = await client.getProfile(lineUserId);
          const { data: newCustomer, error } = await supabase
            .from('customers')
            .insert({
              line_user_id: lineUserId,
              name: profile?.displayName,
              avatar_url: profile?.pictureUrl
            })
            .single();

          if (error) throw error;
        }

        // メッセージを保存
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: customer?.conversation_id,
            sender_id: lineUserId,
            content: event.message.text,
            source: 'line'
          });

        if (messageError) throw messageError;

        // AIレスポンスを生成
        const aiResponse = await generateAIResponse(event.message.text);
        if (aiResponse) {
          // AIレスポンスを保存
          await supabase
            .from('messages')
            .insert({
              conversation_id: customer?.conversation_id,
              sender_id: 'ai',
              content: aiResponse,
              is_ai_response: true,
              source: 'line'
            });

          // LINEにAIレスポンスを送信
          await client.replyMessage(event.replyToken, {
            type: 'text',
            text: aiResponse
          });
        }
      })
    );

    res.status(200).end();
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

export default app;