"use client";

import Image from 'next/image';
import { Card } from "@/components/ui/card";

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* ヘッダーセクション */}
      <div className="flex flex-col items-center mb-16">
        <div className="mb-4">
          <div className="relative w-[300px] h-[50px] mb-8">
            <Image
              src="/images/nature_line.svg"
              alt="装飾"
              fill
              className="object-contain"
            />
          </div>
        </div>
        <h1 className="text-4xl font-serif mb-2">Hairstyling</h1>
        <h2 className="text-2xl font-serif text-gray-700">毎日のヘアスタイリングを学ぶ</h2>
        <div className="relative h-64 w-full max-w-2xl mt-8">
          <Image
            src="/images/straightening-hair-with-flat-iron.jpg"
            alt="ヘアスタイリング"
            fill
            className="object-cover rounded-lg"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-4xl mx-auto space-y-16">
        {/* カリキュラムセクション */}
        <section>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-6 text-center">カリキュラム</h3>
              <div className="space-y-8">
                <div>
                  <h4 className="font-bold mb-3">DAY 1</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>・顔型の分類を学び似合うスタイルを知る</li>
                    <li>・スタイリングの道具とスタイリング剤についての正しい知識を知る</li>
                    <li>・ヘアアイロンの使い方</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-3">DAY 2</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>・ヘアスタイリングのアレンジ</li>
                    <li>・簡単にできるハーフアップ・フルアップスタイルの作り方</li>
                    <li>・イメージ作りとヘアスタイル</li>
                    <li>・スタイルの実践</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold mb-3">DAY 3</h4>
                  <ul className="space-y-2 text-gray-700">
                    <li>・自分に似合うヘアスタイルの実践</li>
                  </ul>
                </div>
              </div>
            </Card>
            <div className="space-y-6">
              <div className="relative h-64">
                <Image
                  src="/images/flat-iron-straightening-closeup.jpg"
                  alt="ヘアスタイリング実践"
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <p className="text-gray-700">
                似合うスタイルを知り、基礎知識から学び、ヘアスタイル実践<br />
                復習の反復で<br />
                しっかりと日常に使えるようにします
              </p>
            </div>
          </div>
        </section>

        {/* コース・料金セクション */}
        <section>
          <div className="text-center mb-12">
            <div className="relative w-[300px] h-[50px] mb-8 mx-auto">
              <Image
                src="/images/nature_line.svg"
                alt="装飾"
                fill
                className="object-contain"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <h2 className="text-3xl font-serif mb-2">コース・料金</h2>
              <div className="relative h-48">
                <Image
                  src="/images/hairstyling-woman-adjusting-hair.jpg"
                  alt="コース・料金"
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>

          {/* 5回コース */}
          <div className="space-y-16">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6">5回コース</h3>
                <div className="text-xl mb-4">¥33,000（税込）</div>
                <ul className="space-y-3 text-gray-700">
                  <li>1回目：リアル（2.5時間）カウンセリング</li>
                  <li>2回目：リアル（90分）基礎＋実践</li>
                  <li>3回目：リアル（60分）実践</li>
                  <li>4回目：オンライン（60分）復習</li>
                  <li>5回目：オンライン（60分）復習</li>
                </ul>
                <div className="mt-4 text-gray-600">
                  追加90分コース(1回)…¥9,800(税込)　※アフターフォロー付き
                </div>
              </div>
              <div className="relative h-64 md:h-80">
                <Image
                  src="/images/curling-hair-with-curler.jpg"
                  alt="ヘアスタイリング"
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>

            {/* ステップアップコース */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 relative h-64 md:h-80">
                <Image
                  src="/images/woman-brushing-hair-near-window.jpg"
                  alt="ヘアスタイリング応用"
                  fill
                  className="object-cover rounded-lg"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="order-1 md:order-2">
                <h3 className="text-2xl font-bold mb-6">ステップUPコース</h3>
                <p className="text-gray-700 mb-4">
                  一度基礎コースを学んだ方が次のスタイルを学ぶコースです。リアルのみ
                </p>
                <div className="space-y-2 text-gray-700">
                  <div>90分コース・・・・¥9,800（税込）</div>
                  <div>60分コース・・・・¥6,800（税込）</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 追加情報 */}
        <section className="text-center text-gray-700 mt-8">
          <p>受講後のオンライン添削1スタイルにつき3回ついてます。</p>
          <p>質問は何度でも承ります</p>
        </section>
      </div>
    </div>
  );
}