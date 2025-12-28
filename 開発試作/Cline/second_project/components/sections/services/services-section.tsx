"use client";

import { useCallback, useEffect, useState } from 'react';
import { Service } from '@/types/service';
import { ServiceCard } from './service-card';
import { getServices } from '@/lib/services';

export function ServicesSection() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      console.error('サービス取得エラー:', err);
      setError('サービス情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center text-red-500">
          {error}
        </div>
      </div>
    );
  }

  return (
    <section className="bg-background py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-8">
          サービス一覧
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  );
}