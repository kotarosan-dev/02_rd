import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase';

const services = [
  {
    name: "フルフェイシャルケア",
    description: "肌分析から始まるパーソナライズされたフェイシャルトリートメント",
    duration: 60,
    price: 12000,
    category: "beauty"
  },
  {
    name: "ホリスティックマッサージ",
    description: "心と体のバランスを整える全身マッサージ",
    duration: 90,
    price: 15000,
    category: "beauty"
  },
  {
    name: "アンチエイジングケア",
    description: "最新技術を用いた年齢肌ケアトリートメント",
    duration: 75,
    price: 18000,
    category: "beauty"
  },
  {
    name: "パーソナルメンタリング",
    description: "あなたの目標に合わせた個別カウンセリング",
    duration: 45,
    price: 10000,
    category: "mentoring"
  },
  {
    name: "グループセッション",
    description: "少人数制の共有と学びの場",
    duration: 90,
    price: 8000,
    category: "mentoring"
  },
  {
    name: "ライフスタイル設計",
    description: "理想の生活を実現するための具体的なプランニング",
    duration: 120,
    price: 20000,
    category: "mentoring"
  }
];

const staff = [
  {
    name: "山田 花子",
    role: "ビューティセラピスト",
    bio: "10年以上の美容施術経験を持つベテランセラピスト",
    image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80"
  },
  {
    name: "佐藤 美咲",
    role: "メンタルケアカウンセラー",
    bio: "心理カウンセリングのスペシャリスト",
    image_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80"
  },
  {
    name: "鈴木 健一",
    role: "ホリスティックセラピスト",
    bio: "東洋医学とメンタルケアを組み合わせた施術を提供",
    image_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80"
  }
];

export async function seedInitialData() {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    if (!supabase) {
      throw new Error('Supabaseクライアントの初期化に失敗しました');
    }
    
    // 現在のユーザーと権限を確認
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('認証が必要です');

    // 管理者権限の確認
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');

    // サービスの追加
    const { error: servicesError } = await supabase
      .from('services')
      .upsert(services, {
        onConflict: 'name',
        ignoreDuplicates: false
      });

    if (servicesError) throw servicesError;

    // スタッフの追加
    const { error: staffError } = await supabase
      .from('staff')
      .upsert(staff, {
        onConflict: 'name',
        ignoreDuplicates: false
      });

    if (staffError) throw staffError;

    console.log('✅ 初期データの登録が完了しました');
    return { error: null };
  } catch (error) {
    console.error('❌ 初期データの登録に失敗しました:', error);
    return { error };
  }
}