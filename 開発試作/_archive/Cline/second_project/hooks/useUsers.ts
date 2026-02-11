import { useState, useEffect } from 'react';
import type { User, Profile } from '../types';
import supabase from '../lib/supabase';
import { useAuth } from '../lib/auth-context';

export function useUsers() {
  const { user: authUser, session } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !authUser) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) throw error;

        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.full_name || '',
            email: profile.email || '',
            avatar: profile.avatar_url,
            role: profile.role
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, authUser]);

  return { currentUser, loading };
}
