export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface AppointmentStatusConfig {
  label: string;
  color: 'default' | 'secondary' | 'destructive' | 'success';
  description: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
}

export interface AppointmentWithDetails {
  id: string;
  user_id: string;
  service_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
  full_name: string | null;
  email: string;
  service_name: string;
  service_duration: number;
  service_price: number;
  staff_name: string;
  staff_role: string;
}