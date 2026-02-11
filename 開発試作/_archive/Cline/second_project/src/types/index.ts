export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: 'user' | 'admin';
}

export interface Post {
    id: string;
    title: string;
    content: string;
    author: string;
    createdAt: string;
    category: '質問' | 'ディスカッション' | 'お知らせ';
    tags: string[];
    likes: number;
    replies: Reply[];
}

export interface Reply {
    id: string;
    content: string;
    author: string;
    createdAt: string;
    likes: number;
}

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

export interface Project {
    id: string;
    title: string;
    description: string;
    creator: string;
    createdAt: string;
    tags: string[];
    imageUrl?: string;
    likes: number;
}

export interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail?: string;
    category: string;
    level: '初級' | '中級' | '上級';
    duration: string;
    enrolledCount: number;
    lessonCount: number;
}