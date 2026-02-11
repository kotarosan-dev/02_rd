export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  category: string;
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  staff_id: string | null;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface AppointmentWithDetails extends Appointment {
  profile: Profile;
  service: Service;
  staff?: Profile;
} 