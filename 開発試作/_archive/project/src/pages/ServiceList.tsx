import React from 'react';
import { Link } from 'react-router-dom';
import { Scissors, Heart, Sparkles, MessageCircle } from 'lucide-react';

export default function ServiceList() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-gray-900 text-center mb-12">
          サービスメニュー
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => (
            <ServiceCard key={index} {...service} />
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            まずは無料カウンセリングから
          </h2>
          <p className="text-gray-600 mb-6">
            お客様一人ひとりに最適なプランをご提案させていただきます。
            気軽にご相談ください。
          </p>
          <Link
            to="/booking"
            className="inline-block bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
          >
            カウンセリングを予約する
          </Link>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ icon, title, description, price, features }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  price: string;
  features: string[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-8">
        <div className="flex items-center space-x-4 mb-6">
          <div className="p-3 bg-pink-100 rounded-lg">
            {icon}
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-gray-600 mb-6">{description}</p>
        <p className="text-3xl font-bold text-gray-900 mb-6">{price}</p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center space-x-3">
              <Sparkles className="h-5 w-5 text-pink-600" />
              <span className="text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="px-8 pb-8">
        <Link
          to="/booking"
          className="block w-full text-center bg-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors"
        >
          予約する
        </Link>
      </div>
    </div>
  );
}

const services = [
  {
    icon: <Scissors className="h-6 w-6 text-pink-600" />,
    title: "ビューティーケアプラン",
    description: "プロフェッショナルによる美容施術と、パーソナライズされたケアプランをご提供します。",
    price: "¥15,000〜",
    features: [
      "カット・カラー・パーマなどの施術",
      "肌質診断・カウンセリング",
      "ホームケアアドバイス",
      "定期的なメンテナンス"
    ]
  },
  {
    icon: <Heart className="h-6 w-6 text-pink-600" />,
    title: "メンタリングプラン",
    description: "内面からの美しさを引き出す、専門家によるメンタリングプログラムです。",
    price: "¥12,000〜",
    features: [
      "定期的な1on1セッション",
      "目標設定とアクションプラン",
      "セルフイメージ向上ワーク",
      "コミュニティサポート"
    ]
  },
  {
    icon: <Sparkles className="h-6 w-6 text-pink-600" />,
    title: "プレミアムプラン",
    description: "美容施術とメンタリングを組み合わせた、トータルビューティーケアプランです。",
    price: "¥25,000〜",
    features: [
      "ビューティーケア全メニュー利用可能",
      "月2回のメンタリングセッション",
      "専属カウンセラーによるサポート",
      "プライオリティ予約"
    ]
  },
  {
    icon: <MessageCircle className="h-6 w-6 text-pink-600" />,
    title: "オンラインサポートプラン",
    description: "時間や場所を問わず、専門家のアドバイスを受けられるオンラインプランです。",
    price: "¥8,000〜",
    features: [
      "オンラインカウンセリング",
      "ビデオ通話でのアドバイス",
      "24時間チャットサポート",
      "美容＆メンタルケア動画ライブラリ"
    ]
  }
];