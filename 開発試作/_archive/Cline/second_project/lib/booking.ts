import { createClient } from "@/lib/supabase/client";

export interface Booking {
  id: string;
  start_time: string;
  status: string;
  service: {
    name: string;
    duration: number;
    price: number;
  };
}

export interface BookingResponse {
  data: Booking[] | null;
  error: Error | null;
}

export async function getUserBookings(): Promise<BookingResponse> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id,
        start_time,
        status,
        service:services!inner (
          name,
          duration,
          price
        )
      `)
      .order("start_time", { ascending: false })
      .returns<{
        id: string;
        start_time: string;
        status: string;
        service: [{
          name: string;
          duration: number;
          price: number;
        }];
      }[]>();

    if (error) throw error;

    const bookings = data.map(booking => ({
      ...booking,
      service: booking.service[0]
    }));

    return { data: bookings, error: null };
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return { data: null, error: error as Error };
  }
}

export async function cancelBooking(bookingId: string): Promise<{ error: Error | null }> {
  const supabase = createClient();
  
  try {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error("Error cancelling booking:", error);
    return { error: error as Error };
  }
} 