"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { uploadAvatar, deleteAvatar } from "@/lib/storage-utils";
import { User, Upload, X, Loader2 } from "lucide-react";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  onAvatarChange: (url: string | null) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, onAvatarChange }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "エラー",
        description: "ファイルサイズは2MB以下にしてください",
        variant: "destructive",
      });
      return;
    }

    // ファイル形式チェック
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast({
        title: "エラー",
        description: "JPEGまたはPNG形式の画像を選択してください",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const { publicUrl, error } = await uploadAvatar(userId, file);
      
      if (error) throw error;
      if (publicUrl) {
        onAvatarChange(publicUrl);
        toast({
          title: "アップロード完了",
          description: "プロフィール画像を更新しました",
        });
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    try {
      setIsUploading(true);
      const { error } = await deleteAvatar(userId, currentAvatarUrl);
      
      if (error) throw error;
      
      onAvatarChange(null);
      toast({
        title: "削除完了",
        description: "プロフィール画像を削除しました",
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
      toast({
        title: "エラー",
        description: "画像の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>プロフィール画像</Label>
      <div className="flex items-center gap-4">
        <Avatar className="w-24 h-24 border">
          {currentAvatarUrl && (
            <AvatarImage
              src={`${currentAvatarUrl}?v=${new Date().getTime()}`}
              alt="Profile"
              onError={(e) => {
                console.error('Avatar image load error:', e);
                // エラー時にフォールバックを表示
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          )}
          <AvatarFallback className="bg-muted">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <div>
            <input
              type="file"
              id="avatar"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <Label
              htmlFor="avatar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
              onClick={(e) => {
                if (isUploading) {
                  e.preventDefault();
                }
              }}
            >
              <Upload className="h-4 w-4" />
              {isUploading ? "アップロード中..." : "画像を選択"}
            </Label>
          </div>
          {currentAvatarUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={isUploading}
              className="text-destructive"
            >
              <X className="h-4 w-4 mr-2" />
              削除
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        2MB以下のJPEGまたはPNG形式の画像をアップロードできます
      </p>
    </div>
  );
}