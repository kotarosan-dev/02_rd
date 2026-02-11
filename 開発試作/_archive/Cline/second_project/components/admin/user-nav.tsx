"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import supabase from '@/lib/supabase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function UserNav() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user]);

  const loadProfile = async (userId: string) => {
    try {
      console.log('🔄 プロフィール読み込み開始');
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ プロフィール取得エラー:', profileError);
        throw profileError;
      }

      console.log('✅ プロフィール取得成功:', profileData);
      setProfile({
        id: profileData.id,
        full_name: profileData.full_name || 'ユーザー',
        email: profileData.email || '',
        avatar_url: profileData.avatar_url
      });
    } catch (error) {
      console.error('❌ プロフィール取得処理エラー:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      console.log('🔄 サインアウト処理開始');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ サインアウトエラー:', error);
        throw error;
      }

      console.log('✅ サインアウト成功');
      router.push('/auth');
    } catch (error) {
      console.error('❌ サインアウト処理エラー:', error);
    }
  };

  if (loading || !profile) {
    return null;
  }

  const avatarFallback = profile.full_name?.[0]?.toUpperCase() || '?';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={profile.avatar_url || ''} 
              alt={profile.full_name || 'ユーザー'} 
            />
            <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.full_name || 'ユーザー'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email || ''}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/mypage/settings')}>
            設定
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          ログアウト
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}