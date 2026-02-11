"use client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'edge';

import { useState, useEffect, useCallback } from "react";
import { ForumPost } from "@/components/community/forum-post";
import { getBookmarkedPosts, likePost, toggleBookmark, deleteForumPost } from "@/lib/community";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import type { ForumPost as ForumPostType } from "@/types/community";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PostForm } from "@/components/community/post-form";

export default function BookmarksPage() {
  const [posts, setPosts] = useState<ForumPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<ForumPostType | null>(null);
  const [deletingPost, setDeletingPost] = useState<ForumPostType | null>(null);
  const { toast } = useToast();

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await getBookmarkedPosts();
      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error loading bookmarked posts:", error);
      toast({
        title: "エラー",
        description: "ブックマークの読み込みに失敗しました",
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

      // 楽観的更新 - ブックマークページでは削除
      setPosts(posts.filter(post => post.id !== postId));

      toast({
        title: "完了",
        description: "ブックマークを解除しました",
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
        await navigator.share(shareData);
      } else {
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

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">ブックマーク</h1>
        <Button
          variant="outline"
          onClick={() => window.history.back()}
        >
          戻る
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          ブックマークした投稿はありません
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
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