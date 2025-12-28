import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, User } from "lucide-react";
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import supabase from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, onUploadComplete }: AvatarUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0
  });
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const { toast } = useToast();

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setSelectedImage(reader.result as string);
        setShowCropDialog(true);
      });
      reader.readAsDataURL(e.target.files[0]);
    }
    e.target.value = ''; // リセット
  };

  const getCroppedImg = async (
    image: HTMLImageElement,
    crop: Crop
  ): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'));
            return;
          }
          resolve(blob);
        },
        'image/jpeg',
        1
      );
    });
  };

  const uploadAvatar = async () => {
    if (!imageRef.current || !selectedImage) return;

    try {
      setUploading(true);
      const croppedImageBlob = await getCroppedImg(imageRef.current, crop);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // 古いアバターを削除
      if (currentAvatarUrl) {
        const oldAvatarPath = currentAvatarUrl.split('/').pop();
        if (oldAvatarPath) {
          await supabase.storage.from('avatars').remove([oldAvatarPath]);
        }
      }

      // 新しいアバターをアップロード
      const fileName = `${user.id}-${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedImageBlob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '0'
        });

      if (error) throw error;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // プロフィールを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast({
        title: "アップロード完了",
        description: "プロフィール画像を更新しました",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setShowCropDialog(false);
      setSelectedImage(null);
    }
  };

  const handleDelete = async () => {
    if (!currentAvatarUrl) return;

    try {
      setUploading(true);
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('ユーザーが見つかりません');
      }

      // アバター画像を削除
      const avatarPath = currentAvatarUrl.split('/').pop();
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]);
      }

      // プロフィールを更新
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) throw updateError;

      onUploadComplete('');
      toast({
        title: "削除完了",
        description: "プロフィール画像を削除しました",
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "エラー",
        description: "画像の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="relative flex shrink-0 overflow-hidden rounded-full w-24 h-24 border">
        {currentAvatarUrl ? (
          <Image
            src={currentAvatarUrl}
            alt="プロフィール画像"
            fill
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-muted">
            <User className="h-8 w-8" />
          </span>
        )}
      </span>

      <div className="space-y-2">
        <div>
          <input
            id="avatar"
            type="file"
            accept="image/jpeg,image/png"
            onChange={onSelectFile}
            className="hidden"
          />
          <label
            htmlFor="avatar"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
          >
            <Upload className="h-4 w-4" />
            画像を選択
          </label>
        </div>

        {currentAvatarUrl && (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={handleDelete}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            削除
          </Button>
        )}
      </div>

      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>画像の切り抜き</DialogTitle>
            <DialogDescription>
              プロフィール画像として使用する部分を選択してください
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="mt-4">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                aspect={1}
                circularCrop
              >
                <Image
                  ref={imageRef}
                  src={selectedImage}
                  alt="クロップ対象"
                  width={400}
                  height={400}
                  style={{ maxHeight: '400px' }}
                />
              </ReactCrop>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCropDialog(false);
                setSelectedImage(null);
              }}
            >
              キャンセル
            </Button>
            <Button
              onClick={uploadAvatar}
              disabled={uploading}
            >
              {uploading ? "アップロード中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 