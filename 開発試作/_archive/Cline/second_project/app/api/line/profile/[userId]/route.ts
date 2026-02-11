import { NextResponse } from 'next/server';
import { LINE_CHANNEL_ACCESS_TOKEN } from '@/config';

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;

    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('LINE API error:', error);
      return NextResponse.json(
        { error: 'LINEプロフィールの取得に失敗しました' },
        { status: response.status }
      );
    }

    const profile = await response.json();
    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching LINE profile:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
} 