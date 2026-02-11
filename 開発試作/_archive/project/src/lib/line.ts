import { Client } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

const config = {
  channelAccessToken: import.meta.env.VITE_LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: import.meta.env.VITE_LINE_CHANNEL_SECRET
};

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export const lineClient = new Client(config);

export const sendLineMessage = async (lineUserId: string, message: string) => {
  try {
    if (!lineUserId) {
      console.error('LINE User ID is missing');
      return false;
    }

    await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text: message
    });

    console.log('Message sent to LINE:', { lineUserId, message });
    return true;
  } catch (error) {
    console.error('Error sending LINE message:', error);
    return false;
  }
};

export const handleLineWebhook = async (event: any) => {
  try {
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
      const profile = await lineClient.getProfile(lineUserId);
      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          line_user_id: lineUserId,
          name: profile.displayName,
          avatar_url: profile.pictureUrl
        })
        .select()
        .single();

      if (error) throw error;
    }

    // 会話を取得または作成
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('customer_id', customer?.id)
      .eq('channel', 'line')
      .single();

    const conversationId = conversation?.id;

    // メッセージを保存
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        customer_id: customer?.id,
        sender_type: 'customer',
        content: event.message.text,
        channel: 'line'
      });

    return true;
  } catch (error) {
    console.error('Error handling LINE webhook:', error);
    return false;
  }
};