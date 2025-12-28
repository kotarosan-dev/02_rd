export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string
          user_id: string
          service_id: string
          staff_id: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service_id: string
          staff_id: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service_id?: string
          staff_id?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'cancelled'
          created_at?: string
        }
        Relationships: {
          user_id: 'profiles'
          service_id: 'services'
          staff_id: 'staff'
        }
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string
          email: string
          avatar_url: string | null
          created_at: string
          role: 'user' | 'admin' | null
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          email: string
          avatar_url?: string | null
          created_at?: string
          role?: 'user' | 'admin' | null
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          email?: string
          avatar_url?: string | null
          created_at?: string
          role?: 'user' | 'admin' | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          description: string | null
          duration: number
          price: number
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration: number
          price: number
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration?: number
          price?: number
          category?: string
          created_at?: string
        }
      }
      staff: {
        Row: {
          id: string
          user_id: string | null
          name: string
          bio: string | null
          image_url: string | null
          created_at: string
          role: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          bio?: string | null
          image_url?: string | null
          created_at?: string
          role?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          bio?: string | null
          image_url?: string | null
          created_at?: string
          role?: string | null
        }
      }
    }
  }
}