"use client";

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

type AuthContextType = {
  user: (User & { role?: string }) | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<(User & { role?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    const supabase = createClientComponentClient<Database>();
    let mounted = true;

    // 初期セッションの確認（一度だけ実行）
    const initializeSession = async () => {
      if (initialized.current) return;
      initialized.current = true;

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ セッション取得エラー:', error);
          if (mounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (session?.user) {
          // プロフィール情報を一度に取得
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('❌ プロフィール取得エラー:', profileError);
          }

          if (mounted) {
            setUser({ ...session.user, role: profile?.role });
            console.log('✅ 初期セッションを設定:', { 
              user: session.user,
              role: profile?.role,
              timestamp: new Date().toISOString()
            });
          }
        } else {
          if (mounted) {
            console.log('⚠️ 初期セッションなし');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('❌ 初期化エラー:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // 初期化を実行
    initializeSession();

    // セッション変更の監視（イベントベース）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log('🔄 認証状態変更:', { event, timestamp: new Date().toISOString() });

        try {
          if (session?.user) {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('❌ プロフィール取得エラー:', profileError);
            }

            setUser({ ...session.user, role: profile?.role });
            console.log('✅ セッション更新:', { 
              event,
              user: session.user,
              role: profile?.role,
              timestamp: new Date().toISOString()
            });
          } else {
            console.log('⚠️ セッション終了:', { event, timestamp: new Date().toISOString() });
            setUser(null);
          }
        } catch (error) {
          console.error('❌ セッション更新エラー:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 