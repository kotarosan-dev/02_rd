import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

type Message = {
  id: string;
  content: string;
  created_at: string;
}

export const ChatContainer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setMessages(data || []);
      } catch (err) {
        setError('Failed to fetch messages');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <div key={message.id} className="p-4 bg-white rounded shadow">
          <p>{message.content}</p>
          <small>{new Date(message.created_at).toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
};