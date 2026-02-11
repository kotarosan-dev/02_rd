import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ChatMessage } from '@/types/chat';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json() as { messages: ChatMessage[] };

    const prompt = messages
      .map(msg => `${msg.isFromUser ? 'ユーザー' : '管理者'}: ${msg.content}`)
      .join('\n');

    // OpenAIクライアントを実行時に初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "あなたは美容サロンのカスタマーサービスアシスタントです。ユーザーとの会話履歴から、適切なアドバイスや返信を提案してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
    });

    const suggestion = completion.choices[0]?.message?.content;
    if (!suggestion) {
      return NextResponse.json(
        { error: 'AI提案の生成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error('Error generating AI suggestion:', error);
    return NextResponse.json(
      { error: 'AI提案の生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 