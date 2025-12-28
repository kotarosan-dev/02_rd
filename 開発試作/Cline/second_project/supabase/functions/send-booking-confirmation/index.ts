// @deno-types="https://deno.land/std@0.210.0/http/server.ts"
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
// @deno-types="https://deno.land/std@0.210.0/dotenv/mod.ts"
import { load } from "https://deno.land/std@0.210.0/dotenv/mod.ts";
// @deno-types="https://deno.land/std@0.210.0/datetime/format.ts"
import { format } from "https://deno.land/std@0.210.0/datetime/format.ts";

interface CorsHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Headers': string;
}

const corsHeaders: CorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
if (!SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

interface EmailResponse {
  statusCode: number;
  message: string;
}

async function sendEmail(email: string, name: string, date: string, service: string): Promise<EmailResponse> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email }],
      }],
      from: { email: 'noreply@innerglow-beauty.com', name: 'Inner Glow Beauty' },
      subject: '予約確認のお知らせ',
      content: [{
        type: 'text/html',
        value: `
          <h2>${name}様</h2>
          <p>ご予約ありがとうございます。以下の内容で承りました。</p>
          <ul>
            <li>日時：${date}</li>
            <li>メニュー：${service}</li>
          </ul>
          <p>ご来店をお待ちしております。</p>
        `,
      }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'メール送信に失敗しました');
  }

  return {
    statusCode: response.status,
    message: 'メールを送信しました',
  };
}

interface EmailRequest {
  email: string;
  name: string;
  date: string;
  service: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, name, date, service } = await req.json() as EmailRequest;

    if (!email || !name || !date || !service) {
      throw new Error('必須パラメータが不足しています');
    }

    const result = await sendEmail(email, name, date, service);

    return new Response(
      JSON.stringify({ message: result.message }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: result.statusCode,
      },
    );
  } catch (error) {
    console.error('メール送信エラー:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'サーバーエラーが発生しました',
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      },
    );
  }
});