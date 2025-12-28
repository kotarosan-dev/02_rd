import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MessageCircle, Calendar, Shield, Heart, Star, Users, Trophy } from 'lucide-react';

function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-8">
              美容×メンタリングで<br />あなたの人生を輝かせる
            </h1>
            <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
              外見の美しさと内面の自信を調和させ、<br />
              あなたらしい魅力を引き出すトータルビューティーサロン
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/signup" className="bg-pink-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-pink-700 transition-colors">
                無料カウンセリング予約
              </Link>
              <Link to="/services" className="bg-white text-pink-600 px-8 py-3 rounded-lg text-lg font-semibold border-2 border-pink-600 hover:bg-pink-50 transition-colors">
                サービスを見る
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            BeautyConnectの特徴
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <FeatureCard
              icon={<Heart className="h-8 w-8 text-pink-600" />}
              title="トータルビューティーケア"
              description="プロフェッショナルによる美容施術と、心に寄り添うメンタリングで内側から輝く美しさを引き出します。"
            />
            <FeatureCard
              icon={<Star className="h-8 w-8 text-pink-600" />}
              title="パーソナライズドプラン"
              description="お一人おひとりの目標や悩みに合わせて、オーダーメイドの美容プランをご提案します。"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8 text-pink-600" />}
              title="コミュニティサポート"
              description="同じ目標を持つ仲間との交流で、モチベーションを高め合い、継続的な成長をサポートします。"
            />
          </div>
        </div>
      </div>

      {/* Success Stories */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            お客様の声
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={index} {...testimonial} />
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            あなたの新しい一歩を、私たちと共に
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            プロフェッショナルのサポートで、理想の自分に近づきましょう。
            まずは無料カウンセリングからスタート。
          </p>
          <Link
            to="/signup"
            className="inline-block bg-pink-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-pink-700 transition-colors"
          >
            無料カウンセリングを予約する
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-5">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function TestimonialCard({ name, age, comment, image }: {
  name: string;
  age: string;
  comment: string;
  image: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex items-center space-x-4 mb-4">
        <img
          src={image}
          alt={name}
          className="w-16 h-16 rounded-full object-cover"
        />
        <div>
          <h3 className="font-semibold text-gray-900">{name}</h3>
          <p className="text-gray-500">{age}</p>
        </div>
      </div>
      <p className="text-gray-600 italic">"{comment}"</p>
    </div>
  );
}

const testimonials = [
  {
    name: "田中 美咲",
    age: "28歳",
    comment: "美容施術だけでなく、メンタリングを通じて自己肯定感が大きく向上しました。今では自分らしく生きることが楽しいです。",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150"
  },
  {
    name: "佐藤 由美",
    age: "35歳",
    comment: "長年の肌の悩みが解消され、自信を持って過ごせるようになりました。カウンセリングも丁寧で安心できました。",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150"
  },
  {
    name: "山本 恵子",
    age: "42歳",
    comment: "コミュニティでの交流が刺激になり、新しいことにチャレンジする勇気をもらえました。人生が豊かになった実感があります。",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=150&h=150"
  }
];

export default LandingPage;