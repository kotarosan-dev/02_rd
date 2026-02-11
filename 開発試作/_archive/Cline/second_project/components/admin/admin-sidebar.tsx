"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Gift,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  LineChart,
  ChevronLeft,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navigation = [
  { name: "ダッシュボード", href: "/admin", icon: LayoutDashboard },
  { name: "予約管理", href: "/admin/appointments", icon: Calendar },
  { name: "特典管理", href: "/admin/rewards", icon: Gift },
  { name: "特典分析", href: "/admin/rewards/analytics", icon: LineChart },
  { name: "顧客管理", href: "/admin/customers", icon: Users },
  { name: "売上管理", href: "/admin/sales", icon: LineChart },
  { name: "チャット", href: "/admin/chat", icon: MessageCircle },
  { name: "設定", href: "/admin/settings", icon: Settings },
  { name: "ユーザー管理", href: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-40 h-screen border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-16 transition-all duration-300",
      isCollapsed ? "w-[70px]" : "w-64"
    )}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "absolute -right-4 top-20 h-8 w-8 rounded-full border bg-background",
          isCollapsed && "rotate-180"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex h-full flex-col gap-4">
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-x-3 rounded-md px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}