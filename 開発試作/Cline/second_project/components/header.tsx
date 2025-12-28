"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { isAdmin } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/admin/user-nav';
import { Menu, Bell, LogOut, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import supabase from "@/lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from 'next/image';

interface Notification {
  id: number;
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'achievement' | 'milestone';
  goal_id?: number;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  actor_profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navItems, setNavItems] = useState([
    { name: 'ホーム', href: '/' },
    { name: 'サービス', href: '/services' },
    { name: '料金', href: '/pricing' },
    { name: 'お問い合わせ', href: '/contact' },
  ]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await isAdmin(user.id);
        
        // ナビゲーションの更新
        const updatedNav = [
          { name: 'ホーム', href: '/' },
          { name: 'サービス', href: '/services' },
          { name: '料金', href: '/pricing' },
          { name: 'お問い合わせ', href: '/contact' },
        ];

        updatedNav.push(
          { name: 'コミュニティ', href: '/goals' },
          { name: 'マイページ', href: '/mypage' }
        );
        if (adminStatus) {
          updatedNav.push({ name: '管理画面', href: '/admin' });
        }

        setNavItems(updatedNav);
      } else {
        setNavItems([
          { name: 'ホーム', href: '/' },
          { name: 'サービス', href: '/services' },
          { name: '料金', href: '/pricing' },
          { name: 'お問い合わせ', href: '/contact' },
        ]);
      }
    };

    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user) return;

    if (!supabase) {
      console.error('❌ Supabaseクライアントの初期化に失敗しました');
      return;
    }

    try {
      const { data: notifications, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor_profile:actor_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications(notifications || []);
    } catch (error) {
      console.error('通知の取得に失敗しました:', error);
    }
  }, [user]);

  const markAsRead = async () => {
    if (!user || !notifications.length) return;

    if (!supabase) {
      console.error('❌ Supabaseクライアントの初期化に失敗しました');
      return;
    }

    const unreadIds = notifications
      .filter((n: Notification) => !n.is_read)
      .map(n => n.id);

    if (!unreadIds.length) return;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);

    if (error) {
      console.error('通知の既読更新エラー:', error);
      return;
    }

    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    loadNotifications();
    
    if (!user?.id) return;

    if (!supabase) {
      console.error('❌ Supabaseクライアントの初期化に失敗しました');
      return;
    }

    // リアルタイム更新のサブスクリプション
    const channel = supabase.channel('notifications-' + user.id);
    const subscription = channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      channel.unsubscribe();
    };
  }, [user, loadNotifications]);

  const handleNavigation = (href: string) => {
    setIsMenuOpen(false); // メニューを閉じる
    router.push(href);
  };

  return (
    <>
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isScrolled && "shadow-sm"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
              <Link href="/" className="flex items-center gap-2">
                <div className="bg-white/0 w-8 h-8 flex items-center justify-center relative">
                  <Sparkles className="h-6 w-6 text-pink-600" />
                </div>
                <span className="text-lg md:text-xl font-bold whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                  Inner Glow Beauty
                </span>
              </Link>
              <nav className="hidden md:flex gap-4 md:gap-6">
                {navItems.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary whitespace-nowrap",
                      pathname === link.href
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              {user ? (
                <UserNav />
              ) : (
                <Button asChild variant="outline" size="sm" className="md:text-base whitespace-nowrap">
                  <Link href="/auth">ログイン</Link>
                </Button>
              )}
              <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <Button variant="ghost" size="icon" className="ml-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">メニューを開く</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[80vw] sm:w-[350px]">
                  <SheetHeader>
                    <SheetTitle>メニュー</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-4 mt-6">
                    {navItems.map((link) => (
                      <button
                        key={link.name}
                        onClick={() => handleNavigation(link.href)}
                        className={cn(
                          "text-base font-medium transition-colors hover:text-primary py-2 text-left",
                          pathname === link.href
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {link.name}
                      </button>
                    ))}
                  </nav>
                </SheetContent>
              </Sheet>
              <Popover open={isOpen} onOpenChange={(open) => {
                setIsOpen(open);
                if (open) markAsRead();
              }}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h3 className="font-semibold">通知</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        通知はありません
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b hover:bg-muted/50 transition-colors ${
                            !notification.is_read ? 'bg-muted/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={notification.actor_profile.avatar_url || undefined} />
                              <AvatarFallback>
                                {(notification.actor_profile.full_name || 'User')[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm">
                                <span className="font-medium">
                                  {notification.actor_profile.full_name || 'Anonymous'}
                                </span>
                                さんが
                                {notification.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(notification.created_at).toLocaleString('ja-JP')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </header>
      <div className="h-16" />
    </>
  );
} 