import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

// サーバーサイド用のクライアント
export const createServerClient = () => {
  return createServerComponentClient<Database>({ cookies })
}

export default createServerClient 