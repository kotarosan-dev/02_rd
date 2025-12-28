import type { Message } from '@/types/message';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div className="p-4 bg-white rounded shadow">
      <p className="text-gray-800">{message.content}</p>
      <small className="text-gray-500">
        {new Date(message.created_at).toLocaleString()}
      </small>
    </div>
  );
}; 