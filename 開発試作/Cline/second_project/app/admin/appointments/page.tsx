"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { appointmentStatuses } from "@/lib/appointment-status";
import { getAppointments } from "@/lib/queries";
import { useToast } from "@/hooks/use-toast";
import type { AppointmentWithDetails } from "@/types/database";

export default function AdminAppointmentsPage() {
  const [date, setDate] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithDetails | null>(null);
  const { toast } = useToast();

  // 過去12ヶ月分の選択肢を生成
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'yyyy年M月', { locale: ja })
    };
  });

  const loadAppointments = useCallback(async (selectedDate: Date) => {
    try {
      setLoading(true);
      const data = await getAppointments(selectedDate);
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
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
    loadAppointments(date);
  }, [date, loadAppointments]);

  const handleMonthChange = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    const newDate = startOfMonth(new Date(year, month - 1));
    setDate(newDate);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = appointmentStatuses[status as keyof typeof appointmentStatuses];
    return statusConfig ? (
      <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>
    ) : null;
  };

  return (
    <div className="container mx-auto space-y-6 px-4">
      <h1 className="text-2xl sm:text-3xl font-bold">予約管理</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="space-y-4">
          <Card className="p-4 sm:p-6 lg:sticky lg:top-20">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold mb-2">月を選択</h2>
                <Select
                  value={format(date, 'yyyy-MM')}
                  onValueChange={handleMonthChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <h2 className="text-lg font-semibold mb-2">日付を選択</h2>
                <div className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(date) => date && setDate(date)}
                    locale={ja}
                    className="rounded-md border w-full max-w-[350px]"
                    classNames={{
                      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                      head_row: "flex w-full",
                      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] sm:text-sm",
                      row: "flex w-full mt-2",
                      cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                      day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_outside: "text-muted-foreground opacity-50",
                      day_disabled: "text-muted-foreground opacity-50",
                      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                      day_hidden: "invisible",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      caption: "relative flex justify-center pt-1 px-8 text-sm font-medium"
                    }}
                    fromDate={subMonths(new Date(), 12)}
                    initialFocus
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">
              {format(date, 'yyyy年M月d日(E)', { locale: ja })}の予約一覧
            </h2>
            {loading ? (
              <div className="text-center py-8">読み込み中...</div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                予約はありません
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-full inline-block align-middle">
                  <div className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">時間</TableHead>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">顧客名</TableHead>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">メニュー</TableHead>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">担当</TableHead>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">料金</TableHead>
                          <TableHead className="whitespace-nowrap bg-muted/50 font-medium">ステータス</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map((appointment) => (
                          <TableRow 
                            key={appointment.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedAppointment(appointment)}
                          >
                            <TableCell className="whitespace-nowrap font-medium">
                              {format(new Date(appointment.start_time), 'HH:mm')}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {appointment.full_name || '名前未設定'}
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {appointment.service_name}
                            </TableCell>
                            <TableCell>{appointment.staff_name}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              ¥{appointment.service_price.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(appointment.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>予約詳細</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">予約日時</div>
                  <div className="font-medium">
                    {format(new Date(selectedAppointment.start_time), 'yyyy年M月d日(E) HH:mm', { locale: ja })}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">ステータス</div>
                  <div>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">顧客名</div>
                  <div className="font-medium">{selectedAppointment.full_name || '名前未設定'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">メールアドレス</div>
                  <div className="font-medium">{selectedAppointment.email || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">メニュー</div>
                  <div className="font-medium">{selectedAppointment.service_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">担当</div>
                  <div className="font-medium">{selectedAppointment.staff_name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">所要時間</div>
                  <div className="font-medium">{selectedAppointment.service_duration}分</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">料金</div>
                  <div className="font-medium">¥{selectedAppointment.service_price.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">予約作成日時</div>
                <div className="font-medium">
                  {format(new Date(selectedAppointment.created_at), 'yyyy年M月d日(E) HH:mm', { locale: ja })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}