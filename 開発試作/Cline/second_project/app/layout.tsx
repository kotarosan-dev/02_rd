import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/header';
import { headers } from 'next/headers';
import { cn } from '@/lib/utils';
import React from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: false
});

export const metadata: Metadata = {
  title: 'Inner Glow Beauty - 美容サロン予約・顧客管理システム',
  description: '美容とメンタリングの融合で、あなたの内側と外側の美しさを引き出す統合システム',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Inner Glow Beauty',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'application-name': 'Inner Glow Beauty',
    'msapplication-TileColor': '#000000',
    'theme-color': '#000000',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdminPage = false;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Inner Glow Beauty" />
        <meta name="apple-mobile-web-app-title" content="Inner Glow Beauty" />
        <meta name="msapplication-TileColor" content="#000000" />
        <meta name="theme-color" content="#000000" />
        <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Service Workerの登録解除とキャッシュのクリア
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                  registration.unregister();
                }
              });
              caches.keys().then(function(names) {
                for (let name of names) {
                  caches.delete(name);
                }
              });
            }

            // IndexedDBのクリア
            window.indexedDB.databases().then(function(databases) {
              databases.forEach(function(database) {
                window.indexedDB.deleteDatabase(database.name);
              });
            }).catch(function(error) {
              console.log('IndexedDBのクリアに失敗しました:', error);
            });

            // LocalStorageのクリア
            try {
              localStorage.clear();
            } catch (error) {
              console.log('LocalStorageのクリアに失敗しました:', error);
            }

            // SessionStorageのクリア
            try {
              sessionStorage.clear();
            } catch (error) {
              console.log('SessionStorageのクリアに失敗しました:', error);
            }

            // ページ遷移時のキャッシュ制御
            window.addEventListener('load', function() {
              if (window.location.pathname === '/admin') {
                // 管理者ページの場合、キャッシュを無効化
                if (window.performance && window.performance.navigation.type === 1) {
                  // リロード時の処理
                  window.location.replace('/admin');
                }
              }
            });

            // Supabaseセッションの初期化
            if (window.location.pathname === '/admin') {
              const supabaseKey = localStorage.getItem('supabase.auth.token');
              if (supabaseKey) {
                localStorage.removeItem('supabase.auth.token');
                window.location.reload();
              }
            }
          `
        }} />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={cn(
          inter.className,
          'min-h-screen bg-background antialiased'
        )}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="beauty-connection-theme"
        >
          <AuthProvider>
            <div className="relative min-h-screen flex flex-col">
              {!isAdminPage && <Header />}
              <main className="flex-1">
                {children}
              </main>
              <Toaster />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

// 動的レンダリングを強制
export const dynamic = 'auto';
export const dynamicParams = true;
export const revalidate = 0;
export const fetchCache = 'auto';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

// 静的生成を無効化
export const generateStaticParams = async () => {
  return [];
};
