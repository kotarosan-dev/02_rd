import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageCircle, Send, Edit2, X } from 'lucide-react';
import { useAdminChat } from '../../hooks/useAdminChat';
import { Customer, Conversation, Message, PostgresChangesPayload } from '../../types/chat';
import { supabase } from '../../lib/supabase';

const CHANNELS = [
  { id: 'instagram', name: 'INSTAGRAM', emoji: '📸', idKey: 'instagram_user_id' },
  { id: 'line', name: 'LINE', emoji: '💬', idKey: 'line_user_id' },
  { id: 'web', name: 'WEB', emoji: '💻' }
] as const;

export default function AdminChat() {
  const {
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
  } = useAdminChat();

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    name: string;
    line_user_id: string;
    instagram_user_id: string;
  }>({
    name: '',
    line_user_id: '',
    instagram_user_id: ''
  });

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedConversation(null);
    if (customer) {
      fetchConversations(customer.id);
    }
  };

  const handleConversationSelect = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    if (conversation) {
      console.log('Fetching messages for conversation:', conversation.id);
      await fetchMessages(conversation.id);
    }
  };

  const handleCreateChannel = async (channel: 'web' | 'line' | 'instagram') => {
    if (!selectedCustomer) return;
    
    try {
      const conversation = await createConversation(selectedCustomer.id, channel);
      if (conversation) {
        fetchConversations(selectedCustomer.id);
      }
    } catch (error: any) {
      if (error.code === '23505') {
        // 既に存在する場合は無視
        return;
      }
      console.error('Error creating channel:', error);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedCustomer || !message.trim()) return;

    const success = await sendLineMessage(selectedCustomer.id, message);
    if (success) {
      // メッセージ送信成功時の処理（必要に応じて追加）
    } else {
      // エラー処理
      alert('メッセージの送信に失敗しました');
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer({
      name: customer.name,
      line_user_id: customer.line_user_id || '',
      instagram_user_id: customer.instagram_user_id || ''
    });
    setIsEditingCustomer(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      // プロフィールも同時に更新
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', selectedCustomer.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ display_name: editingCustomer.name })
          .eq('user_id', profile.user_id);
      }

      // 顧客情報を更新
      await updateCustomer(selectedCustomer.id, {
        name: editingCustomer.name,
        line_user_id: editingCustomer.line_user_id || null,
        instagram_user_id: editingCustomer.instagram_user_id || null
      });

      setIsEditingCustomer(false);
      fetchConversations(selectedCustomer.id);
    } catch (error) {
      console.error('Error updating customer:', error);
    }
  };

  const isChannelConnected = (channel: typeof CHANNELS[number]) => {
    if (channel.id === 'web') return true;
    if (!selectedCustomer) return false;
    return Boolean(selectedCustomer[channel.idKey as keyof Customer]);
  };

  const sendLineMessage = async (customerId: string, message: string) => {
    try {
      if (!selectedConversation) return false;

      setMessageInput(''); // 入力欄をクリア

      // まず顧客情報を取得
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) {
        console.error('Customer fetch error:', customerError);
        throw new Error('Failed to fetch customer data');
      }

      if (!customer?.line_user_id) {
        throw new Error('Customer LINE ID not found');
      }

      const response = await fetch(`/api/line-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId,
          message,
          lineUserId: customer.line_user_id
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Server response:', errorData);
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!selectedConversation) return;

    console.log('Setting up subscription for conversation:', selectedConversation.id);

    // リアルタイムサブスクリプションを設定
    const channel = supabase
      .channel(`messages-${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',  // INSERTイベントのみ監視
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload: PostgresChangesPayload) => {
          console.log('Received message event:', payload);
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              // 重複チェック
              const isDuplicate = prev.some(msg => msg.id === newMessage.id);
              if (isDuplicate) {
                console.log('Duplicate message detected:', newMessage.id);
                return prev;
              }
              console.log('Adding new message:', newMessage);
              return [...prev, newMessage];
            });
            // 新しいメッセージが来たら自動スクロール
            setTimeout(scrollToBottom, 100);
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up subscription');
      channel.unsubscribe();
    };
  }, [selectedConversation?.id]); // 依存配列を正確に指定

  // メッセージ一覧の自動スクロール
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // メッセージが更新されたら自動スクロール
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-12 gap-6">
          {/* Customer List */}
          <div className="col-span-3 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">顧客一覧</h2>
              </div>
            </div>
            <div className="space-y-2">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className={`relative group ${
                    selectedCustomer?.id === customer.id
                      ? 'bg-pink-50'
                      : 'hover:bg-gray-50'
                  } rounded-lg`}
                >
                  <button
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full text-left p-3 flex items-center space-x-3"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      {customer.avatar_url ? (
                        <img
                          src={customer.avatar_url}
                          alt={customer.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <span className="text-gray-500">{customer.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <div className="flex space-x-2 text-xs text-gray-500">
                        {customer.line_user_id && <span>LINE</span>}
                        {customer.instagram_user_id && <span>Instagram</span>}
                        <span>Web</span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleEditCustomer(customer)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Channel List */}
          <div className="col-span-3 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-2 mb-6">
                <MessageCircle className="h-5 w-5 text-gray-500" />
                <h2 className="text-lg font-medium text-gray-900">チャンネル</h2>
              </div>

              {selectedCustomer ? (
                <div className="space-y-3">
                  {CHANNELS.map((channel) => {
                    const isConnected = isChannelConnected(channel);
                    const conversation = conversations.find(c => c.channel === channel.id);
                    const isSelected = selectedConversation?.channel === channel.id;

                    return (
                      <div
                        key={channel.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'bg-pink-50 border-pink-200'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span>{channel.emoji}</span>
                            <span className="font-medium">{channel.name}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isConnected
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {isConnected ? '接続済み' : '未接続'}
                          </span>
                        </div>
                        {conversation ? (
                          <button
                            onClick={() => handleConversationSelect(conversation)}
                            className="w-full text-left"
                          >
                            <div className="text-xs text-gray-500">
                              最終更新: {new Date(conversation.updated_at).toLocaleDateString()}
                            </div>
                            {conversation.last_message && (
                              <p className="mt-1 text-sm text-gray-600 truncate">
                                {conversation.last_message}
                              </p>
                            )}
                          </button>
                        ) : isConnected ? (
                          <button
                            onClick={() => handleCreateChannel(channel.id as any)}
                            className="text-sm text-pink-600 hover:text-pink-700"
                          >
                            チャットを開始
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-8">
                  顧客を選択してください
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-6 bg-white rounded-lg shadow-sm p-4">
            {selectedConversation ? (
              <div className="flex flex-col h-[calc(100vh-12rem)]">
                <div className="flex-1 overflow-y-auto space-y-4 p-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_type === 'admin'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.sender_type === 'admin'
                            ? 'bg-pink-600 text-white'
                            : message.sender_type === 'customer'
                            ? 'bg-gray-100'
                            : 'bg-purple-100'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="flex-1 rounded-lg border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(messageInput);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSendMessage(messageInput)}
                      disabled={!messageInput.trim()}
                      className="p-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-pink-300"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[calc(100vh-12rem)] flex items-center justify-center text-gray-500">
                チャンネルを選択してチャットを開始
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Edit Modal */}
      {isEditingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">顧客情報の編集</h3>
              <button
                onClick={() => setIsEditingCustomer(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  表示名
                </label>
                <input
                  type="text"
                  value={editingCustomer.name}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  LINE ユーザーID
                </label>
                <input
                  type="text"
                  value={editingCustomer.line_user_id}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, line_user_id: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instagram ユーザーID
                </label>
                <input
                  type="text"
                  value={editingCustomer.instagram_user_id}
                  onChange={(e) =>
                    setEditingCustomer({ ...editingCustomer, instagram_user_id: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                />
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsEditingCustomer(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}