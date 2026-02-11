import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserAnalysis } from '@/components/admin/analysis/user-analysis';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PageProps {
  params: {
    userId: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export const dynamic = 'force-dynamic';

export default async function UserAnalysisPage({ params }: PageProps) {
  const supabase = createServerComponentClient({ cookies });

  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', params.userId)
    .single();

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">ユーザーが見つかりません</h1>
        <Link href="/admin/users">
          <Button>ユーザー一覧に戻る</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">ユーザー分析</h1>
        <Link href="/admin/users">
          <Button variant="outline">ユーザー一覧に戻る</Button>
        </Link>
      </div>

      <UserAnalysis
        userId={user.id}
        userName={user.full_name || '名前未設定'}
      />
    </div>
  );
} 