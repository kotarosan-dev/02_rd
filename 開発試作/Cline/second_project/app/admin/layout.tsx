"use client";

import { useEffect, useCallback } from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { useRouter } from "next/navigation";

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleRedirect = useCallback(async (path: string) => {
    try {
      console.log('🔄 リダイレクト実行:', path);
      await router.replace(path);
    } catch (error) {
      console.error('❌ リダイレクトエラー:', error);
    }
  }, [router]);

  useEffect(() => {
    let isActive = true;

    console.log('🔍 管理者レイアウトの状態:', {
      isLoading: loading,
      hasUser: !!user,
      userRole: user?.role
    });

    const checkAuth = async () => {
      if (!loading && isActive) {
        if (!user) {
          console.log('⚠️ 未認証ユーザー - 認証ページへリダイレクト');
          await handleRedirect('/auth?redirectTo=/admin');
          return;
        }

        if (user.role !== 'admin') {
          console.log('⚠️ 管理者権限なし - トップページへリダイレクト');
          await handleRedirect('/');
          return;
        }

        console.log('✅ 管理者認証完了');
      }
    };

    checkAuth();

    return () => {
      isActive = false;
    };
  }, [user, loading, handleRedirect]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-lg">読み込み中...</div>
          <div className="text-sm text-muted-foreground">
            しばらくお待ちください
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader />
      <div className="flex transition-all duration-300">
        <AdminSidebar />
        <main className="flex-1 p-8 pt-24 ml-[70px] md:ml-64">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="beauty-connection-theme"
    >
      <AuthProvider>
        <AdminLayoutContent>
          {children}
        </AdminLayoutContent>
      </AuthProvider>
    </ThemeProvider>
  );
}