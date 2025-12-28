import supabase from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { ChatHistory } from '@/types/chat';
import { useRouter } from 'next/router';

export default function ChatHistoryComponent() {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchChatHistory = async () => {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat history:', error);
        return;
      }

      setChatHistory(data || []);
    };

    fetchChatHistory();
  }, []);

  const handleChatClick = (chatId: string) => {
    router.push(`/admin/chat/${chatId}`);
  };
}