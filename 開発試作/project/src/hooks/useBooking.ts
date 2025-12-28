import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface BookingData {
  date: Date;
  time: string;
  serviceId: string;
  customerId: string;
}

export function useBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, profile } = useAuthStore();

  const createBooking = async (bookingData: BookingData) => {
    if (!user) {
      setError('予約にはログインが必要です');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // まず顧客情報を取得、なければ作成
      let { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (customerError) throw customerError;

      // 顧客情報がない場合は作成
      if (!customerData) {
        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert([
            {
              user_id: user.id,
              name: profile?.display_name || user.email?.split('@')[0] || 'ゲスト',
              email: user.email
            }
          ])
          .select('id, name')
          .single();

        if (createError) throw createError;
        customerData = newCustomer;
      } else {
        // 既存の顧客情報を更新
        const { error: updateError } = await supabase
          .from('customers')
          .update({ name: profile?.display_name })
          .eq('id', customerData.id);

        if (updateError) throw updateError;
      }

      // 予約を作成
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            customer_id: customerData.id,
            service_id: bookingData.serviceId,
            booking_date: bookingData.date.toISOString().split('T')[0],
            booking_time: bookingData.time,
            status: 'confirmed'
          }
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;

      return booking;
    } catch (err) {
      console.error('Booking error:', err);
      setError('予約の作成に失敗しました');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (bookingId: string, data: Partial<BookingData>) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('bookings')
        .update({
          booking_date: data.date?.toISOString().split('T')[0],
          booking_time: data.time,
          service_id: data.serviceId
        })
        .eq('id', bookingId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Booking update error:', err);
      setError('予約の更新に失敗しました');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (date: Date, time: string, excludeBookingId?: string) => {
    try {
      let query = supabase
        .from('bookings')
        .select('id')
        .eq('booking_date', date.toISOString().split('T')[0])
        .eq('booking_time', time)
        .not('status', 'eq', 'cancelled');

      if (excludeBookingId) {
        query = query.neq('id', excludeBookingId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data.length === 0;
    } catch (err) {
      console.error('Availability check error:', err);
      setError('空き状況の確認に失敗しました');
      return false;
    }
  };

  return {
    createBooking,
    updateBooking,
    checkAvailability,
    loading,
    error
  };
}