import { createClient } from "@/lib/supabase/client";

export interface Appointment {
  id: string;
  user_id: string;
  service_id: string;
  staff_id: string;
  date: string;
  status: string;
  created_at: string;
}

export interface AppointmentResponse {
  data: Appointment | null;
  error: Error | null;
}

export async function createAppointment(data: Partial<Appointment>): Promise<AppointmentResponse> {
  const supabase = createClient();
  
  try {
    const { data: appointment, error } = await supabase
      .from("appointments")
      .insert([data])
      .select()
      .single();

    if (error) throw error;

    return { data: appointment, error: null };
  } catch (error) {
    console.error("Error creating appointment:", error);
    return { data: null, error: error as Error };
  }
} 