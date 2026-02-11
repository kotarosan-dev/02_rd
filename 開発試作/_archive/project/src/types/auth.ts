export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  email: string;
  line_user_id?: string;
  instagram_user_id?: string;
  created_at: string;
} 