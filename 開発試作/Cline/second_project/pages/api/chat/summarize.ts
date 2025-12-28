import { getSession } from '@/lib/auth-server';
import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getSession();
    if (!session) {
      return res.status(401).json({ error: '認証が必要です' });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'メッセージが必要です' });
    }

    const openai = new OpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "チャット履歴を要約してください。重要なポイントを箇条書きでまとめてください。"
        },
        ...messages.map(m => ({
          role: m.role as "user" | "assistant",
          content: m.content
        }))
      ]
    });

    const summary = response.choices[0]?.message?.content;
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error in chat summarization:', error);
    res.status(500).json({ error: 'チャットの要約に失敗しました' });
  }
} 