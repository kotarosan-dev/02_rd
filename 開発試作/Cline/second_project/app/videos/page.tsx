"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { VideoCard } from "@/components/dashboard/video-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

const videos = [
  {
    id: 1,
    title: "スキンケアの基本ステップ",
    description: "正しい順番とテクニックで最大限の効果を引き出すスキンケアルーティーン",
    thumbnail: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80",
    duration: "10:30",
    category: "スキンケア",
    views: 1250,
  },
  {
    id: 2,
    title: "セルフフェイシャルマッサージ",
    description: "むくみ解消と小顔効果を目指す、プロ直伝のマッサージテクニック",
    thumbnail: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80",
    duration: "15:45",
    category: "マッサージ",
    views: 2100,
  },
  {
    id: 3,
    title: "ナイトルーティーンのすすめ",
    description: "質の高い睡眠と美肌を手に入れる、就寝前のケアの方法",
    thumbnail: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80",
    duration: "12:20",
    category: "ルーティーン",
    views: 1800,
  },
  {
    id: 4,
    title: "自己肯定感を高めるエクササイズ",
    description: "毎日の小さな習慣で、内側からの美しさを育む方法",
    thumbnail: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&q=80",
    duration: "20:15",
    category: "メンタルケア",
    views: 3200,
  },
  {
    id: 5,
    title: "季節別スキンケアの違い",
    description: "四季の変化に合わせた、最適なスキンケアの選び方",
    thumbnail: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&q=80",
    duration: "18:30",
    category: "スキンケア",
    views: 1500,
  },
  {
    id: 6,
    title: "プロが教えるメイクテクニック",
    description: "誰でも簡単にできる、印象アップのメイクポイント",
    thumbnail: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80",
    duration: "25:10",
    category: "メイク",
    views: 4100,
  },
];

export default function VideosPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredVideos = selectedCategory === "all" 
    ? videos 
    : videos.filter(video => video.category === selectedCategory);

  const handlePlay = (videoId: number) => {
    // TODO: 動画再生機能の実装
    console.log("Play video:", videoId);
  };

  return (
    <main className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8">ビデオライブラリ</h1>

      <Tabs defaultValue="all" className="space-y-8">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setSelectedCategory("all")}>
            すべて
          </TabsTrigger>
          <TabsTrigger 
            value="skincare" 
            onClick={() => setSelectedCategory("スキンケア")}
          >
            スキンケア
          </TabsTrigger>
          <TabsTrigger 
            value="massage" 
            onClick={() => setSelectedCategory("マッサージ")}
          >
            マッサージ
          </TabsTrigger>
          <TabsTrigger 
            value="makeup" 
            onClick={() => setSelectedCategory("メイク")}
          >
            メイク
          </TabsTrigger>
          <TabsTrigger 
            value="mental" 
            onClick={() => setSelectedCategory("メンタルケア")}
          >
            メンタルケア
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                title={video.title}
                description={video.description}
                thumbnail={video.thumbnail}
                duration={video.duration}
                category={video.category}
                views={video.views}
                onPlay={() => handlePlay(video.id)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}