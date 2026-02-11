"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CancelDialog } from "./cancel-dialog";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { appointmentStatuses } from "@/lib/appointment-status";
import { useAuth } from "@/lib/auth-context";
import type { AppointmentWithDetails } from "@/types/database";

export function MyPageContent() {
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const loadAppointments = useCallback(async () => {
    if (!user) {
      console.log('⚠️ ユーザーが未認証です');
      router.push('/auth');
      return;
    }

    try {
      console.log('🔄 予約データ取得開始:', { userId: user.id });
      
      const { data, error } = await supabase
        .from("appointments_with_profiles")
        .select(`
          id,
          user_id,
          service_id,
          staff_id,
          start_time,
          end_time,
          status,
          created_at,
          full_name,
          email,
          service_name,
          service_duration,
          service_price,
          staff_name,
          staff_role
        `)
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('❌ 予約データ取得エラー:', error.message);
        throw error;
      }

      console.log('✅ 予約データ取得成功:', { count: data?.length });
      setAppointments(data || []);
    } catch (error) {
      console.error('❌ 予約データ取得処理エラー:', error);
      toast({
        title: "エラー",
        description: "予約データの取得に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, router, toast]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('appointments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        console.log('🔄 予約データ更新:', payload);
        loadAppointments();
      })
      .subscribe((status) => {
        console.log('📡 リアルタイム接続状態:', status);
      });

    return () => {
      if (channel) {
        console.log('🧹 リアルタイム購読のクリーンアップ');
        supabase.channel(channel.subscribe.name).unsubscribe();
      }
    };
  }, [user, loadAppointments]);

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      console.log('🔄 予約キャンセル処理開始:', { appointmentId: selectedAppointment.id });
      const { error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", selectedAppointment.id);

      if (error) {
        console.error('❌ キャンセル処理エラー:', error);
        throw error;
      }

      console.log('✅ キャンセル処理成功');
      toast({
        title: "キャンセル完了",
        description: "予約をキャンセルしました",
      });
      
      loadAppointments();
    } catch (error) {
      console.error('❌ キャンセル処理例外:', error);
      toast({
        title: "エラー",
        description: "キャンセルに失敗しました",
        variant: "destructive",
      });
    } finally {
      setSelectedAppointment(null);
    }
  };

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="space-y-8">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">予約履歴</h2>
        {appointments.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>予約日時</TableHead>
                <TableHead>メニュー</TableHead>
                <TableHead>担当スタッフ</TableHead>
                <TableHead>料金</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(new Date(appointment.start_time), "yyyy年M月d日(E) HH:mm", { locale: ja })}
                  </TableCell>
                  <TableCell>{appointment.service_name}</TableCell>
                  <TableCell>{appointment.staff_name}</TableCell>
                  <TableCell>¥{appointment.service_price.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge
                      variant={appointmentStatuses[appointment.status].color}
                    >
                      {appointmentStatuses[appointment.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAppointment(appointment)}
                      disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}
                    >
                      キャンセル
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            予約履歴がありません
          </div>
        )}
      </Card>

      <div className="flex justify-center">
        <Button
          onClick={() => router.push("/booking")}
          className="bg-gradient-to-r from-pink-600 to-purple-600"
        >
          新規予約
        </Button>
      </div>
      
      {selectedAppointment && (
        <CancelDialog
          open={!!selectedAppointment}
          onOpenChange={(open) => !open && setSelectedAppointment(null)}
          onConfirm={handleCancelAppointment}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}