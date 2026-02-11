"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { Camera, Upload, Star } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";

interface BeforeAfter {
  id: number;
  user_id: string;
  title: string;
  description: string;
  before_image_url: string;
  after_image_url: string;
  category: string;
  treatment_period: string;
  likes: number;
  created_at: string;
  is_featured: boolean;
}

const CATEGORIES = [
  "スキンケア",
  "ヘアケア",
  "ボディケア",
  "メイク",
  "その他"
] as const;

type Category = typeof CATEGORIES[number];
type CategoryWithAll = Category | "すべて";

export default function GalleryPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BeforeAfter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithAll>("すべて");
  const { toast } = useToast();

  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0] as Category,
    treatment_period: "",
    before_image: null as File | null,
    after_image: null as File | null,
  });

  useEffect(() => {
    if (!user?.id) return;

    const loadPosts = async () => {
      try {
        const { data, error } = await supabase
          .from('before_after')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPosts(data || []);
      } catch (error) {
        console.error('❌ ギャラリーデータ取得エラー:', error);
        toast({
          title: "エラー",
          description: "ギャラリーデータの取得に失敗しました",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [user, toast]);

  const handleImageUpload = async (file: File, type: 'before' | 'after') => {
    try {
      if (!user) throw new Error("認証が必要です");

      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Math.random()}.${fileExt}`;
      const filePath = `before-after/${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      throw error;
    }
  };

  const handleCreatePost = async () => {
    try {
      if (!user) throw new Error("認証が必要です");

      if (!newPost.before_image || !newPost.after_image) {
        toast({
          title: "エラー",
          description: "ビフォー・アフター両方の画像が必要です",
          variant: "destructive",
        });
        return;
      }

      const beforeImageUrl = await handleImageUpload(newPost.before_image, 'before');
      const afterImageUrl = await handleImageUpload(newPost.after_image, 'after');

      const { data, error } = await supabase
        .from('before_after')
        .insert([
          {
            user_id: user.id,
            title: newPost.title,
            description: newPost.description,
            before_image_url: beforeImageUrl,
            after_image_url: afterImageUrl,
            category: newPost.category,
            treatment_period: newPost.treatment_period,
            likes: 0,
            is_featured: false,
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setPosts([data, ...posts]);
      setShowNewPostDialog(false);
      toast({
        title: "投稿を作成しました",
        description: "ビフォーアフター写真を公開しました",
      });
    } catch (error) {
      console.error('❌ 投稿作成エラー:', error);
      toast({
        title: "エラー",
        description: "投稿の作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (postId: number) => {
    try {
      if (!user) {
        toast({
          title: "ログインが必要です",
          description: "いいねするにはログインが必要です",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('before_after')
        .update({ likes: posts.find(p => p.id === postId)!.likes + 1 })
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.map(post =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      ));
    } catch (error) {
      toast({
        title: "エラー",
        description: "いいねの処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  const filteredPosts = selectedCategory === "すべて"
    ? posts
    : posts.filter(post => post.category === selectedCategory);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">ビフォーアフター ギャラリー</h2>
        <Button onClick={() => setShowNewPostDialog(true)}>
          新しい投稿を作成
        </Button>
      </div>

      <div className="flex justify-end">
        <Select
          value={selectedCategory}
          onValueChange={(value: CategoryWithAll) => setSelectedCategory(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="カテゴリーを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="すべて">すべて</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          投稿がありません
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="relative aspect-[4/3]">
                <div className="absolute inset-0 grid grid-cols-2">
                  <div className="relative">
                    <Image
                      src={post.before_image_url}
                      alt="Before"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      Before
                    </div>
                  </div>
                  <div className="relative">
                    <Image
                      src={post.after_image_url}
                      alt="After"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-sm">
                      After
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{post.title}</h3>
                  {post.is_featured && (
                    <Star className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{post.description}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div>
                    <span>{post.category}</span>
                    <span className="mx-2">•</span>
                    <span>期間: {post.treatment_period}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(post.id)}
                    className="gap-1"
                  >
                    👍 {post.likes}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>新しいビフォーアフター投稿</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                タイトル
              </label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="変化の内容を簡潔に"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                説明
              </label>
              <Textarea
                value={newPost.description}
                onChange={(e) => setNewPost({ ...newPost, description: e.target.value })}
                placeholder="どのようなケアを行ったか、結果についてなど"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  カテゴリー
                </label>
                <Select
                  value={newPost.category}
                  onValueChange={(value: Category) => setNewPost({ ...newPost, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  期間
                </label>
                <Input
                  value={newPost.treatment_period}
                  onChange={(e) => setNewPost({ ...newPost, treatment_period: e.target.value })}
                  placeholder="例: 3ヶ月"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  ビフォー写真
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewPost({ ...newPost, before_image: file });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  アフター写真
                </label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setNewPost({ ...newPost, after_image: file });
                  }}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPostDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreatePost}>
              投稿する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 