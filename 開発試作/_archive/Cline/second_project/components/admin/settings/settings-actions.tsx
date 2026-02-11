'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import supabase from '@/lib/supabase';
import type { Settings } from '@/types/settings';

export async function updateSettings(settings: Settings) {
  try {
    const { error } = await supabase
      .from('settings')
      .update(settings)
      .eq('id', 1)
      .single();

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error:', error);
    return { success: false };
  }
}
