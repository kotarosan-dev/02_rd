import { BlogPost } from "@/components/blog/blog-post";

// Generate static paths for blog posts
export function generateStaticParams() {
  return [
    { slug: "importance-of-sleep-for-beauty" },
    { slug: "5-habits-for-self-esteem" },
    { slug: "seasonal-skincare-tips" }
  ];
}

// Server Component
export default function BlogPostPage({ params }: { params: { slug: string } }) {
  // Map slugs to post data
  const posts = {
    "importance-of-sleep-for-beauty": {
      title: "美容における睡眠の重要性：質の高い睡眠でキレイを手に入れる",
      content: `
        美容と睡眠には密接な関係があります。質の高い睡眠は、肌の再生、コラーゲンの生成、
        そして全体的な美容効果に重要な役割を果たします。

        本記事では、美容効果を最大限に引き出すための睡眠のとり方について詳しく解説していきます。

        1. 最適な睡眠時間
        2. 睡眠の質を高める方法
        3. 美容に効果的な寝る前のルーティン
        4. おすすめの寝具選び
      `,
      date: "2024.03.15",
      category: "ビューティーケア",
      imageUrl: "https://images.unsplash.com/photo-1520333789090-1afc82db536a?auto=format&fit=crop&q=80",
    },
    "5-habits-for-self-esteem": {
      title: "自己肯定感を高める5つの習慣：内側からの美しさを育む",
      content: `
        自己肯定感は外見の美しさにも大きく影響します。日々の小さな習慣から始める自己肯定感向上のヒントをご紹介。
      `,
      date: "2024.03.10",
      category: "メンタルケア",
      imageUrl: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80",
    },
    "seasonal-skincare-tips": {
      title: "季節の変わり目のスキンケア：春に向けた肌準備のポイント",
      content: `
        季節の変化は肌にも大きな影響を与えます。春に向けた効果的なスキンケア方法と注意点について詳しく解説。
      `,
      date: "2024.03.05",
      category: "スキンケア",
      imageUrl: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80",
    }
  };

  const post = posts[params.slug as keyof typeof posts];

  return <BlogPost post={post} />;
}