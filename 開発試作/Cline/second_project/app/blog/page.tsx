"use client";

import { BlogCard } from "@/components/sections/blog/blog-card";

const blogPosts = [
  {
    title: "美容における睡眠の重要性：質の高い睡眠でキレイを手に入れる",
    excerpt: "美容と睡眠には密接な関係があります。本記事では、美容効果を最大限に引き出す睡眠のとり方について解説します。",
    category: "ビューティーケア",
    date: "2024.03.15",
    readTime: "5分",
    imageUrl: "https://images.unsplash.com/photo-1520333789090-1afc82db536a?auto=format&fit=crop&q=80",
    slug: "importance-of-sleep-for-beauty"
  },
  {
    title: "自己肯定感を高める5つの習慣：内側からの美しさを育む",
    excerpt: "自己肯定感は外見の美しさにも大きく影響します。日々の小さな習慣から始める自己肯定感向上のヒントをご紹介。",
    category: "メンタルケア",
    date: "2024.03.10",
    readTime: "7分",
    imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80",
    slug: "5-habits-for-self-esteem"
  },
  {
    title: "季節の変わり目のスキンケア：春に向けた肌準備のポイント",
    excerpt: "季節の変化は肌にも大きな影響を与えます。春に向けた効果的なスキンケア方法と注意点について詳しく解説。",
    category: "スキンケア",
    date: "2024.03.05",
    readTime: "6分",
    imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80",
    slug: "seasonal-skincare-tips"
  }
];

export default function BlogPage() {
  return (
    <>
      <main className="min-h-screen pt-24">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">ブログ</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <BlogCard key={post.slug} {...post} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}