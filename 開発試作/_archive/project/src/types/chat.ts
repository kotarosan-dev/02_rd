export interface Message {
  id: string;
  conversation_id: string;
  customer_id: string;
  sender_type: 'customer' | 'admin' | 'bot';
  content: string;
  channel: 'web' | 'line' | 'instagram';
  created_at: string;
  is_ai_response: boolean;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  line_user_id?: string;
  instagram_user_id?: string;
  created_at: string;
  avatar_url?: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  channel: 'line' | 'instagram' | 'web';
  updated_at: string;
  last_message?: string;
}

export interface PostgresChangesPayload {
  commit_timestamp: string;
  errors: null | any[];
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Message;
  old: Message | null;
  schema: string;
  table: string;
}