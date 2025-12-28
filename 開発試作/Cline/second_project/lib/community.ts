import { supabase } from './supabase';
import type { ForumPost, Comment, ImageUploadResponse } from '@/types/community';

interface DatabasePost {
  id: number;
  content: string;
  category: string;
  tags: string[];
  images: string[];
  created_at: string;
  likes: number;
  comments: number;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  user_id: string;
}

interface DatabaseComment {
  id: number;
  content: string;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[];
  user_id: string;
}

interface CreatePostParams {
  content: string;
  category: string;
  tags: string[];
  images?: string[];
}

interface UpdatePostParams extends CreatePostParams {
  id: number;
}

export async function uploadImage(file: File): Promise<ImageUploadResponse> {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${profile.id}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('forum-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('forum-images')
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function createForumPost({ content, category, tags, images = [] }: CreatePostParams) {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    const { error } = await supabase
      .from('forum_posts')
      .insert({
        user_id: profile.id,
        content,
        category,
        tags,
        images,
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error creating forum post:', error);
    return { error };
  }
}

export async function updateForumPost({ id, content, category, tags, images }: UpdatePostParams) {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認と投稿の所有権確認
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (postError) throw postError;
    if (post.user_id !== user.id) throw new Error('この投稿を編集する権限がありません');

    const { error } = await supabase
      .from('forum_posts')
      .update({
        content,
        category,
        tags,
        images,
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating forum post:', error);
    return { error };
  }
}

export async function deleteForumPost(id: number) {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認と投稿の所有権確認
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (postError) throw postError;
    if (post.user_id !== user.id) throw new Error('この投稿を削除する権限がありません');

    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting forum post:', error);
    return { error };
  }
}

export async function getForumPosts() {
  if (!supabase) {
    throw new Error('Supabaseクライアントの初期化に失敗しました');
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id,
        content,
        category,
        tags,
        images,
        created_at,
        likes,
        comments,
        profiles (
          id,
          full_name,
          avatar_url
        ),
        user_id
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data) return { data: null, error: null };

    // ブックマーク状態を取得
    let bookmarks: Record<number, boolean> = {};
    if (user) {
      const { data: bookmarkData } = await supabase
        .from('post_bookmarks')
        .select('post_id')
        .eq('user_id', user.id);

      bookmarks = (bookmarkData || []).reduce((acc, bookmark) => ({
        ...acc,
        [bookmark.post_id]: true,
      }), {});
    }

    return {
      data: data.map((post) => ({
        id: post.id,
        content: post.content,
        category: post.category,
        tags: post.tags,
        images: post.images || [],
        createdAt: new Date(post.created_at),
        likes: post.likes,
        comments: post.comments,
        author: {
          name: post.profiles[0]?.full_name || '匿名ユーザー',
          avatar: post.profiles[0]?.avatar_url,
        },
        isBookmarked: bookmarks[post.id] || false,
        isOwnPost: user?.id === post.user_id,
      })) as ForumPost[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    return { data: null, error };
  }
}

export async function toggleBookmark(postId: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    const { data: existingBookmark, error: checkError } = await supabase
      .from('post_bookmarks')
      .select()
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingBookmark) {
      const { error } = await supabase
        .from('post_bookmarks')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', profile.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('post_bookmarks')
        .insert({ post_id: postId, user_id: profile.id });

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    return { error };
  }
}

export async function getBookmarkedPosts() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    // まずブックマークされた投稿IDを取得
    const { data: bookmarks } = await supabase
      .from('post_bookmarks')
      .select('post_id')
      .eq('user_id', profile.id);

    if (!bookmarks) return { data: [], error: null };

    const bookmarkedIds = bookmarks.map(b => b.post_id);

    // 投稿データを取得
    const { data, error } = await supabase
      .from('forum_posts')
      .select(`
        id,
        content,
        category,
        tags,
        images,
        created_at,
        likes,
        comments,
        profiles (
          id,
          full_name,
          avatar_url
        ),
        user_id
      `)
      .in('id', bookmarkedIds)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      data: data?.map((post: DatabasePost) => ({
        id: post.id,
        content: post.content,
        category: post.category,
        tags: post.tags,
        images: post.images || [],
        createdAt: new Date(post.created_at),
        likes: post.likes,
        comments: post.comments,
        author: {
          name: post.profiles[0]?.full_name || '匿名ユーザー',
          avatar: post.profiles[0]?.avatar_url,
        },
        isBookmarked: true,
        isOwnPost: user.id === post.user_id,
      })) as ForumPost[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching bookmarked posts:', error);
    return { data: null, error };
  }
}

export async function likePost(postId: number, userId: string) {
  try {
    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select()
      .eq('post_id', postId)
      .eq('user_id', profile.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;

    if (existingLike) {
      // いいねを解除
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', profile.id);

      if (deleteError) throw deleteError;

      // いいね数を減らす
      const { error: updateError } = await supabase
        .rpc('decrement_likes', { post_id: postId });

      if (updateError) throw updateError;
    } else {
      // いいねを追加
      const { error: insertError } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: profile.id });

      if (insertError) throw insertError;

      // いいね数を増やす
      const { error: updateError } = await supabase
        .rpc('increment_likes', { post_id: postId });

      if (updateError) throw updateError;
    }

    return { error: null };
  } catch (error) {
    console.error('Error toggling like:', error);
    return { error };
  }
}

export async function getComments(postId: number) {
  try {
    const { data, error } = await supabase
      .from('post_comments')
      .select(`
        id,
        content,
        created_at,
        profiles (
          id,
          full_name,
          avatar_url
        ),
        user_id
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return {
      data: data?.map((comment: DatabaseComment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: new Date(comment.created_at),
        author: {
          name: comment.profiles[0]?.full_name || '匿名ユーザー',
          avatar: comment.profiles[0]?.avatar_url,
        },
      })) as Comment[],
      error: null,
    };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return { data: null, error };
  }
}

export async function createComment(postId: string, content: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です');

    // プロフィールの存在確認
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('プロフィールが見つかりません');

    const { data: comment, error: commentError } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        content,
      })
      .select()
      .single();

    if (commentError) throw commentError;

    const { data: post, error: getPostError } = await supabase
      .from('forum_posts')
      .select('comments')
      .eq('id', postId)
      .single();

    if (getPostError) throw getPostError;

    const { error: updateError } = await supabase
      .from('forum_posts')
      .update({ comments: (post?.comments || 0) + 1 })
      .eq('id', postId);

    if (updateError) throw updateError;

    return { data: comment, error: null };
  } catch (error) {
    console.error('Error creating comment:', error);
    return { error };
  }
}