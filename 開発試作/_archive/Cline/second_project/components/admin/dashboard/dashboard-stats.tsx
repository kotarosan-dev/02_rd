"use client";

import { useEffect, useState } from 'react';
import supabase from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import type { Database } from '@/types/supabase';

type Service = Database['public']['Tables']['services']['Row'];
type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  service: Service | null;
};

interface DashboardStats {
  totalUsers: number;
  totalAppointments: number;
  totalRevenue: number;
  recentAppointments: Appointment[];
}

export function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    recentAppointments: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        console.log('🔄 ダッシュボード統計取得開始');
        
        // ユーザー数の取得
        const { count: userCount, error: userError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' });

        if (userError) {
          console.error('❌ ユーザー数取得エラー:', userError);
          throw userError;
        }

        // 予約数と売上の取得
        const { data: appointments, error: appointmentError } = await supabase
          .from('appointments')
          .select(`
            *,
            service:service_id (
              id,
              name,
              price
            )
          `)
          .order('created_at', { ascending: false });

        if (appointmentError) {
          console.error('❌ 予約データ取得エラー:', appointmentError);
          throw appointmentError;
        }

        const totalRevenue = appointments?.reduce((sum, appointment) => 
          sum + (appointment.service?.price || 0), 0) || 0;

        console.log('✅ 統計情報取得成功:', {
          userCount,
          appointmentsCount: appointments?.length,
          totalRevenue
        });

        setStats({
          totalUsers: userCount || 0,
          totalAppointments: appointments?.length || 0,
          totalRevenue,
          recentAppointments: appointments?.slice(0, 5) || []
        });
      } catch (err) {
        console.error('統計情報取得エラー:', err);
        setError('統計情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">読み込み中...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総ユーザー数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            登録済みユーザー
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総予約数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAppointments}</div>
          <p className="text-xs text-muted-foreground">
            全期間の予約数
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総売上</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ¥{stats.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            全期間の売上合計
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">直近の予約</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.recentAppointments[0] 
              ? formatDate(stats.recentAppointments[0].created_at)
              : '-'
            }
          </div>
          <p className="text-xs text-muted-foreground">
            最新の予約日時
          </p>
        </CardContent>
      </Card>
    </div>
  );
}