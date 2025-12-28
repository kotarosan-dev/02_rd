"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { BookingForm } from "@/components/booking/booking-form";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

export default function BookingPage() {
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
      }
    };
    checkAuth();
  }, [router, supabase]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          ご予約
        </h1>
        <div className="bg-card rounded-lg shadow-lg p-6">
          <BookingForm />
        </div>
      </div>
    </div>
  );
}