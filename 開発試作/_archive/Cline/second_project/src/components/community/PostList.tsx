import { useState } from 'react';
import { Post } from '../../types';
import { useUsers } from '../../hooks/useUsers';
import supabase from '@/lib/supabase';

interface PostListProps {
    posts: Post[];
}

export function PostList({ posts }: PostListProps) {
    const { currentUser } = useUsers();
    const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

    const handleLike = async (postId: string) => {
        if (!currentUser) return;

        try {
            setLoading(prev => ({ ...prev, [postId]: true }));

            const { error } = await supabase
                .from('post_likes')
                .insert({
                    post_id: postId,
                    user_id: currentUser.id,
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error liking post:', error);
        } finally {
            setLoading(prev => ({ ...prev, [postId]: false }));
        }
    };

    return (
        <div className="space-y-4">
            {posts.map(post => (
                <div
                    key={post.id}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-[#2c3e50]">
                                {post.title}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {post.author} • {new Date(post.createdAt).toLocaleDateString('ja-JP')}
                            </p>
                        </div>
                        <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600">
                            {post.category}
                        </span>
                    </div>

                    <p className="text-gray-700 mb-4">{post.content}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-2 py-1 text-sm rounded-full bg-[#3498db] text-white"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <button
                            onClick={() => handleLike(post.id)}
                            disabled={loading[post.id]}
                            className="flex items-center space-x-1 hover:text-[#3498db] transition-colors"
                        >
                            <span>👍</span>
                            <span>{post.likes}</span>
                        </button>
                        <span>{post.replies.length} 件のコメント</span>
                    </div>
                </div>
            ))}
        </div>
    );
}