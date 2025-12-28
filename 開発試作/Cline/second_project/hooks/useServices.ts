import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type Service = Database['public']['Tables']['services']['Row'];

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('name');

        if (error) throw error;
        setServices(data || []);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('サービス情報の取得に失敗しました'));
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  return { services, loading, error };
} 