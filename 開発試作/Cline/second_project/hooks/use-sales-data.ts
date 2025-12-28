import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

interface SalesData {
  date: string;
  total: number;
}

export function useSalesData() {
  const [data, setData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSalesData = async () => {
      try {
        const { data: appointments, error } = await supabase
          .from('appointments')
          .select('created_at, price')
          .order('created_at');

        if (error) throw error;

        // 日付ごとの売上を集計
        const salesByDate = appointments?.reduce((acc: { [key: string]: number }, curr) => {
          const date = new Date(curr.created_at).toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + (curr.price || 0);
          return acc;
        }, {});

        // 配列に変換
        const formattedData = Object.entries(salesByDate || {}).map(([date, total]) => ({
          date,
          total
        }));

        setData(formattedData);
      } catch (err) {
        console.error('売上データ取得エラー:', err);
        setError('売上データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadSalesData();
  }, []);

  return { data, loading, error };
}