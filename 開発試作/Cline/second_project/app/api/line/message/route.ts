import { NextResponse } from 'next/server';
import { LINE_CHANNEL_ACCESS_TOKEN } from '@/config';
import type { LineMessage } from '@/lib/line';

export async function POST(request: Request) {
  try {
    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN is not set');
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN is not set' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { to, messages } = body;

    console.log('Received request body:', { to, messages });

    if (!to || !messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid request body:', { to, messages });
      return NextResponse.json(
        { error: 'Invalid request body. "to" and "messages" are required.' },
        { status: 400 }
      );
    }

    const lineRequestBody = {
      to,
      messages: messages.map((msg: LineMessage) => ({
        type: msg.type,
        ...(msg.type === 'text' ? { text: msg.text } : {}),
        ...(msg.type === 'image' ? {
          originalContentUrl: msg.originalContentUrl,
          previewImageUrl: msg.previewImageUrl,
        } : {}),
      })),
    };

    console.log('Sending to LINE API:', {
      url: 'https://api.line.me/v2/bot/message/push',
      body: lineRequestBody,
      token: `${LINE_CHANNEL_ACCESS_TOKEN.substring(0, 10)}...`,
    });

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(lineRequestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('LINE API error details:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      return NextResponse.json(
        { 
          error: 'LINEメッセージの送信に失敗しました',
          details: error 
        },
        { status: response.status }
      );
    }

    console.log('Message sent successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending LINE message:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 