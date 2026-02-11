import { Appointment, Service, Staff } from "@/types/database";
import { addMinutes, format, parse, isWithinInterval, differenceInHours } from "date-fns";

export const CANCELLATION_DEADLINE_HOURS = 24; // キャンセル可能期限（時間）
export const MAX_APPOINTMENTS_PER_DAY = 1; // 1日あたりの最大予約数

export interface BookingValidationError {
  message: string;
  code: 'TIME_SLOT_UNAVAILABLE' | 'DUPLICATE_BOOKING' | 'PAST_DATE' | 'BUSINESS_HOURS';
}

export async function validateBooking(
  userId: string,
  startTime: Date,
  endTime: Date,
  appointments: Appointment[]
): Promise<BookingValidationError | null> {
  // 過去の日付チェック
  if (startTime < new Date()) {
    return {
      message: '過去の日付は選択できません',
      code: 'PAST_DATE'
    };
  }

  // 営業時間チェック
  const hour = startTime.getHours();
  if (hour < 10 || hour >= 19) {
    return {
      message: '営業時間外です（10:00-19:00）',
      code: 'BUSINESS_HOURS'
    };
  }

  // 重複予約チェック
  const hasOverlap = appointments.some(appointment => {
    const appointmentStart = new Date(appointment.start_time);
    const appointmentEnd = new Date(appointment.end_time);
    return isWithinInterval(startTime, {
      start: appointmentStart,
      end: appointmentEnd
    }) || isWithinInterval(endTime, {
      start: appointmentStart,
      end: appointmentEnd
    });
  });

  if (hasOverlap) {
    return {
      message: '選択された時間枠は既に予約されています',
      code: 'TIME_SLOT_UNAVAILABLE'
    };
  }

  // 同日の予約数チェック
  const sameDayAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.start_time);
    return (
      appointmentDate.getFullYear() === startTime.getFullYear() &&
      appointmentDate.getMonth() === startTime.getMonth() &&
      appointmentDate.getDate() === startTime.getDate()
    );
  });

  if (sameDayAppointments.length >= MAX_APPOINTMENTS_PER_DAY) {
    return {
      message: '1日の予約上限に達しています',
      code: 'DUPLICATE_BOOKING'
    };
  }

  return null;
}

export function canCancelAppointment(appointment: Appointment): boolean {
  const now = new Date();
  const appointmentStart = new Date(appointment.start_time);
  const hoursUntilAppointment = differenceInHours(appointmentStart, now);
  
  return hoursUntilAppointment >= CANCELLATION_DEADLINE_HOURS;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export function generateTimeSlots(
  date: Date,
  appointments: Appointment[],
  selectedService?: Service,
  selectedStaff?: Staff
): TimeSlot[] {
  const businessHours = {
    start: "10:00",
    end: "19:00",
  };

  const slots: TimeSlot[] = [];
  const duration = selectedService?.duration || 60; // デフォルト1時間
  const interval = 30; // 30分間隔

  let currentTime = parse(businessHours.start, "HH:mm", date);
  const endTime = parse(businessHours.end, "HH:mm", date);

  while (currentTime < endTime) {
    const timeString = format(currentTime, "HH:mm");
    const slotEndTime = addMinutes(currentTime, duration);

    // 予約時間が営業時間を超える場合はスキップ
    if (slotEndTime > endTime) {
      break;
    }

    const isAvailable = !appointments.some((appointment) => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);

      // 選択されたスタッフの予約のみをチェック
      if (selectedStaff && appointment.staff_id !== selectedStaff.id) {
        return false;
      }

      return isWithinInterval(currentTime, {
        start: appointmentStart,
        end: appointmentEnd,
      }) || isWithinInterval(slotEndTime, {
        start: appointmentStart,
        end: appointmentEnd,
      });
    });

    slots.push({
      time: timeString,
      available: isAvailable,
    });

    currentTime = addMinutes(currentTime, interval);
  }

  return slots;
}