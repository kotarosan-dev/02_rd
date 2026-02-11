"use client";

import { useState } from 'react';
import supabase from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ImageUploadProps {
  onUploadComplete?: (url: string) => void;
  folder?: string;
}

export function ImageUpload({ onUploadComplete, folder = 'general' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // ファイル名をユニークにする
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // ファイルをアップロード
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // アップロード完了時のコールバックを呼び出す
      if (onUploadComplete) {
        onUploadComplete(publicUrl);
      }
    } catch (error) {
      console.error('画像のアップロードに失敗しました:', error);
      alert('画像のアップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Button
        variant="outline"
        disabled={uploading}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            アップロード中...
          </>
        ) : (
          '画像を選択'
        )}
      </Button>
      <input
        id="fileInput"
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
} 