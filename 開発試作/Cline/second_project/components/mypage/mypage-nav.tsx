"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Gift,
  Settings,
  User,
  Camera,
  Target,
  BookOpen,
} from "lucide-react";

interface MyPageNavProps {
  onItemClick?: () => void;
}

const links = [
  { name: "予約管理", href: "/mypage/appointments", icon: Calendar },
  { name: "プロフィール", href: "/mypage/profile", icon: User },
  { name: "ギャラリー", href: "/mypage/gallery", icon: Camera },
  { name: "目標管理", href: "/mypage/goals", icon: Target },
  { name: "ストーリー", href: "/mypage/story", icon: BookOpen },
  { name: "特典", href: "/mypage/rewards", icon: Gift },
  { name: "設定", href: "/settings", icon: Settings },
];

export function MyPageNav({ onItemClick }: MyPageNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}