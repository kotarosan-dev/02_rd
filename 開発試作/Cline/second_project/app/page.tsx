import { HeroSection } from "@/components/sections/hero";
import { FeaturesSection } from "@/components/sections/features";
import { PricingSection } from "@/components/sections/pricing/pricing-section";
import { ServicesSection } from "@/components/sections/services/services-section";
import { GallerySection } from "@/components/sections/gallery/gallery-section";
import { BlogSection } from "@/components/sections/blog/blog-section";

export default function Home() {
  return (
    <main className="flex-1">
      <div className="flex flex-col relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-5 pointer-events-none" 
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80")',
            height: '60vh',
            maxHeight: '600px'
          }}
        />
        <HeroSection />
        <FeaturesSection />
        <ServicesSection />
        <GallerySection />
        <BlogSection />
        <PricingSection />
      </div>
    </main>
  );
}

// 動的レンダリングを強制
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// キャッシュを無効化
export const fetchCache = 'force-no-store';