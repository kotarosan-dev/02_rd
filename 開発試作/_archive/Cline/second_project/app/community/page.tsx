"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ForumPost } from "@/components/community/forum-post";
import { PostForm } from "@/components/community/post-form";
import { useState, useEffect, useCallback } from "react";
import { getForumPosts, likePost, toggleBookmark, deleteForumPost } from "@/lib/community";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { Search, Bookmark } from "lucide-react";
import type { ForumPost as ForumPostType } from "@/types/community";
import Link from "next/link";

const CATEGORIES = [
  "すべて",
  "一般",
  "質問",
  "情報共有",
  "体験談",
  "おすすめ",
  "相談",
] as const;

export default function CommunityPage() {
  const [posts, setPosts] = useState<ForumPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("すべて");
  const [editingPost, setEditingPost] = useState<ForumPostType | null>(null);
  const [deletingPost, setDeletingPost] = useState<ForumPostType | null>(null);
  const { toast } = useToast();

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getForumPosts();
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading posts:", error);
      toast({
        title: "エラー",
        description: "投稿の読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleLike = async (postId: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "ログインが必要です",
          description: "いいねするにはログインが必要です",
          variant: "destructive",
        });
        return;
      }

      const { error } = await likePost(postId, user.id);
      if (error) throw error;

      // 楽観的更新
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

  const handleBookmark = async (postId: number) => {
    try {
      const { error } = await toggleBookmark(postId);
      if (error) throw error;

      // 楽観的更新
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, isBookmarked: !post.isBookmarked } : post
      ));

      toast({
        title: "完了",
        description: "ブックマークを更新しました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "ブックマークの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (post: ForumPostType) => {
    setEditingPost(post);
  };

  const handleDelete = async () => {
    if (!deletingPost) return;

    try {
      const { error } = await deleteForumPost(deletingPost.id);
      if (error) throw error;

      toast({
        title: "削除完了",
        description: "投稿を削除しました",
      });

      // 楽観的更新
      setPosts(posts.filter(post => post.id !== deletingPost.id));
      setDeletingPost(null);
    } catch (error) {
      toast({
        title: "エラー",
        description: "投稿の削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleShare = async (postId: number) => {
    try {
      const shareData = {
        title: 'Beauty Connection',
        text: '投稿をチェックする',
        url: `${window.location.origin}/community/post/${postId}`,
      };

      if (navigator.share) {
        // Web Share APIが利用可能な場合
        await navigator.share(shareData);
      } else {
        // Web Share APIが利用できない場合は、URLをコピー
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: "URLをコピーしました",
          description: "投稿のURLをクリップボードにコピーしました",
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        toast({
          title: "エラー",
          description: "共有に失敗しました",
          variant: "destructive",
        });
      }
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "すべて" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">コミュニティ</h1>
        <Link href="/community/bookmarks">
          <Button variant="outline" className="gap-2">
            <Bookmark className="h-4 w-4" />
            ブックマーク一覧
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="forum" className="space-y-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forum">フォーラム</TabsTrigger>
          <TabsTrigger value="events">イベント</TabsTrigger>
          <TabsTrigger value="groups">グループ</TabsTrigger>
        </TabsList>

        <TabsContent value="forum" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="投稿を検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="カテゴリーを選択" />
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

          <PostForm onPostCreated={loadPosts} />
          
          {loading ? (
            <div className="text-center py-8">読み込み中...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery || selectedCategory !== "すべて" ? "該当する投稿が見つかりません" : "投稿がありません"}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPosts.map((post) => (
                <ForumPost
                  key={post.id}
                  {...post}
                  onLike={() => handleLike(post.id)}
                  onComment={() => {}} // コメント機能は別コンポーネントで実装
                  onShare={() => handleShare(post.id)}
                  onBookmark={() => handleBookmark(post.id)}
                  onEdit={() => handleEdit(post)}
                  onDelete={() => setDeletingPost(post)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="events">
          <div className="text-center text-muted-foreground py-8">
            イベント機能は近日公開予定です
          </div>
        </TabsContent>

        <TabsContent value="groups">
          <div className="text-center text-muted-foreground py-8">
            グループ機能は近日公開予定です
          </div>
        </TabsContent>
      </Tabs>

      {/* 編集ダイアログ */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>投稿を編集</DialogTitle>
          </DialogHeader>
          {editingPost && (
            <PostForm
              post={editingPost}
              onPostCreated={() => {
                loadPosts();
                setEditingPost(null);
              }}
              onCancel={() => setEditingPost(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={!!deletingPost} onOpenChange={(open) => !open && setDeletingPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>投稿の削除</DialogTitle>
            <DialogDescription>
              この投稿を削除してもよろしいですか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeletingPost(null)}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}