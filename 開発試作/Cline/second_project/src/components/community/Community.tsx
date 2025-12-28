import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { usePosts } from '../../hooks/usePosts';
import { useUsers } from '../../hooks/useUsers';
import supabase from '@/lib/supabase';
import type { Post } from '../../types';
import { PostList } from './PostList';
import { PostModal } from './PostModal';

export function Community() {
    const { posts, loading, error } = usePosts();
    const { currentUser } = useUsers();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const handleAddPost = async (post: Omit<Post, 'id' | 'likes' | 'replies'>) => {
        if (!currentUser) return;

        try {
            // Insert post
            const { data: newPost, error: postError } = await supabase
                .from('posts')
                .insert({
                    title: post.title,
                    content: post.content,
                    author_id: currentUser.id,
                    category: post.category,
                })
                .select()
                .single();

            if (postError) throw postError;

            // Insert tags
            if (post.tags.length > 0) {
                const { error: tagsError } = await supabase
                    .from('post_tags')
                    .insert(
                        post.tags.map((tag: string) => ({
                            post_id: newPost.id,
                            tag,
                        }))
                    );

                if (tagsError) throw tagsError;
            }
        } catch (error) {
            console.error('Error adding post:', error);
        }
    };

    if (loading) {
        return <div>読み込み中...</div>;
    }

    if (error) {
        return <div>エラーが発生しました: {error.message}</div>;
    }

    const filteredPosts = posts.filter(post => {
        const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            post.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !selectedCategory || post.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-[#2c3e50]">コミュニティ</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9] transition-colors"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    投稿を作成
                </button>
            </div>

            <div className="flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="投稿を検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={selectedCategory || ''}
                        onChange={(e) => setSelectedCategory(e.target.value || null)}
                        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                    >
                        <option value="">すべてのカテゴリー</option>
                        <option value="質問">質問</option>
                        <option value="ディスカッション">ディスカッション</option>
                        <option value="お知らせ">お知らせ</option>
                    </select>
                    <button className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                        <Filter className="h-5 w-5 mr-2" />
                        フィルター
                    </button>
                </div>
            </div>

            <PostList posts={filteredPosts} />

            <PostModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleAddPost}
            />
        </div>
    );
}