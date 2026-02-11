export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'customer' | 'staff';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Conversation = {
  id: string;
  profile_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
};

export type Message = {
  id: string;
  conversation_id: string;
  profile_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  created_at: string;
  profile?: Profile;
};