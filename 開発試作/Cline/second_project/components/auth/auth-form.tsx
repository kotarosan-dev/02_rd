"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AuthApiError } from '@supabase/supabase-js';
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

export function AuthForm() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [redirectTo, setRedirectTo] = useState<string>('/mypage');
  const router = useRouter();

  useEffect(() => {
    if (!searchParams) return;
    const redirect = searchParams.get('redirectTo');
    if (redirect && redirect !== '/auth') {
      setRedirectTo(redirect);
      console.log('🔄 リダイレクト先設定:', redirect);
    }
  }, [searchParams]);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 ログイン処理開始:', { email });
      const supabase = createClientComponentClient<Database>();

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('❌ ログインエラー:', error);
        if (error instanceof AuthApiError) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          } else if (error.message.includes('rate limit')) {
            throw new Error('しばらく時間をおいてから再度お試しください');
          }
        }
        throw error;
      }

      if (!data.user) {
        throw new Error('ログインに失敗しました');
      }

      console.log('✅ ログイン成功:', {
        userId: data.user.id,
        email: data.user.email,
        timestamp: new Date().toISOString()
      });

      // セッションの確認を待つ
      await new Promise(resolve => setTimeout(resolve, 500));
      router.refresh();
      router.push('/mypage');
    } catch (error: any) {
      console.error('❌ サインインエラー:', error);
      setError(error.message);
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, router, toast]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 サインアップ処理開始:', { email });
      const supabase = createClientComponentClient<Database>();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            email: email,
            username: email.split('@')[0],
            role: email.includes('admin') ? 'admin' : 'user',
          }
        }
      });

      if (authError) {
        console.error('❌ サインアップエラー:', authError);
        if (authError.message === 'User already registered') {
          throw new Error('このメールアドレスは既に登録されています');
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('ユーザー作成に失敗しました');
      }

      console.log('✅ サインアップ成功:', {
        userId: authData.user.id,
        email: authData.user.email,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "登録完了",
        description: "確認メールを送信しました。メールを確認してください。",
      });
    } catch (error: any) {
      console.error('❌ サインアップエラー:', error);
      setError(error.message);
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [email, password, loading, toast]);

  return (
    <div>
      <Tabs defaultValue="signin" className="w-full">
        <TabsList>
          <TabsTrigger value="signin">ログイン</TabsTrigger>
          <TabsTrigger value="signup">新規登録</TabsTrigger>
        </TabsList>
        <TabsContent value="signin">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">メールアドレス</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signin-password">パスワード</Label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            {error && <div className="text-red-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "処理中..." : "ログイン"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-email">メールアドレス</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">パスワード</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            {error && <div className="text-red-500">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "処理中..." : "新規登録"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}