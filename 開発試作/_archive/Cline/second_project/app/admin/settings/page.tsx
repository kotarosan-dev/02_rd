"use client";

import { useState } from 'react';
import { ImageUpload } from '@/components/image-upload';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import supabase from '@/lib/supabase';
import Image from 'next/image';

export default function SettingsPage() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const handleLogoUpload = async (url: string) => {
    try {
      // サイト設定テーブルにロゴURLを保存
      const { error } = await supabase
        .from('site_settings')
        .upsert({ 
          key: 'logo_url',
          value: url
        });

      if (error) throw error;
      
      setLogoUrl(url);
      alert('ロゴを更新しました');
    } catch (error) {
      console.error('ロゴの更新に失敗しました:', error);
      alert('ロゴの更新に失敗しました');
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">サイト設定</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>ロゴ設定</CardTitle>
          <CardDescription>
            サイトで使用するロゴを設定します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logoUrl && (
              <div className="w-48">
                <Image
                  src={logoUrl}
                  alt="サイトロゴ"
                  width={192}
                  height={192}
                  className="w-full h-auto"
                />
              </div>
            )}
            <ImageUpload
              folder="logos"
              onUploadComplete={handleLogoUpload}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}