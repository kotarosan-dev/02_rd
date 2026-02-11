import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import type { PricingPlan } from '@/types/pricing';

export function usePricingPlans() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from('pricing_plans')
          .select('*')
          .order('price');

        if (error) throw error;
        setPlans(data || []);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('料金プラン情報の取得に失敗しました'));
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return { plans, loading, error };
} 