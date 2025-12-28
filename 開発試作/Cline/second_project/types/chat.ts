import type { Message } from './message';

export type ChannelType = 'line' | 'instagram' | 'direct';

export interface ChatUser {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface ChatChannel {
  id: string;
  userId: string;
  channelType: ChannelType;
  externalId: string | null;
  createdAt: Date;
  lastMessageAt: Date | null;
  metadata: Record<string, unknown>;
  user?: ChatUser;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'image' | 'video';
  isFromUser: boolean;
  createdAt: Date;
  metadata: Record<string, unknown>;
  sender?: ChatUser;
}

export interface AISuggestion {
  id: string;
  channelId: string;
  suggestionType: string;
  content: string;
  createdAt: Date;
  usedAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface ChatHistory {
  id: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  user_id: string;
  title?: string;
} 