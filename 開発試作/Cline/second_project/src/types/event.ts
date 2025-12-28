export interface Event {
  id: string;
  title: string;
  description: string;
  image?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  capacity: number;
  participants: string[];
  status: '開催予定' | '開催中' | '終了';
  createdAt: Date;
  updatedAt: Date;
} 