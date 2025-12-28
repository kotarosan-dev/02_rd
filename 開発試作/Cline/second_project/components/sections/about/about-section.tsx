"use client";

import { Card } from "@/components/ui/card";
import { Heart, Star, Users, Award } from "lucide-react";

const stats = [
  {
    label: "お客様満足度",
    value: "98%",
    icon: Heart,
    description: "お客様アンケートによる満足度評価"
  },
  {
    label: "リピート率",
    value: "85%",
    icon: Star,
    description: "初回のお客様の再来店率"
  },
  {
    label: "累計来店数",
    value: "10,000+",
    icon: Users,
    description: "オープンからの累計来店者数"
  },
  {
    label: "受賞歴",
    value: "5+",
    icon: Award,
    description: "業界内コンテストでの受賞数"
  }
];

const values = [
  {
    title: "お客様第一主義",
    description: "お客様一人一人のニーズに合わせたカスタマイズされたサービスを提供します。"
  },
  {
    title: "プロフェッショナリズム",
    description: "最新の技術と知識を常に学び続け、高品質なサービスを提供します。"
  },
  {
    title: "心身の調和",
    description: "外見の美しさだけでなく、内面からの輝きを引き出すことを大切にしています。"
  },
  {
    title: "持続可能性",
    description: "環境に配慮した製品選定と、長期的な美容健康管理を重視します。"
  }
];

export function AboutSection() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Inner Glow Beautyについて
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            私たちは、美容とメンタリングを融合させた新しいアプローチで、
            お客様の内側と外側の美しさを引き出すお手伝いをしています。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6 text-center">
              <div className="flex justify-center mb-4">
                <stat.icon className="h-8 w-8 text-pink-600" />
              </div>
              <div className="text-3xl font-bold mb-2">{stat.value}</div>
              <div className="text-lg font-semibold mb-2">{stat.label}</div>
              <div className="text-gray-600 text-sm">{stat.description}</div>
            </Card>
          ))}
        </div>

        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">私たちの価値観</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value) => (
              <Card key={value.title} className="p-8">
                <h3 className="text-xl font-semibold mb-4">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center mb-8">
            私たちのミッション
          </h2>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-lg text-gray-600 mb-6">
              Inner Glow Beautyは、美容サービスを通じて、お客様一人一人の個性と魅力を最大限に引き出し、
              自信に満ちた毎日を送るためのサポートを提供します。
            </p>
            <p className="text-lg text-gray-600">
              プロフェッショナルな技術と心のこもったサービスで、
              お客様の人生に寄り添い、美しさと幸せを追求する旅のパートナーとなることを目指しています。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}