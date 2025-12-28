"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Service } from '@/types/service';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleBooking = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "ログインが必要です",
          description: "予約するにはログインが必要です",
        });
        router.push('/auth');
        return;
      }

      router.push(`/booking?service=${service.id}`);
    } catch (error) {
      console.error('予約エラー:', error);
      toast({
        title: "エラー",
        description: "予約処理中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
        <CardDescription>
          {service.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">
            ¥{service.price.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">
            {service.duration}分
          </span>
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
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