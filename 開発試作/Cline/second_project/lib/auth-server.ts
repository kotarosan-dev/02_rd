import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function getSession() {
  const supabase = createRouteHandlerClient({ cookies });
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

export async function getUserRole() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const supabase = createRouteHandlerClient({ cookies });
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();

  return profile?.role;
}

export async function requireAdmin() {
  const role = await getUserRole();
  if (role !== 'admin') {
    throw new Error('Unauthorized');
  }
} 