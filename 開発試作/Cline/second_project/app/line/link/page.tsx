"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import supabase from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export default function LineLinkPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function linkAccount() {
      if (!searchParams) return;
      const token = searchParams.get('token');
      if (!token) {
        setError('トークンが見つかりません');
        setLoading(false);
        return;
      }

      try {
        // ユーザーの認証状態を確認
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          // 未ログインの場合はログインページにリダイレクト
          router.push(`/auth?redirect=/line/link?token=${token}`);
          return;
        }

        // トークンの検証と更新
        const { data: linkToken, error: linkError } = await supabase
          .from('line_link_tokens')
          .select('*')
          .eq('token', token)
          .is('used_at', null)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (linkError || !linkToken) {
          setError('無効なトークンです');
          setLoading(false);
          return;
        }

        // トークンを使用済みにマーク
        const { error: updateError } = await supabase
          .from('line_link_tokens')
          .update({
            user_id: user.id,
            used_at: new Date().toISOString(),
          })
          .eq('id', linkToken.id);

        if (updateError) throw updateError;

        // チャンネルの所有者を更新
        const { error: channelError } = await supabase
          .from('chat_channels')
          .update({
            user_id: user.id,
          })
          .eq('id', linkToken.channel_id);

        if (channelError) throw channelError;

        toast({
          title: '連携完了',
          description: 'LINEアカウントとの連携が完了しました',
        });

        // チャット画面にリダイレクト
        router.push(`/admin/chat?channel=${linkToken.channel_id}`);
      } catch (err) {
        console.error('Error linking account:', err);
        setError('アカウントの連携に失敗しました');
      } finally {
        setLoading(false);
      }
    }

    linkAccount();
  }, [searchParams, router, toast]);

  if (loading) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>LINEアカウントの連携</CardTitle>
            <CardDescription>アカウントの連携を行っています...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-lg py-12">
        <Card>
          <CardHeader>
            <CardTitle>エラー</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => router.push('/')}
            >
              トップページに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
} 