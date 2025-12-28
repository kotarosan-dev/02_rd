import type { AppointmentStatus, AppointmentStatusConfig } from '@/types/database';

export const appointmentStatuses: Record<AppointmentStatus, AppointmentStatusConfig> = {
  pending: {
    label: '予約待ち',
    color: 'secondary',
    description: '予約リクエストを受け付けました。スタッフが確認次第、ステータスが更新されます。'
  },
  confirmed: {
    label: '予約確定',
    color: 'default',
    description: '予約が確定しました。当日のご来店をお待ちしております。'
  },
  cancelled: {
    label: 'キャンセル',
    color: 'destructive',
    description: 'この予約はキャンセルされました。'
  },
  completed: {
    label: '完了',
    color: 'success',
    description: 'ご来店ありがとうございました。'
  }
};