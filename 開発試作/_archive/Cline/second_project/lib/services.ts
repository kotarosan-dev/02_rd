import supabase from '@/lib/supabase';
import type { Service } from '@/types/service';

export async function getServices() {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name');

    if (error) throw error;
    if (!data) throw new Error('サービスデータが取得できませんでした');

    return data as Service[];
  } catch (error) {
    console.error('サービス取得エラー:', error);
    throw error;
  }
} 