import { Calendar, LineChart, Shield, Sparkles, Users } from "lucide-react";
import { FeatureCard } from "@/components/layout/feature-card";

export function FeaturesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          主な機能
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="オンライン予約"
            description="24時間いつでも簡単に予約可能。LINEでリマインドもお届け"
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="顧客管理"
            description="お客様一人一人に合わせたカスタマイズされたサービス提供"
          />
          <FeatureCard
            icon={<LineChart className="h-6 w-6" />}
            title="売上管理・分析"
            description="データに基づいた経営判断をサポート"
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            title="AIアシスタント"
            description="24時間対応の自動カウンセリングで安心サポート"
          />
          <FeatureCard
            icon={<Shield className="h-6 w-6" />}
            title="安全な顧客データ管理"
            description="最新のセキュリティ対策で個人情報を保護"
          />
        </div>
      </div>
    </section>
  );
}