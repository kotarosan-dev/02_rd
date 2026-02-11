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

    const formData = await request.formData();
    const image = formData.get('image');

    if (!image || !(image instanceof Blob)) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.line.me/v2/bot/richmenu/${params.richMenuId}/content`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'image/jpeg',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: image,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('LINE API error details:', error);
      return NextResponse.json(
        { 
          error: 'リッチメニュー画像のアップロードに失敗しました',
          details: error 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error uploading rich menu image:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 