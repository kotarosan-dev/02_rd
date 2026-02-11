import React, { useState } from 'react';
import { Play, Clock, BookOpen, Star, Camera, Sparkles } from 'lucide-react';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  category: string;
  views: number;
  rating: number;
}

interface Tutorial {
  id: string;
  title: string;
  description: string;
  image: string;
  steps: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export default function Learn() {
  const [activeTab, setActiveTab] = useState<'videos' | 'tutorials' | 'ai'>('videos');

  const videos: Video[] = [
    {
      id: '1',
      title: 'ナチュラルメイクの基本テクニック',
      thumbnail: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&h=300&fit=crop',
      duration: '10:30',
      category: 'メイク',
      views: 1200,
      rating: 4.8
    },
    {
      id: '2',
      title: 'スキンケアの正しい手順',
      thumbnail: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=500&h=300&fit=crop',
      duration: '15:45',
      category: 'スキンケア',
      views: 890,
      rating: 4.6
    }
  ];

  const tutorials: Tutorial[] = [
    {
      id: '1',
      title: '韓国風グラデーションリップの作り方',
      description: '人気の韓国メイクを簡単に実現！',
      image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&h=300&fit=crop',
      steps: 5,
      difficulty: 'intermediate'
    },
    {
      id: '2',
      title: 'ナイトケアルーティーン',
      description: '寝ている間に美肌を育てる方法',
      image: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=500&h=300&fit=crop',
      steps: 7,
      difficulty: 'beginner'
    }
  ];

  const handleImageAnalysis = () => {
    // AIによる画像分析のデモ実装
    alert('肌分析を開始します。実際の実装では、カメラを起動して肌の状態を分析します。');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">学習コンテンツ</h1>

      <div className="flex space-x-4 mb-8">
        <button
          onClick={() => setActiveTab('videos')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'videos'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Play className="inline-block h-5 w-5 mr-2" />
          ビデオライブラリ
        </button>
        <button
          onClick={() => setActiveTab('tutorials')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'tutorials'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <BookOpen className="inline-block h-5 w-5 mr-2" />
          チュートリアル
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 rounded-lg font-medium ${
            activeTab === 'ai'
              ? 'bg-pink-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Sparkles className="inline-block h-5 w-5 mr-2" />
          AI分析
        </button>
      </div>

      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                  {video.duration}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-2">{video.title}</h3>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{video.category}</span>
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span>{video.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'tutorials' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tutorials.map((tutorial) => (
            <div key={tutorial.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <img
                src={tutorial.image}
                alt={tutorial.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tutorial.title}</h3>
                <p className="text-gray-600 mb-4">{tutorial.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{tutorial.steps}ステップ</span>
                  <span className={`px-3 py-1 rounded-full ${
                    tutorial.difficulty === 'beginner'
                      ? 'bg-green-100 text-green-800'
                      : tutorial.difficulty === 'intermediate'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {tutorial.difficulty === 'beginner' ? '初級' : tutorial.difficulty === 'intermediate' ? '中級' : '上級'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'ai' && (
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="max-w-2xl mx-auto text-center">
            <Camera className="h-16 w-16 text-pink-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">AIによる肌分析</h2>
            <p className="text-gray-600 mb-8">
              カメラで肌を撮影すると、AIが肌の状態を分析し、
              パーソナライズされたケアアドバイスを提供します。
            </p>
            <button
              onClick={handleImageAnalysis}
              className="bg-pink-600 text-white px-8 py-3 rounded-lg hover:bg-pink-700 transition-colors"
            >
              分析を開始
            </button>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">肌状態診断</h3>
                <p className="text-sm text-gray-600">
                  肌のキメ、ハリ、くすみなどを分析し、現在の肌状態を評価します。
                </p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">パーソナルカラー</h3>
                <p className="text-sm text-gray-600">
                  あなたに最適な色味を提案し、メイクやファッションに活かせます。
                </p>
              </div>
              <div className="p-4 bg-pink-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">ケアアドバイス</h3>
                <p className="text-sm text-gray-600">
                  分析結果に基づいて、最適なスキンケア方法をご提案します。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}