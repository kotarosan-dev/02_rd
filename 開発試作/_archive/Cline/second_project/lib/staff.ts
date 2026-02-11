import { createClient } from "@/lib/supabase/client";

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  created_at: string;
}

export async function getStaff() {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("staff")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }

  return data as Staff[];
} 