"use client";

import type { User } from '@supabase/supabase-js';
import type { AuthError } from '@supabase/supabase-js';
import supabase from './supabase';

export interface AuthResponse {
  user: User | null;
  error: AuthError | Error | null;
  session?: {
    access_token: string;
    refresh_token: string;
  } | null;
  profile?: any;
}

export async function signUp(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔄 サインアップ処理開始:', { email });
    if (!email || !password) {
      return { user: null, error: new Error('メールアドレスとパスワードは必須です') };
    }

    if (password.length < 6) {
      return { user: null, error: new Error('パスワードは6文字以上で入力してください') };
    }

    // サインアップ実行
    console.log('📤 サインアップリクエスト送信...');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: email.includes('admin') ? 'admin' : 'user',  // メールアドレスに基づいて役割を設定
        },
      },
    });

    if (error) {
      console.error('❌ サインアップエラー:', error);
      return { user: null, error };
    }

    if (data.user) {
      // プロファイルの作成を確認
      console.log('🔍 プロファイル作成確認中...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        console.log('📝 プロファイル作成開始...');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              role: email.includes('admin') ? 'admin' : 'user',
            }
          ]);

        if (insertError) {
          console.error('❌ プロファイル作成エラー:', insertError);
          return { user: data.user, error: insertError };
        }
      }
    }

    console.log('✅ サインアップ成功:', { userId: data.user?.id });
    return { user: data.user, error: null };
  } catch (error) {
    console.error('❌ サインアップ例外:', error);
    return { 
      user: null, 
      error: error as AuthError | Error 
    };
  }
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  try {
    console.log('🔄 サインイン処理開始:', { email });
    if (!email || !password) {
      console.log('⚠️ 必須パラメータ不足');
      return { user: null, error: new Error('メールアドレスとパスワードは必須です') };
    }

    // サインイン実行
    console.log('📤 認証リクエスト送信...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('❌ サインインエラー:', error);
      return { user: null, error };
    }

    // セッションの確認
    console.log('🔍 セッション確認中...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('❌ セッション確認エラー:', sessionError);
      return { user: null, error: sessionError };
    }

    if (!sessionData.session) {
      console.error('❌ セッションが存在しません');
      return { user: null, error: new Error('セッションの作成に失敗しました') };
    }

    console.log('✅ サインイン成功:', {
      userId: data.user?.id,
      email: data.user?.email,
      hasSession: true,
      timestamp: new Date().toISOString()
    });

    return { 
      user: data.user, 
      error: null,
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token
      }
    };
  } catch (error) {
    console.error('❌ サインイン例外:', error);
    return { 
      user: null, 
      error: error as AuthError | Error 
    };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    console.log('🔄 サインアウト処理開始');
    
    // セッションの確認
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 現在のセッション:', { hasSession: !!session });

    // サインアウトの実行
    const { error } = await supabase.auth.signOut({
      scope: 'local'  // ローカルセッションのみをクリア
    });
    
    if (error) {
      console.error('❌ サインアウトエラー:', error);
      throw error;
    }

    console.log('✅ サインアウト成功');
    
    // クッキーとローカルストレージのクリーンアップ
    try {
      localStorage.removeItem('sb-auth-token');
      document.cookie = 'sb-auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } catch (e) {
      console.warn('⚠️ ストレージクリーンアップ中の警告:', e);
    }

    // 認証ページへのリダイレクト
    window.location.href = '/auth';
    
    return { error: null };
  } catch (error) {
    console.error('❌ サインアウト例外:', error);
    return { error: error as Error };
  }
}

export async function getProfile(userId: string) {
  try {
    console.log('🔍 プロフィール取得開始 (lib/auth):', { userId });
    console.log('📤 Supabaseリクエスト送信: profiles.select()');
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ プロフィール取得エラー (lib/auth):', error);
      throw error;
    }

    console.log('✅ プロフィール取得成功 (lib/auth):', data);
    return { data, error: null };
  } catch (error) {
    console.error('❌ プロフィール取得例外 (lib/auth):', error);
    return { data: null, error: error as Error };
  }
}

export const isAdmin = async (userId: string): Promise<boolean> => {
  try {
    console.log('🔄 管理者権限チェック開始:', { userId });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ プロフィール取得エラー:', error);
      return false;
    }

    if (!profile) {
      console.warn('⚠️ プロフィールが見つかりません:', { userId });
      return false;
    }

    const isAdminUser = profile.role === 'admin';
    console.log('✅ 権限チェック完了:', {
      userId,
      role: profile.role,
      isAdmin: isAdminUser
    });

    return isAdminUser;
  } catch (error) {
    console.error('❌ 権限チェックエラー:', error);
    return false;
  }
};

export const getUserRole = async (userId: string): Promise<string | null> => {
  try {
    console.log('🔄 ユーザーロール取得開始:', { userId });

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ ロール取得エラー:', error);
      return null;
    }

    if (!profile) {
      console.warn('⚠️ プロフィールが見つかりません:', { userId });
      return null;
    }

    console.log('✅ ロール取得完了:', {
      userId,
      role: profile.role
    });

    return profile.role;
  } catch (error) {
    console.error('❌ ロール取得エラー:', error);
    return null;
  }
};