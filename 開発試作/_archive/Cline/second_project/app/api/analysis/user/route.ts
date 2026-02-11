import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { requireAdmin } from '@/lib/auth-server';
import { analyzeUserBehavior, generateCustomContent, analyzeChatSentiment } from '@/lib/analysis';

export async function POST(request: Request) {
  try {
    // 管理者権限の確認
    await requireAdmin();

    const body = await request.json();
    const { userId, type, channelId, purpose } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let result;
    switch (type) {
      case 'behavior':
        result = await analyzeUserBehavior(userId);
        break;
      case 'content':
        if (!purpose) {
          return NextResponse.json(
            { error: 'Purpose is required for content generation' },
            { status: 400 }
          );
        }
        result = await generateCustomContent(userId, purpose);
        break;
      case 'sentiment':
        if (!channelId) {
          return NextResponse.json(
            { error: 'Channel ID is required for sentiment analysis' },
            { status: 400 }
          );
        }
        result = await analyzeChatSentiment(channelId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid analysis type' }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Error in analysis API:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 