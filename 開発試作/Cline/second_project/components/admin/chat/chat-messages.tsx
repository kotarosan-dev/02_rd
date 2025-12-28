"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getMessages, markMessagesAsRead } from '@/lib/chat';
import { Loader2, AlertCircle } from 'lucide-react';
import supabase from '@/lib/supabase';

interface ChatMessagesProps {
  channelId: string;
}

// メッセージのマッピング関数
function mapMessage(data: any): ChatMessage {
  return {
    id: data.id,
    channelId: data.channel_id,
    senderId: data.sender_id,
    content: data.content,
    messageType: data.message_type,
    isFromUser: data.is_from_user,
    createdAt: new Date(data.created_at),
    metadata: data.metadata,
    sender: data.profiles ? {
      id: data.profiles.id,
      fullName: data.profiles.full_name,
      avatarUrl: data.profiles.avatar_url,
    } : undefined,
  };
}

export function ChatMessages({ channelId }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // スクロール位置を最下部に移動する関数
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  // メッセージの取得
  useEffect(() => {
    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);
        const data = await getMessages(channelId);
        // 古いメッセージが上、新しいメッセージが下になるように並び替え
        setMessages(data.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
        
        // メッセージを既読にする
        await markMessagesAsRead(channelId);
      } catch (err) {
        console.error('メッセージの取得に失敗:', err);
        setError('メッセージの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [channelId]);

  // 初期表示時とメッセージ更新時に最下部にスクロール
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [loading, messages.length, scrollToBottom]);

  // リアルタイム更新の設定
  useEffect(() => {
    console.log('Setting up realtime subscription for channel:', channelId);

    // メッセージの追加を監視
    const channel = supabase
      .channel(`chat_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          console.log('Received database change:', payload);
          console.log('Event type:', payload.eventType);
          console.log('New data:', payload.new);
          
          if (payload.eventType !== 'INSERT') return;

          // 新しいメッセージの詳細を取得
          const { data: newMessage, error } = await supabase
            .from('chat_messages')
            .select(`
              *,
              profiles!chat_messages_sender_id_fkey (
                id,
                full_name,
                avatar_url
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('Error fetching new message details:', error);
            return;
          }

          console.log('Fetched message details:', newMessage);

          if (newMessage) {
            const mappedMessage = mapMessage(newMessage);
            console.log('Mapped message:', mappedMessage);
            
            setMessages(prev => {
              // 既に同じIDのメッセージが存在する場合は追加しない
              if (prev.some(msg => msg.id === mappedMessage.id)) {
                return prev;
              }
              const newMessages = [...prev, mappedMessage];
              // 新しいメッセージが追加されたら最下部にスクロール
              requestAnimationFrame(() => {
                scrollToBottom();
              });
              return newMessages;
            });
            
            // 自分が送信したメッセージでない場合は既読にする
            if (!mappedMessage.isFromUser) {
              await markMessagesAsRead(channelId);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to channel:', channelId);
        } else if (status === 'CLOSED') {
          console.log('Channel subscription closed for:', channelId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error for:', channelId);
        }
      });

    return () => {
      console.log('Cleaning up realtime subscription for channel:', channelId);
      supabase.removeChannel(channel).then(() => {
        console.log('Channel removed successfully');
      }).catch((error) => {
        console.error('Error removing channel:', error);
      });
    };
  }, [channelId, scrollToBottom]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground">
            メッセージはありません
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.isFromUser ? 'flex-row' : 'flex-row-reverse'
              }`}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={message.sender?.avatarUrl || undefined} />
                <AvatarFallback>
                  {message.sender?.fullName?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <div className={`flex flex-col ${message.isFromUser ? 'items-start' : 'items-end'} max-w-[85%] sm:max-w-[75%] md:max-w-[70%]`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    {message.sender?.fullName || '名称未設定'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(message.createdAt, {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                </div>
                <div
                  className={`mt-1 rounded-lg px-3 py-2 break-words ${
                    message.isFromUser
                      ? 'bg-muted'
                      : 'bg-primary text-primary-foreground'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
} 