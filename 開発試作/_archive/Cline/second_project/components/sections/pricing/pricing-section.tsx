"use client";

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { PricingCard } from './pricing-card';
import type { Service } from '@/types/service';
import { useAuth } from '@/lib/auth-context';

export function PricingSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchServices = async () => {
      console.log('🔄 サービス一覧取得開始');
      try {
        const { data, error: fetchError } = await supabase
          .from('services')
          .select('*')
          .order('price');

        if (fetchError) throw fetchError;

        setServices(data || []);
        console.log('✅ サービス一覧取得成功:', { 
          count: data?.length || 0,
          isAuthenticated: !!user
        });
      } catch (err) {
        console.error('サービス取得エラー:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [user]);

  if (loading) return (
    <div className="container mx-auto py-12">
      <div className="text-center">
        <div className="text-lg">読み込み中...</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="container mx-auto py-12">
      <div className="text-center text-red-500">
        {error.message || 'サービス情報の取得に失敗しました'}
      </div>
    </div>
  );

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">料金プラン</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service) => (
            <PricingCard 
              key={service.id} 
              service={service}
              isAuthenticated={!!user}
            />
          ))}
        </div>
      </div>
    </section>
  );
}