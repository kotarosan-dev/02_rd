import { Suspense } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">ユーザー管理</h1>
      
      <div className="grid gap-4">
        {users?.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{user.full_name || '名前未設定'}</h2>
                <p className="text-gray-600">{user.email}</p>
              </div>
              <div className="space-x-2">
                <Link href={`/admin/users/${user.id}/analysis`}>
                  <Button variant="outline">
                    ユーザー分析
                  </Button>
                </Link>
                <Link href={`/admin/users/${user.id}`}>
                  <Button>
                    詳細を表示
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
} 