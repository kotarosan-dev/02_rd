import supabase from '@/lib/supabase';
import type { Database } from '@/types/supabase';
import type { AppointmentWithDetails, AppointmentStatus } from '@/types/database';

type ServiceResponse<T> = {
  data: T | null;
  error: Error | null;
};

type Tables = Database['public']['Tables'];
type Service = Tables['services']['Row'];
type Staff = Tables['staff']['Row'];
type Appointment = Tables['appointments']['Row'];
type Profile = Tables['profiles']['Row'];

type RawAppointmentResponse = {
  id: string;
  user_id: string;
  service_id: string;
  staff_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
  };
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  staff: {
    id: string;
    name: string;
    role: string;
  };
  services?: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  full_name?: string | null;
  email?: string;
};

export class SupabaseService {
  private static instance: SupabaseService;
  private supabase;
  
  private constructor() {
    this.supabase = supabase;
  }
  
  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async getServices(): Promise<ServiceResponse<Service[]>> {
    try {
      console.log('🔄 サービス一覧取得開始');
      const { data, error } = await this.supabase
        .from('services')
        .select('*')
        .order('name');

      if (error) {
        console.error('❌ サービス取得エラー:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from services query');
      }

      console.log('✅ サービス取得成功:', data);
      return { data, error: null };
    } catch (error) {
      console.error('❌ サービス取得エラー:', error);
      return { data: null, error: error as Error };
    }
  }

  async getStaff(): Promise<ServiceResponse<Staff[]>> {
    try {
      const { data, error } = await this.supabase
        .from('staff')
        .select('*')
        .order('name');

      if (error) throw error;
      
      if (!data) {
        throw new Error('No data returned from staff query');
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching staff:', error);
      return { data: null, error: error as Error };
    }
  }

  async getAppointments(date: Date, staffId?: string): Promise<ServiceResponse<AppointmentWithDetails[]>> {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      console.log('🔍 予約取得開始:', {
        startOfDay: startOfDay.toISOString(),
        endOfDay: endOfDay.toISOString(),
        staffId
      });

      let query = this.supabase
        .from('appointments_with_profiles')
        .select(`
          id,
          user_id,
          service_id,
          staff_id,
          start_time,
          end_time,
          status,
          created_at,
          services!appointments_service_id_fkey (
            id,
            name,
            duration,
            price
          ),
          staff!appointments_staff_id_fkey (
            id,
            name,
            role
          ),
          full_name,
          email
        `)
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString());

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data: rawData, error } = await query;
      
      if (error) {
        console.error('❌ 予約取得エラー:', error);
        throw error;
      }

      if (!rawData) {
        return { data: [], error: null };
      }

      const formattedData = (rawData as unknown as RawAppointmentResponse[]).map(appointment => ({
        id: appointment.id,
        user_id: appointment.user_id,
        service_id: appointment.service_id,
        staff_id: appointment.staff_id,
        start_time: appointment.start_time,
        end_time: appointment.end_time,
        status: appointment.status,
        created_at: appointment.created_at,
        full_name: appointment.full_name || null,
        email: appointment.email || '',
        service_name: appointment.services?.name || '',
        service_duration: appointment.services?.duration || 0,
        service_price: appointment.services?.price || 0,
        staff_name: appointment.staff?.name || '',
        staff_role: appointment.staff?.role || ''
      }));

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('❌ 予約取得処理エラー:', error);
      return { data: null, error: error as Error };
    }
  }

  async createAppointment(appointment: Omit<Appointment, 'id' | 'created_at'>): Promise<ServiceResponse<Appointment>> {
    try {
      const { data, error } = await this.supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating appointment:', error);
      return { data: null, error: error as Error };
    }
  }

  async updateAppointmentStatus(
    appointmentId: string, 
    status: 'pending' | 'confirmed' | 'cancelled'
  ): Promise<ServiceResponse<Appointment>> {
    try {
      const { data, error } = await this.supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating appointment status:', error);
      return { data: null, error: error as Error };
    }
  }

  subscribeToAppointments(
    userId: string,
    callback: (appointments: AppointmentWithDetails[]) => void
  ) {
    return this.supabase
      .channel('appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `user_id=eq.${userId}`
        },
        async () => {
          const { data: rawData } = await this.supabase
            .from('appointments_with_profiles')
            .select(`
              id,
              user_id,
              service_id,
              staff_id,
              start_time,
              end_time,
              status,
              created_at,
              service:services(id,name,duration,price),
              staff:staff(id,name,role),
              full_name,
              email
            `)
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

          if (rawData) {
            const transformedData = (rawData as unknown as RawAppointmentResponse[]).map(appointment => ({
              id: appointment.id,
              user_id: appointment.user_id,
              service_id: appointment.service_id,
              staff_id: appointment.staff_id,
              start_time: appointment.start_time,
              end_time: appointment.end_time,
              status: appointment.status,
              created_at: appointment.created_at,
              full_name: appointment.full_name || null,
              email: appointment.email || '',
              service_name: appointment.services?.name || '',
              service_duration: appointment.services?.duration || 0,
              service_price: appointment.services?.price || 0,
              staff_name: appointment.staff?.name || '',
              staff_role: appointment.staff?.role || ''
            }));
            callback(transformedData);
          }
        }
      )
      .subscribe();
  }

  // 最近の予約を取得
  async getRecentAppointments() {
    const { data, error } = await this.supabase
      .from('appointments')
      .select(`
        id,
        created_at,
        start_time,
        end_time,
        status,
        notes,
        price,
        user_id,
        services!appointments_service_id_fkey (
          id,
          name,
          description,
          duration,
          price,
          category
        ),
        staff!appointments_staff_id_fkey (
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

    if (error) {
      console.error('❌ 予約データ取得エラー:', error);
      throw error;
    }

    return data;
  }

  // 売上データを取得
  async getSalesData(startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase
      .from('appointments')
      .select(`
        id,
        created_at,
        start_time,
        end_time,
        price,
        service:service_id (
          id,
          name,
          price
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('❌ 売上データ取得エラー:', error);
      throw error;
    }

    return data;
  }

  // 統計情報を取得
  async getAppointmentStats() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data, error } = await this.supabase
      .from('appointments')
      .select(`
        id,
        created_at,
        start_time,
        end_time,
        price,
        service:service_id (
          id,
          name,
          price
        )
      `)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .lte('created_at', today.toISOString());

    if (error) {
      console.error('❌ 統計情報取得エラー:', error);
      throw error;
    }

    return data;
  }
}