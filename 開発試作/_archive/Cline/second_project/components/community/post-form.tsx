"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createForumPost, uploadImage, updateForumPost } from "@/lib/community";
import { Badge } from "@/components/ui/badge";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import type { ForumPost } from "@/types/community";
import Image from "next/image";

const CATEGORIES = [
  "一般",
  "質問",
  "情報共有",
  "体験談",
  "おすすめ",
  "相談",
] as const;

interface PostFormProps {
  post?: ForumPost;
  onPostCreated: () => void;
  onCancel?: () => void;
}

export function PostForm({ post, onPostCreated, onCancel }: PostFormProps) {
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState<string>(post?.category || "一般");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [images, setImages] = useState<string[]>(post?.images || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (tags.length >= 5) {
        toast({
          title: "タグ数制限",
          description: "タグは最大5個までです",
          variant: "destructive",
        });
        return;
      }
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    try {
      setIsUploading(true);
      const uploadPromises = Array.from(files).map(file => uploadImage(file));
      const results = await Promise.all(uploadPromises);
      setImages([...images, ...results.map(result => result.url)]);
    } catch (error) {
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      const postData = {
        content,
        category,
        tags,
        images,
      };

      const { error } = post
        ? await updateForumPost({ id: post.id, ...postData })
        : await createForumPost(postData);
      
      if (error) throw error;

      toast({
        title: post ? "更新完了" : "投稿完了",
        description: post ? "投稿を更新しました" : "投稿が作成されました",
      });
      
      setContent("");
      setCategory("一般");
      setTags([]);
      setImages([]);
      onPostCreated();
      if (onCancel) onCancel();
    } catch (error) {
      toast({
        title: "エラー",
        description: post ? "投稿の更新に失敗しました" : "投稿の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">カテゴリー</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="カテゴリーを選択" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">投稿内容</Label>
          <Textarea
            id="content"
            placeholder="投稿内容を入力してください..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="images">画像</Label>
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || images.length >= 9}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              画像を追加
            </Button>
            <p className="text-sm text-muted-foreground">
              最大9枚まで（1枚5MB以内）
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {images.map((image, index) => (
                <div key={index} className="relative group aspect-square">
                  <Image
                    src={image}
                    alt={`アップロード画像 ${index + 1}`}
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 33vw, 25vw"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveImage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">タグ（最大5個）</Label>
          <Input
            id="tags"
            placeholder="タグを入力してEnterで追加..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="px-2 py-1">
                  #{tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !content.trim() || isUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {post ? "更新中..." : "投稿中..."}
              </>
            ) : (
              post ? "更新する" : "投稿する"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}