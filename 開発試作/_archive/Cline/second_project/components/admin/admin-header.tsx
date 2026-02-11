"use client";

import { UserNav } from "./user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4 gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Home className="h-5 w-5" />
            <span className="sr-only">トップページへ戻る</span>
          </Button>
        </Link>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}