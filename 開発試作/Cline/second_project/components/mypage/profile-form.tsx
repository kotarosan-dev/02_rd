"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import supabase from '@/lib/supabase';
import { AvatarUpload } from "./avatar-upload";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        setProfile(data);
        setFullName(data.full_name || '');
      } catch (error: any) {
        console.error("Error loading profile:", error);
        toast({
          title: "エラー",
          description: "プロフィールの読み込みに失敗しました",
          variant: "destructive",
        });
      }
    };

    loadProfile();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast({
        title: "更新完了",
        description: "プロフィールを更新しました",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">プロフィール設定</h2>
          <AvatarUpload
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            onAvatarChange={(url) => {
              setProfile(prev => prev ? { ...prev, avatar_url: url } : null);
            }}
          />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">お名前</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="お名前を入力してください"
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "更新中..." : "更新する"}
          </Button>
        </form>
      </div>
    </Card>
  );
}