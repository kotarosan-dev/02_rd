"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ForumPost } from "@/components/community/forum-post";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import { getForumPosts, likePost, toggleBookmark, deleteForumPost } from "@/lib/community";
import type { ForumPost as ForumPostType } from "@/types/community";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function UserProfilePage({ params }: { params: { userId: string } }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<ForumPostType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', params.userId)
          .single();

        if (error) throw error;
        setProfile(data);

        // ユーザーの投稿を取得
        const { data: posts, error: postsError } = await getForumPosts();
        if (postsError) throw postsError;
        if (posts) {
          setPosts(posts.filter(post => post.author.name === data.full_name));
        }
      } catch (error) {
        toast({
          title: "エラー",
          description: "プロフィールの読み込みに失敗しました",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [params.userId, toast]);

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

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-8">読み込み中...</div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-8 text-muted-foreground">
          ユーザーが見つかりません
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/community">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">プロフィール</h1>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{profile.full_name?.[0] || '?'}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-semibold">{profile.full_name || '匿名ユーザー'}</h2>
            <p className="text-sm text-muted-foreground">
              登録日: {new Date(profile.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="posts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="posts">投稿 ({posts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              投稿はありません
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <ForumPost
                  key={post.id}
                  {...post}
                  onLike={() => handleLike(post.id)}
                  onComment={() => {}}
                  onShare={() => handleShare(post.id)}
                  onBookmark={() => handleBookmark(post.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
} 