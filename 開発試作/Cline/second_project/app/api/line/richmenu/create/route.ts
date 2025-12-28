import { NextResponse } from 'next/server';
import { LINE_CHANNEL_ACCESS_TOKEN } from '@/config';
import type { RichMenu } from '@/lib/line';

export async function POST(request: Request) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' },
        { status: 500 }
      );
    }

    const richMenu: RichMenu = await request.json();

    const response = await fetch('https://api.line.me/v2/bot/richmenu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(richMenu),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('LINE API error details:', error);
      return NextResponse.json(
        { 
          error: 'リッチメニューの作成に失敗しました',
          details: error 
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating LINE rich menu:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 