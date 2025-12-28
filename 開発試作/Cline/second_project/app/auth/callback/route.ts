import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const redirectTo = requestUrl.searchParams.get('redirectTo') ?? '/mypage';

  if (!code) {
    console.log('⚠️ 認証コードがありません');
    return NextResponse.redirect(new URL('/auth?error=no_code', request.url));
  }

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore,
    });

    console.log('🔄 認証コードをセッションに交換中...');
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError || !session) {
      console.error('❌ コード交換エラー:', exchangeError);
      return NextResponse.redirect(new URL('/auth?error=exchange_failed', request.url));
    }

    console.log('✅ セッション交換成功');

    // プロフィールの確認とリダイレクト
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('❌ プロフィール取得エラー:', profileError);
      return NextResponse.redirect(new URL('/auth?error=profile_error', request.url));
    }

    const targetPath = (profile?.role === 'admin' ? '/admin' : redirectTo);
    console.log('🎯 リダイレクト先:', targetPath);

    const response = NextResponse.redirect(new URL(targetPath, request.url));

    // セッショントークンの設定
    if (session.access_token) {
      console.log('🔒 アクセストークンを設定中...');
      response.cookies.set('sb-access-token', session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7日間
      });

      // リフレッシュトークンの設定
      if (session.refresh_token) {
        console.log('🔄 リフレッシュトークンを設定中...');
        response.cookies.set('sb-refresh-token', session.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30, // 30日間
        });
      }
    }

    console.log('✅ 認証完了');
    return response;

  } catch (error) {
    console.error('❌ 認証コールバックエラー:', error);
    return NextResponse.redirect(new URL('/auth?error=auth_error', request.url));
  }
}