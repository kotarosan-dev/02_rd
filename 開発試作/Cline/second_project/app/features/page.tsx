import { Sparkles, Calendar, Gift, Target, Users, Shield, Star, Heart, MessageCircle, Award, Image, Video, Brain, Trophy, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const mainFeatures = [
  {
    title: "スマートな予約管理",
    description: "24時間いつでも予約可能。お好みの日時とメニューを選んで簡単に予約できます。予約状況をリアルタイムで確認し、LINEでリマインドも。",
    icon: Calendar,
    color: "bg-pink-500",
    benefits: ["24時間予約可能", "LINEリマインド", "簡単操作"]
  },
  {
    title: "ポイント＆特典システム",
    description: "ご利用に応じてポイントが貯まり、様々な特典と交換可能。会員ランクに応じて特別なサービスもご用意しています。",
    icon: Gift,
    color: "bg-purple-500",
    benefits: ["来店でポイント獲得", "特典と交換可能", "会員ランク制度"]
  },
  {
    title: "目標達成サポート",
    description: "あなたの美容目標を設定し、達成までをサポート。プロフェッショナルのアドバイスと進捗管理で、理想の自分に近づけます。",
    icon: Target,
    color: "bg-blue-500",
    benefits: ["目標設定機能", "進捗管理", "プロのアドバイス"]
  }
];

const communityFeatures = [
  {
    title: "コミュニティフォーラム",
    description: "同じ目標を持つ仲間と繋がり、情報交換やモチベーション維持をサポート。美容の悩みや成功体験を共有できます。",
    icon: Users,
    color: "bg-green-500",
    benefits: ["経験シェア", "質問と回答", "仲間作り"]
  },
  {
    title: "ビフォーアフターギャラリー",
    description: "実際の施術例や成功事例をビジュアルで確認。あなたの理想のイメージ作りをサポートします。",
    icon: Image,
    color: "bg-yellow-500",
    benefits: ["成功事例紹介", "変化の可視化", "イメージ共有"]
  },
  {
    title: "ビデオライブラリ",
    description: "美容テクニックやセルフケアのハウツー動画が見放題。プロのテクニックを動画で学べます。",
    icon: Video,
    color: "bg-red-500",
    benefits: ["テクニック動画", "セルフケアガイド", "モチベーション向上"]
  }
];

const techFeatures = [
  {
    title: "AIによる画像分析",
    description: "最新のAI技術で肌状態を診断。パーソナルカラー診断や、あなたに最適なケアをご提案します。",
    icon: Brain,
    color: "bg-indigo-500",
    benefits: ["肌状態診断", "カラー診断", "ケア提案"]
  },
  {
    title: "プログレスチャート",
    description: "自己肯定感スコアや美容目標の達成度を可視化。あなたの成長を数値とグラフで確認できます。",
    icon: LineChart,
    color: "bg-cyan-500",
    benefits: ["進捗可視化", "目標管理", "成長記録"]
  },
  {
    title: "チャレンジイベント",
    description: "定期的な美容チャレンジで楽しく目標達成。参加者同士で励まし合いながら、理想の自分に近づきます。",
    icon: Trophy,
    color: "bg-amber-500",
    benefits: ["期間限定目標", "仲間との挑戦", "達成報酬"]
  }
];

const highlights = [
  {
    icon: Star,
    title: "98%の顧客満足度",
    description: "多くのお客様に満足いただいています"
  },
  {
    icon: Heart,
    title: "85%のリピート率",
    description: "継続的にご利用いただいています"
  },
  {
    icon: MessageCircle,
    title: "24時間サポート",
    description: "いつでもご相談いただけます"
  },
  {
    icon: Award,
    title: "業界最高評価",
    description: "数々の賞を受賞しています"
  }
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* ヒーローセクション */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20 z-0" />
        <div className="container mx-auto px-4 py-24 relative z-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/10 text-pink-600 mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Inner Glow Beauty の特徴</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
              美容サロンでの体験を、
              <br />
              もっと素晴らしいものに
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Inner Glow Beauty は、予約管理からポイント制度、コミュニティまで。
              あなたの美容体験をトータルでサポートします。
            </p>
          </div>
        </div>
      </div>

      {/* ハイライト */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {highlights.map((highlight) => (
            <div
              key={highlight.title}
              className="text-center p-4 rounded-lg border bg-card"
            >
              <highlight.icon className="w-8 h-8 mx-auto mb-3 text-pink-600" />
              <h3 className="font-semibold mb-1">{highlight.title}</h3>
              <p className="text-sm text-muted-foreground">{highlight.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 基本機能 */}
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">基本機能</h2>
          <p className="text-lg text-muted-foreground">
            使いやすさを追求した、便利な基本機能をご用意
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mainFeatures.map((feature) => (
            <div
              key={feature.title}
              className="relative group rounded-xl border p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${feature.color}`} />
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* コミュニティ機能 */}
      <div className="container mx-auto px-4 py-24 bg-gradient-to-b from-background to-pink-50/50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">コミュニティ機能</h2>
          <p className="text-lg text-muted-foreground">
            仲間と共に成長する、新しい美容体験
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {communityFeatures.map((feature) => (
            <div
              key={feature.title}
              className="relative group rounded-xl border p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 bg-background"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${feature.color}`} />
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* テクノロジー機能 */}
      <div className="container mx-auto px-4 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">最新テクノロジー</h2>
          <p className="text-lg text-muted-foreground">
            AIと最新技術で、より効果的な美容体験を
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {techFeatures.map((feature) => (
            <div
              key={feature.title}
              className="relative group rounded-xl border p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity ${feature.color}`} />
              <div className="relative">
                <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground mb-4">{feature.description}</p>
                <div className="space-y-2">
                  {feature.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-600" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTAセクション */}
      <div className="container mx-auto px-4 py-24">
        <div className="relative rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-600 to-purple-600 opacity-90" />
          <div className="relative z-10 p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              新しい美容体験を始めましょう
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Inner Glow Beauty で、より便利で充実したサロン体験を。
              <br />
              まずは無料会員登録から。
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild className="bg-white hover:bg-white/90 text-pink-600">
                <Link href="/auth">
                  無料会員登録
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/services">
                  サービス一覧を見る
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 