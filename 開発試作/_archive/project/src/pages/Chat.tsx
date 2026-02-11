import React, { useState, useEffect } from 'react';
import { Send, Image as ImageIcon, Bot } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useAuthStore } from '../store/authStore';
import { generateAIResponse } from '../lib/openai';

export default function Chat() {
  const [message, setMessage] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const { messages, conversations, loading, sendMessage } = useChat(selectedConversation || undefined);
  const { user, isAdmin } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedConversation) return;

    try {
      // 通常のメッセージを送信
      await sendMessage(message, conversations.find(c => c.id === selectedConversation));
      
      // AIサポートが有効な場合、AI応答を生成
      if (isAIEnabled) {
        const aiResponse = await generateAIResponse(message);
        if (aiResponse) {
          await sendMessage(aiResponse, conversations.find(c => c.id === selectedConversation), true);
        }
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex h-[calc(100vh-12rem)]">
        {/* チャットリスト */}
        <div className="w-1/3 border-r border-gray-200 pr-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">メッセージ</h2>
            {isAdmin && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">AIサポート</span>
                <button
                  onClick={() => setIsAIEnabled(!isAIEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isAIEnabled ? 'bg-pink-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isAIEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {conversations.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedConversation(chat.id)}
                className={`cursor-pointer ${
                  selectedConversation === chat.id ? 'bg-pink-50' : ''
                }`}
              >
                <ChatListItem
                  name={chat.customer_name}
                  lastMessage={chat.last_message || ''}
                  time={chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString() : ''}
                  unread={chat.unread}
                  platform={chat.platform}
                />
              </div>
            ))}
          </div>
        </div>

        {/* チャット本文 */}
        <div className="flex-1 flex flex-col pl-4">
          <div className="flex-1 overflow-y-auto space-y-4 pb-4">
            {loading ? (
              <div className="text-center py-4">読み込み中...</div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  sent={msg.sender_id === user.id}
                  time={new Date(msg.created_at).toLocaleTimeString()}
                  isAI={msg.is_ai_response}
                  platform={msg.source}
                />
              ))
            )}
          </div>

          {/* メッセージ入力 */}
          <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="p-2 text-gray-500 hover:text-pink-600 transition-colors"
              >
                <ImageIcon className="h-6 w-6" />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                type="submit"
                disabled={!message.trim() || !selectedConversation}
                className="bg-pink-600 text-white p-2 rounded-lg hover:bg-pink-700 transition-colors disabled:bg-pink-300"
              >
                <Send className="h-6 w-6" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatListItem({ name, lastMessage, time, unread, platform }: {
  name: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  platform?: 'line' | 'instagram' | 'web';
}) {
  const getPlatformIcon = () => {
    switch (platform) {
      case 'line':
        return '🇱';
      case 'instagram':
        return '📸';
      default:
        return '💻';
    }
  };

  return (
    <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
        <span className="text-lg font-medium text-gray-600">
          {name.charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-900">{name}</h3>
          <span className="text-sm text-gray-500">{getPlatformIcon()}</span>
        </div>
        <p className="text-sm text-gray-500 truncate">{lastMessage}</p>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
      {unread && (
        <div className="w-3 h-3 bg-pink-600 rounded-full"></div>
      )}
    </div>
  );
}

function MessageBubble({ content, sent, time, isAI, platform }: {
  content: string;
  sent: boolean;
  time: string;
  isAI?: boolean;
  platform?: string;
}) {
  return (
    <div className={`flex ${sent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          sent
            ? 'bg-pink-600 text-white'
            : isAI
            ? 'bg-purple-100 text-gray-900'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isAI && (
          <div className="text-xs text-purple-600 font-medium mb-1">AI アシスタント</div>
        )}
        {platform && !sent && !isAI && (
          <div className="text-xs text-gray-500 mb-1">
            via {platform.toUpperCase()}
          </div>
        )}
        <p>{content}</p>
        <p className={`text-xs mt-1 ${sent ? 'text-pink-100' : 'text-gray-500'}`}>
          {time}
        </p>
      </div>
    </div>
  );
}