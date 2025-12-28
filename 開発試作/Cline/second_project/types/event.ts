export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  capacity: number;
  participants: string[];
  type: 'ワークショップ' | 'セミナー' | '交流会';
  status: '開催予定' | '開催中' | '終了';
} 