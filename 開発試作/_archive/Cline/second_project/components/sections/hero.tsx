import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="relative flex items-center justify-center bg-gradient-to-r from-pink-50 to-purple-50 py-16 md:py-20 overflow-hidden">
      <div className="container mx-auto px-2 sm:px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-6 sm:gap-10 items-center">
          <div className="relative order-2 md:order-1">
            <div className="relative space-y-5">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-left">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                  Inner Glow Beauty
                </span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-2xl">
                内側からの輝きを引き出し、あなたらしい美しさを実現します
              </p>
              <div className="flex gap-2 sm:gap-4 pt-3">
                <Button size="default" className="bg-gradient-to-r from-pink-600 to-purple-600" asChild>
                  <Link href="/booking">
                    予約する <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="default" variant="outline" asChild>
                  <Link href="/features">
                    詳しく見る
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="relative order-1 md:order-2 flex justify-center">
            <div className="relative w-full max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl">
              <div className="absolute -inset-6 sm:-inset-10 bg-gradient-to-r from-pink-200/30 via-purple-200/30 to-pink-200/30 rounded-full blur-3xl" />
              
              <div className="relative aspect-square w-full flex items-center justify-center transform hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full overflow-hidden rounded-full relative flex items-center justify-center bg-gradient-to-r from-pink-100 to-purple-100">
                  <Sparkles className="h-32 w-32 text-pink-600" />
                </div>
              </div>
              
              <div className="absolute inset-0 bg-gradient-radial from-white/20 via-transparent to-transparent rounded-full pointer-events-none animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}