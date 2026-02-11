import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // セッションの取得
    const { data: { session }, error } = await supabase.auth.getSession();

    // 公開パスの設定
    const PUBLIC_PATHS = ['/auth', '/login', '/signup', '/'];
    const path = req.nextUrl.pathname;
    const isPublicPath = PUBLIC_PATHS.some(publicPath => path.startsWith(publicPath));

    if (error) {
      console.error('❌ セッション取得エラー:', error);
      return NextResponse.redirect(new URL('/auth', req.url));
    }

    // 未認証ユーザーの処理
    if (!session && !isPublicPath) {
      console.log('⚠️ 未認証アクセス - リダイレクト:', path);
      return NextResponse.redirect(new URL('/auth', req.url));
    }

    // 認証済みユーザーの処理
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // 一般ユーザーの管理者ページへのアクセスのみを制限
      if (profile?.role !== 'admin' && path.startsWith('/admin')) {
        console.log('👉 一般ユーザーを/mypageへリダイレクト');
        return NextResponse.redirect(new URL('/mypage', req.url));
      }
    }

    return res;
  } catch (error) {
    console.error('❌ ミドルウェアエラー:', error);
    return NextResponse.redirect(new URL('/auth', req.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};