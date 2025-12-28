import { TransformationCard } from "./transformation-card";
import Image from "next/image";

const transformations = [
  {
    title: "肌質改善",
    description: "毛穴の開きと乾燥肌の改善。定期的なフェイシャルケアとスキンケアアドバイスで実現。",
    duration: "3ヶ月",
    beforeImage: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2",
    afterImage: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9"
  },
  {
    title: "エイジングケア",
    description: "シワ・たるみの改善。高機能美容液と特殊マッサージの組み合わせによる総合的なケア。",
    duration: "6ヶ月",
    beforeImage: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da",
    afterImage: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c"
  },
  {
    title: "ボディケア",
    description: "姿勢改善とボディラインの引き締め。ホリスティックマッサージと生活習慣改善で実現。",
    duration: "4ヶ月",
    beforeImage: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9",
    afterImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f"
  }
];

export function GallerySection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            お客様の変化
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Inner Glow Beautyのトータルケアで実現した、実際のお客様の変化をご紹介します。
            内面と外面の美しさを引き出すプログラムで、理想の自分に近づいていきましょう。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {transformations.map((transformation) => (
            <TransformationCard
              key={transformation.title}
              {...transformation}
            />
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            ※ 効果には個人差があります。カウンセリングで最適なプランをご提案させていただきます。
          </p>
        </div>
      </div>
    </section>
  );
}