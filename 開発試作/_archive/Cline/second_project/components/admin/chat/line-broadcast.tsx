"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { sendMessageToAllLineUsers, sendMessageToLineUsers } from '@/lib/line';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import supabase from '@/lib/supabase';

type SendTarget = 'all' | 'recent' | 'inactive';

export function LineBroadcast() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [target, setTarget] = useState<SendTarget>('all');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    try {
      switch (target) {
        case 'all':
          await sendMessageToAllLineUsers(message.trim());
          break;
        case 'recent':
          // 最近予約したユーザーを取得
          const { data: recentUsers } = await supabase
            .from('appointments')
            .select('user_id')
            .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 過去30日
            .order('created_at', { ascending: false });
          
          if (recentUsers?.length) {
            await sendMessageToLineUsers(
              recentUsers.map(u => u.user_id),
              message.trim()
            );
          }
          break;
        case 'inactive':
          // 3ヶ月以上予約のないユーザーを取得
          const { data: inactiveUsers } = await supabase
            .from('appointments')
            .select('user_id')
            .lt('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });
          
          if (inactiveUsers?.length) {
            await sendMessageToLineUsers(
              inactiveUsers.map(u => u.user_id),
              message.trim()
            );
          }
          break;
      }

      toast({
        title: '送信完了',
        description: 'メッセージを送信しました',
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast({
        title: 'エラー',
        description: 'メッセージの送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>LINE一斉送信</CardTitle>
        <CardDescription>
          選択したLINEユーザーグループにメッセージを送信します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">送信対象</label>
            <Select
              value={target}
              onValueChange={(value: SendTarget) => setTarget(value)}
              disabled={sending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ユーザー</SelectItem>
                <SelectItem value="recent">最近予約したユーザー（30日以内）</SelectItem>
                <SelectItem value="inactive">長期未予約ユーザー（3ヶ月以上）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="送信するメッセージを入力..."
            className="min-h-[100px]"
            disabled={sending}
          />
          <Button type="submit" disabled={!message.trim() || sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sending ? '送信中...' : '送信'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 