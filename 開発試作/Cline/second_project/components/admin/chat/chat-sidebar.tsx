"use client";

import { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';
import type { ChatChannel } from '@/types/chat';
import { getChannels, createChannel } from '@/lib/chat';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import supabase from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export interface ChatSidebarProps {
  selectedChannelId?: string;
  onChannelSelect?: () => void;
}

export function ChatSidebar({ selectedChannelId, onChannelSelect }: ChatSidebarProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // チャンネル一覧の取得
  useEffect(() => {
    async function loadChannels() {
      try {
        const data = await getChannels();
        setChannels(data);
      } catch (error) {
        console.error('チャンネル一覧の取得に失敗:', error);
      } finally {
        setLoading(false);
      }
    }
    loadChannels();
  }, []);

  // 新規チャット作成
  const handleNewChat = async () => {
    try {
      const newChannel = await createChannel();
      router.push(`/admin/chat?channel=${newChannel.id}`);
      onChannelSelect?.();
    } catch (error) {
      console.error('新規チャット作成に失敗:', error);
    }
  };

  // チャンネル選択
  const handleChannelSelect = (channelId: string) => {
    router.push(`/admin/chat?channel=${channelId}`);
    onChannelSelect?.();
  };

  // リアルタイム更新の設定
  useEffect(() => {
    const channel = supabase
      .channel('chat_channels')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
        },
        async () => {
          const data = await getChannels();
          setChannels(data);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex h-full flex-col border-r bg-background">
      {/* モバイル用ヘッダー */}
      <div className="flex items-center p-4 border-b md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin')}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="font-medium">チャンネル一覧</div>
      </div>

      <div className="p-4 border-b">
        <Button 
          className="w-full text-lg md:text-sm py-6 md:py-2" 
          onClick={handleNewChat}
          size="lg"
        >
          <Plus className="h-6 w-6 md:h-5 md:w-5 mr-2" />
          新規チャット
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 md:p-2 md:space-y-2">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : channels.length === 0 ? (
            <div className="text-center p-4 text-muted-foreground">
              チャットがありません
            </div>
          ) : (
            channels.map((channel) => (
              <Button
                key={channel.id}
                variant="ghost"
                onClick={() => handleChannelSelect(channel.id)}
                className={cn(
                  "w-full flex items-center justify-start gap-4 p-6 md:p-4 h-auto",
                  "text-left hover:bg-accent/80 transition-colors",
                  "active:scale-[0.98] touch-manipulation",
                  "min-h-[5rem] md:min-h-[4rem]",
                  selectedChannelId === channel.id && "bg-accent"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-lg md:text-sm font-medium truncate mb-1">
                    {(channel.user?.fullName || channel.metadata?.userName || 'チャット') as string}
                  </p>
                  <p className="text-base md:text-xs text-muted-foreground truncate">
                    {channel.lastMessageAt ? (
                      formatDistanceToNow(channel.lastMessageAt, {
                        addSuffix: true,
                        locale: ja,
                      })
                    ) : (
                      '新規チャット'
                    )}
                  </p>
                </div>
                {channel.channelType === 'line' && (
                  <span className="shrink-0 text-base md:text-xs bg-green-500 text-white px-4 py-2 md:px-3 md:py-1.5 rounded-full">
                    LINE
                  </span>
                )}
              </Button>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 