import { NextResponse } from 'next/server';
import { LINE_CHANNEL_ACCESS_TOKEN } from '@/config';

export async function POST(
  request: Request,
  { params }: { params: { richMenuId: string } }
) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.line.me/v2/bot/user/all/richmenu/${params.richMenuId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('LINE API error details:', error);
      return NextResponse.json(
        { 
          error: 'デフォルトリッチメニューの設定に失敗しました',
          details: error 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting default rich menu:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 