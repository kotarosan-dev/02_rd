"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getUserBookings, cancelBooking } from "@/lib/booking";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Booking } from "@/lib/booking";

export default function AppointmentsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getUserBookings();
      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({
        title: "エラー",
        description: "予約データの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleCancel = async (bookingId: string) => {
    try {
      const { error } = await cancelBooking(bookingId);
      if (error) throw error;
      
      toast({
        title: "キャンセル完了",
        description: "予約をキャンセルしました",
      });
      loadBookings(); // 予約一覧を再読み込み
    } catch (error) {
      console.error('Cancellation error:', error);
      toast({
        title: "エラー",
        description: "キャンセルに失敗しました",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy年MM月dd日(E) HH:mm', { locale: ja });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '予約待ち';
      case 'confirmed':
        return '予約確定';
      case 'cancelled':
        return 'キャンセル済み';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>予約管理</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  予約はありません
                </p>
              ) : (
                bookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <h3 className="font-semibold text-lg">
                            {booking.service.name}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            {getStatusText(booking.status)}
                          </div>
                          <div>
                            {formatDate(booking.start_time)}
                          </div>
                          <div className="text-sm">
                            {booking.service.duration}分 / ¥{booking.service.price.toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center">
                          {booking.status === 'pending' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive">
                                  キャンセル
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    この操作は取り消せません。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>いいえ</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleCancel(booking.id)}
                                  >
                                    はい
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 