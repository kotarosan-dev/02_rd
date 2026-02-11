"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import type { Service } from '@/types/service';

interface PricingCardProps {
  service: Service;
  isAuthenticated: boolean;
}

// サービスIDに基づいて画像を選択する関数
const getServiceImage = (serviceId: string) => {
  const images: { [key: string]: string } = {
    'basic': '/images/woman-brushing-hair-near-window..jpg',
    'standard': '/images/hairstyling-woman-adjusting-hair.jpg',
    'premium': '/images/haircare-tools-and-products..jpg',
  };
  return images[serviceId] || images.basic;
};

export function PricingCard({ service, isAuthenticated }: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleBooking = async () => {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        toast({
          title: "ログインが必要です",
          description: "予約にはログインが必要です",
          variant: "destructive",
        });
        router.push('/auth');
        return;
      }

      router.push(`/booking?service=${service.id}`);
    } catch (error) {
      console.error('予約処理エラー:', error);
      toast({
        title: "エラー",
        description: "予約処理に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <div className="relative w-full h-48">
        <Image
          src={getServiceImage(service.id)}
          alt={service.name}
          fill
          className="object-cover rounded-t-lg"
        />
      </div>
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="text-3xl font-bold mb-4">
          ¥{service.price.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground">
          所要時間: {service.duration}分
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleBooking}
          disabled={loading}
        >
          {loading ? "処理中..." : "予約する"}
        </Button>
      </CardFooter>
    </Card>
  );
} 