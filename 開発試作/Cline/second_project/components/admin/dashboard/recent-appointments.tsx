"use client";

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  service: Database['public']['Tables']['services']['Row'] | null;
  staff: Database['public']['Tables']['staff']['Row'] | null;
  profiles: {
    full_name: string | null;
    email: string;
  } | null;
};

export function RecentAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        console.log('🔄 最近の予約データ取得開始');
        
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            *,
            service:services!appointments_service_id_fkey (
              id,
              name,
              description,
              duration,
              price,
              category
            ),
            staff:staff!appointments_staff_id_fkey (
              id,
              name,
              role
            ),
            profiles!appointments_user_id_fkey (
              full_name,
              email
            )
          `)
          .order('start_time', { ascending: false })
          .limit(5);

        if (appointmentsError) {
          console.error('❌ 予約データ取得エラー:', appointmentsError);
          throw appointmentsError;
        }

        console.log('✅ 予約データ取得成功:', appointmentsData);
        setAppointments(appointmentsData as Appointment[]);
      } catch (err) {
        console.error('予約情報取得エラー:', err);
        setError('予約情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  if (loading) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>最近の予約</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center animate-pulse">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>最近の予約</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>最近の予約</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-medium leading-none">
                  {appointment.profiles?.full_name || appointment.profiles?.email || '名前なし'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {appointment.service?.name || 'サービス未設定'} with {appointment.staff?.name || 'スタッフ未設定'}
                </p>
                <p className="text-xs text-muted-foreground">
                  ステータス: {appointment.status}
                  {appointment.service?.price && ` • ¥${appointment.service.price.toLocaleString()}`}
                  {appointment.service?.duration && ` • ${appointment.service.duration}分`}
                </p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                {formatDate(appointment.start_time)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}