import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, User, Tag, ChevronRight } from 'lucide-react';

export default function Blog() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">ビューティーブログ</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <BlogCard key={post.id} {...post} />
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">カテゴリー</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/blog/category/${category.id}`}
                className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <span className="font-medium text-gray-900">{category.name}</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogCard({ title, excerpt, image, author, date, category }: BlogPost) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <img
        src={image}
        alt={title}
        className="w-full h-48 object-cover"
      />
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className="px-3 py-1 bg-pink-100 text-pink-600 rounded-full text-sm">
            {category}
          </span>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{excerpt}</p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{author}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>{date}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  author: string;
  date: string;
  category: string;
}

const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: '自己肯定感を高める5つの習慣',
    excerpt: '日々の小さな習慣が、あなたの自信と内面の美しさを育てます。実践的なアドバイスをご紹介します。',
    image: 'https://images.unsplash.com/photo-1515023115689-589c33041d3c?auto=format&fit=crop&w=800&h=400',
    author: '山田 美咲',
    date: '2024.03.01',
    category: 'メンタルケア'
  },
  {
    id: '2',
    title: '春のスキンケア特集',
    excerpt: '季節の変わり目に気をつけたいスキンケアのポイントと、おすすめのケア方法をご紹介します。',
    image: 'https://images.unsplash.com/photo-1498843053639-170ff2122f35?auto=format&fit=crop&w=800&h=400',
    author: '佐藤 由美',
    date: '2024.02.28',
    category: 'ビューティーケア'
  },
  {
    id: '3',
    title: 'パーソナルカラーの見つけ方',
    excerpt: 'あなたに最適な色を見つけることで、メイクやファッションがもっと楽しくなります。',
    image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&w=800&h=400',
    author: '田中 美香',
    date: '2024.02.25',
    category: 'メイク'
  }
];

const categories = [
  { id: 'beauty', name: 'ビューティーケア' },
  { id: 'mental', name: 'メンタルケア' },
  { id: 'makeup', name: 'メイク' },
  { id: 'lifestyle', name: 'ライフスタイル' }
];