import supabase from '@/lib/supabase';
import { useEffect, useState } from 'react';
import type { Message } from '@/types/message';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/router';
import { ChatMessage } from './chat-message';

export const ChatContent = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          variant: 'destructive',
          title: 'エラーが発生しました',
          description: 'メッセージの取得に失敗しました',
        });
      }
    };

    fetchMessages();
  }, [toast]);

  // ... existing code ...
};
