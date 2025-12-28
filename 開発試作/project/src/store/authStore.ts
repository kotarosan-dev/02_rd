import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAdminStatus: () => Promise<void>;
  updateProfile: (data: { display_name: string }) => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      set({ user: data.user });
      await get().checkAdminStatus();
      await get().fetchProfile();
      
      return { error: null };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as Error };
    }
  },
  signUp: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        set({ user: data.user });
        await get().fetchProfile();
      }
      
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as Error };
    }
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    set({ user: null, isAdmin: false, profile: null });
  },
  setUser: async (user) => {
    set({ user });
    if (user) {
      await get().checkAdminStatus();
      await get().fetchProfile();
    }
  },
  checkAdminStatus: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isAdmin: false });
        return;
      }

      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single();

      set({ isAdmin: !!adminData });
    } catch (err) {
      console.error('Error checking admin status:', err);
      set({ isAdmin: false });
    }
  },
  fetchProfile: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ profile: null });
        return;
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                user_id: user.id,
                email: user.email,
                display_name: `ゲスト${Math.floor(Math.random() * 1000)}`
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            return;
          }
          profile = newProfile;
        } else {
          console.error('Error fetching profile:', error);
          return;
        }
      }

      set({ profile });
    } catch (err) {
      console.error('Error in fetchProfile:', err);
    }
  },
  updateProfile: async (data: { display_name: string }) => {
    const { user } = get();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('user_id', user.id);

    if (error) throw error;
    await get().fetchProfile();
  },
}));