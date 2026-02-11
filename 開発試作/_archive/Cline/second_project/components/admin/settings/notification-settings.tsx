import { useState } from 'react';
import type { NotificationSettings as NotificationSettingsType } from '@/types/settings';
import supabase from '@/lib/supabase';

export const NotificationSettings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<NotificationSettingsType | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ... existing code ...
};