// This file already follows the desired pattern:
// - Uses default supabase import
// - No getBrowserClient usage
// - No unnecessary null checks
// The code can remain unchanged:

import { useState, useEffect } from 'react';
import type { User } from '../types';
import supabase from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function useUsers() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const initializeAuth = async (session: Session | null) => {
        try {
            if (!session) {
                setCurrentUser(null);
                return;
            }

            const { data: userData, error: userError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (userError) throw userError;

            setCurrentUser({
                id: userData.id,
                name: userData.full_name || '',
                email: userData.email || '',
                avatar: userData.avatar_url,
                role: userData.role || 'user',
            });
        } catch (error) {
            console.error('Error initializing auth:', error);
            setError(error instanceof Error ? error : new Error('認証の初期化中にエラーが発生しました'));
        }
    };

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            if (!mounted) return;
            try {
                const { data: session } = await supabase.auth.getSession();
                if (mounted) {
                    await initializeAuth(session?.session);
                }
            } catch (error) {
                console.error('Error getting session:', error);
                if (mounted) {
                    setError(error instanceof Error ? error : new Error('セッションの取得中にエラーが発生しました'));
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    }, []);

    return {
        currentUser,
        loading,
        error
    };
}