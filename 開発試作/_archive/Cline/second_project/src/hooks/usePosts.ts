import { useState, useEffect } from 'react';
import type { Post } from '../types';
import supabase from '@/lib/supabase';

export function usePosts() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    async function fetchPosts() {
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('posts')
                .select(`
                    *,
                    profiles (
                        full_name,
                        avatar_url
                    ),
                    post_likes (
                        user_id
                    ),
                    post_replies (
                        id,
                        content,
                        created_at,
                        user_id,
                        profiles (
                            full_name,
                            avatar_url
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            const formattedPosts: Post[] = postsData.map(post => ({
                id: post.id,
                title: post.title,
                content: post.content,
                author: post.profiles?.full_name || '不明なユーザー',
                createdAt: post.created_at,
                category: post.category,
                tags: post.tags || [],
                likes: post.post_likes?.length || 0,
                replies: (post.post_replies || []).map((reply: any) => ({
                    id: reply.id,
                    content: reply.content,
                    author: reply.profiles?.full_name || '不明なユーザー',
                    createdAt: reply.created_at,
                    likes: 0
                }))
            }));

            setPosts(formattedPosts);
        } catch (error) {
            console.error('Error fetching posts:', error);
            setError(error instanceof Error ? error : new Error('投稿の取得中にエラーが発生しました'));
        } finally {
            setLoading(false);
        }
    }

    return {
        posts,
        loading,
        error
    };
}