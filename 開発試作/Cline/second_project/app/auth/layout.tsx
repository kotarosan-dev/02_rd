'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export const dynamic = 'force-dynamic';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectInProgress = useRef(false);
  const hasInitialized = useRef(false);
  const redirectTarget = useRef<string | null>(null);

  // リダイレクト先を事前に計算
  useEffect(() => {
    const redirectTo = searchParams?.get('redirectTo');
    if (redirectTo && !redirectTarget.current) {
      console.log('🎯 リダイレクト先を設定:', {
        redirectTo,
        timestamp: new Date().toISOString()
      });
      redirectTarget.current = redirectTo;
    }
  }, [searchParams]);

  const handleRedirect = useCallback(() => {
    if (!user || redirectInProgress.current || hasInitialized.current) {
      console.log('🚫 リダイレクトスキップ:', {
        hasUser: !!user,
        isRedirecting: redirectInProgress.current,
        isInitialized: hasInitialized.current,
        redirectTarget: redirectTarget.current,
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      redirectInProgress.current = true;
      const currentPath = window.location.pathname;
      let targetPath = '/mypage';

      // 管理者ユーザーの場合は常に/adminへリダイレクト
      if (user.role === 'admin') {
        targetPath = '/admin';
        console.log('👉 管理者ユーザーを/adminへリダイレクト', {
          timestamp: new Date().toISOString()
        });
      }
      // 保存されたリダイレクト先がある場合はそちらへ
      else if (redirectTarget.current && !redirectTarget.current.startsWith('/auth')) {
        targetPath = redirectTarget.current;
        console.log('👉 保存された指定パスへリダイレクト:', {
          path: targetPath,
          timestamp: new Date().toISOString()
        });
      }
      // デフォルトは/mypageへ
      else {
        console.log('👉 一般ユーザーを/mypageへリダイレクト', {
          timestamp: new Date().toISOString()
        });
      }

      if (currentPath !== targetPath) {
        console.log('🔀 ページ遷移実行:', {
          from: currentPath,
          to: targetPath,
          timestamp: new Date().toISOString()
        });
        hasInitialized.current = true;
        // 遷移を実行する前に少し待機
        setTimeout(() => {
          window.location.href = targetPath;
        }, 100);
      } else {
        console.log('⚠️ 同一パスへのリダイレクトをスキップ:', {
          path: currentPath,
          timestamp: new Date().toISOString()
        });
        hasInitialized.current = true;
        redirectInProgress.current = false;
      }
    } catch (error) {
      console.error('❌ リダイレクトエラー:', {
        error,
        timestamp: new Date().toISOString()
      });
      hasInitialized.current = false;
      redirectInProgress.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (loading) {
      console.log('⏳ 認証状態読み込み中...', {
        timestamp: new Date().toISOString()
      });
      return;
    }

    console.log('🔍 認証レイアウトの状態:', {
      isLoading: loading,
      hasUser: !!user,
      userRole: user?.role,
      currentPath: window.location.pathname,
      hasInitialized: hasInitialized.current,
      isRedirecting: redirectInProgress.current,
      redirectTarget: redirectTarget.current,
      timestamp: new Date().toISOString()
    });

    if (user && !hasInitialized.current) {
      handleRedirect();
    }

    return () => {
      if (redirectInProgress.current) {
        console.log('🧹 リダイレクト状態をクリーンアップ', {
          timestamp: new Date().toISOString()
        });
      }
      redirectInProgress.current = false;
    };
  }, [loading, user, handleRedirect]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    console.log('⏳ ユーザー認証済み、リダイレクト待機中...', {
      userId: user.id,
      role: user.role,
      hasInitialized: hasInitialized.current,
      isRedirecting: redirectInProgress.current,
      redirectTarget: redirectTarget.current,
      timestamp: new Date().toISOString()
    });
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  console.log('🎯 認証フォームを表示', {
    timestamp: new Date().toISOString()
  });
  return (
    <div className="flex min-h-screen items-center justify-center">
      <main className="w-full max-w-md p-4">{children}</main>
    </div>
  );
} 