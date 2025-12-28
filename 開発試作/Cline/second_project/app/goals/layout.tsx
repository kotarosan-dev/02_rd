"use client";

import { Suspense } from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="beauty-connection-theme"
    >
      <AuthProvider>
        <Suspense fallback={<div>Loading...</div>}>
          <div className="min-h-screen bg-background">
            {children}
            <Toaster />
          </div>
        </Suspense>
      </AuthProvider>
    </ThemeProvider>
  );
} 