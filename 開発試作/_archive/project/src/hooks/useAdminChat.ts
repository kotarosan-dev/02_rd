import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Customer, Conversation, Message } from '../types/chat';

export const useAdminChat = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageInput, setMessageInput] = useState('');

  useEffect(() => {
    fetchCustomers();

    const subscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT, UPDATE, DELETEすべてを監視
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // 新しいメッセージを追加
            setMessages(prev => {
              // 重複を防ぐためにIDをチェック
              const exists = prev.some(msg => msg.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new as Message];
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createConversation = async (customerId: string, channel: 'web' | 'line' | 'instagram') => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          channel
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const updateCustomer = async (
    customerId: string,
    updates: {
      name?: string;
      line_user_id?: string | null;
      instagram_user_id?: string | null;
    }
  ) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', customerId);

      if (error) throw error;
      await fetchCustomers();
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  return {
    customers,
    conversations,
    messages,
    loading,
    messageInput,
    setMessageInput,
    setMessages,
    fetchCustomers,
    fetchConversations,
    fetchMessages,
    createConversation,
    updateCustomer
  };
};