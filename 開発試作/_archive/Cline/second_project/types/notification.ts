export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  user_id: string;
  read: boolean;
  created_at: string;
}

export type NotificationInsert = Omit<Notification, 'id' | 'created_at'> & {
  created_at?: string;
}; 