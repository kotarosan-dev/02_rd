import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Heart, Share2, Award, Users, Search } from 'lucide-react';

interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  category: string;
  createdAt: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  participants: number;
  daysLeft: number;
  image: string;
}

export default function Community() {
  const [activeTab, setActiveTab] = useState<'posts' | 'challenges'>('posts');
  const [searchQuery, setSearchQuery] = useState('');

  const posts: Post[] = [
    {
      id: '1',
      author: {
        name: '田中美咲',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=50&h=50&fit=crop'
      },
      content: 'スキンケアルーティンを見直して、肌の調子が良くなってきました！おすすめの化粧水があれば教えてください。',
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=300&fit=crop',
      likes: 24,
      comments: 8,
      category: 'スキンケア',
      createdAt: '2024-03-01T10:00:00'
    },
    {
      id: '2',
      author: {
        name: '佐藤由美',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=50&h=50&fit=crop'
      },
      content: '今日のメイクレッスンで学んだポイントをシェアします！アイシャドウの色選びが難しかったけど、プロのアドバイスで理想の目元が作れました✨',
      likes: 42,
      comments: 12,
      category: 'メイク',
      createdAt: '2024-03-01T09:30:00'
    }
  ];

  const challenges: Challenge[] = [
    {
      id: '1',
      title: '30日スキンケアチャレンジ',
      description: '毎日の丁寧なスキンケアで、肌質改善を目指しましょう！',
      participants: 156,
      daysLeft: 20,
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=300&fit=crop'
    },
    {
      id: '2',
      title: '朝活メイクアップ',
      description: '15分以内での完璧メイクにチャレンジ！時短テクニックを共有しましょう。',
      participants: 89,
      daysLeft: 15,
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&h=300&fit=crop'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">コミュニティ</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
      </div>

      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'posts'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <MessageSquare className="inline-block h-5 w-5 mr-2" />
          投稿
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'challenges'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Award className="inline-block h-5 w-5 mr-2" />
          チャレンジ
        </button>
      </div>

      {activeTab === 'posts' ? (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center mb-4">
                <img
                  src={post.author.avatar}
                  alt={post.author.name}
                  className="w-10 h-10 rounded-full"
                />
                <div className="ml-3">
                  <p className="font-medium text-gray-900">{post.author.name}</p>
                  <p className="text-sm text-gray-500">{post.category}</p>
                </div>
              </div>
              <p className="text-gray-800 mb-4">{post.content}</p>
              {post.image && (
                <img
                  src={post.image}
                  alt="Post content"
                  className="rounded-lg mb-4 w-full"
                />
              )}
              <div className="flex items-center space-x-6 text-gray-500">
                <button className="flex items-center space-x-2 hover:text-pink-600">
                  <Heart className="h-5 w-5" />
                  <span>{post.likes}</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-pink-600">
                  <MessageSquare className="h-5 w-5" />
                  <span>{post.comments}</span>
                </button>
                <button className="flex items-center space-x-2 hover:text-pink-600">
                  <Share2 className="h-5 w-5" />
                  <span>シェア</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => (
            <div key={challenge.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img
                src={challenge.image}
                alt={challenge.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{challenge.title}</h3>
                <p className="text-gray-600 mb-4">{challenge.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{challenge.participants}人参加中</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>残り{challenge.daysLeft}日</span>
                  </div>
                </div>
                <button className="mt-4 w-full bg-pink-600 text-white py-2 rounded-lg hover:bg-pink-700 transition-colors">
                  チャレンジに参加
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}