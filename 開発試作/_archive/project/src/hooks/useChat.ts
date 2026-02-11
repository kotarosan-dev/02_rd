import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Message, Conversation } from '../types/chat';
import { useAuthStore } from '../store/authStore';
import { generateAIResponse } from '../lib/openai';
import { sendLineMessage } from '../lib/line';

export const useChat = (conversationId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      try {
        let query = supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            customer_id,
            content,
            created_at,
            source,
            is_ai_response,
            customers (
              id,
              name,
              line_user_id,
              instagram_user_id,
              avatar_url
            )
          `)
          .order('created_at', { ascending: false });

        if (!isAdmin) {
          // 一般ユーザーは自分のメッセージのみ表示
          const { data: customerData } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (customerData) {
            query = query.eq('customer_id', customerData.id);
          }
        }

        const { data, error } = await query;

        if (error) throw error;

        // メッセージをグループ化して会話リストを作成
        const conversationMap = new Map<string, Conversation>();
        data?.forEach(message => {
          if (!message.customers) return;
          
          const conversationId = message.conversation_id;
          if (!conversationMap.has(conversationId)) {
            conversationMap.set(conversationId, {
              id: conversationId,
              customer_id: message.customer_id,
              customer_name: message.customers.name,
              last_message: message.content,
              last_message_time: message.created_at,
              customers: message.customers,
              unread: false
            });
          }
        });

        setConversations(Array.from(conversationMap.values()));
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, isAdmin]);

  useEffect(() => {
    if (!conversationId || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          source,
          is_ai_response,
          customer_id
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    };

    fetchMessages();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string, conversation?: Conversation, isAiResponse: boolean = false) => {
    if (!user || !conversationId) return false;

    try {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          customer_id: conversation?.customer_id,
          content,
          sender_id: isAiResponse ? 'ai' : user.id,
          source: 'web',
          is_ai_response: isAiResponse
        });

      if (messageError) throw messageError;

      if (conversation?.customers?.line_user_id) {
        await sendLineMessage(conversation.customers.line_user_id, content);
      }

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  return {
    messages,
    conversations,
    loading,
    sendMessage
  };
};