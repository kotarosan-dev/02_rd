"use client";

import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { canCancelAppointment, CANCELLATION_DEADLINE_HOURS } from "@/lib/booking-utils";
import type { AppointmentWithDetails } from "@/types/database";

const appointmentStatuses = {
  pending: {
    label: "予約済み",
    color: "default" as const,
  },
  confirmed: {
    label: "確定済み",
    color: "success" as const,
  },
  cancelled: {
    label: "キャンセル済み",
    color: "destructive" as const,
  },
  completed: {
    label: "完了",
    color: "secondary" as const,
  },
};

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  appointment: AppointmentWithDetails;
}

export function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  appointment,
}: CancelDialogProps) {
  const canCancel = canCancelAppointment(appointment);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>予約をキャンセルしますか？</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">予約日時</span>
                <span>{format(new Date(appointment.start_time), "yyyy年M月d日(E) HH:mm", { locale: ja })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">メニュー</span>
                <span>{appointment.service_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">担当スタッフ</span>
                <span>{appointment.staff_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">料金</span>
                <span>¥{appointment.service_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">ステータス</span>
                <Badge variant={appointmentStatuses[appointment.status].color}>
                  {appointmentStatuses[appointment.status].label}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-destructive">
              {canCancel ? (
                "この操作は取り消せません。キャンセル後の予約の復元はできませんのでご注意ください。"
              ) : (
                `キャンセルは予約時間の${CANCELLATION_DEADLINE_HOURS}時間前までとなります。`
              )}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>戻る</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canCancel}
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            キャンセルする
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}