import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Post } from '../../types';
import { useUsers } from '../../hooks/useUsers';

interface PostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (post: Omit<Post, 'id' | 'likes' | 'replies'>) => void;
}

export function PostModal({ isOpen, onClose, onSubmit }: PostModalProps) {
    const { currentUser } = useUsers();
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'ディスカッション' as Post['category'],
        tags: [] as string[],
        tagInput: '',
    });

    if (!isOpen || !currentUser) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: formData.tags,
            author: currentUser.id,
            createdAt: new Date().toISOString(),
        });
        setFormData({
            title: '',
            content: '',
            category: 'ディスカッション',
            tags: [],
            tagInput: '',
        });
        onClose();
    };

    const handleAddTag = () => {
        if (formData.tagInput && !formData.tags.includes(formData.tagInput)) {
            setFormData(prev => ({
                ...prev,
                tags: [...prev.tags, prev.tagInput],
                tagInput: '',
            }));
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.filter(tag => tag !== tagToRemove),
        }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-xl font-semibold text-[#2c3e50]">
                        新規投稿を作成
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            タイトル
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            内容
                        </label>
                        <textarea
                            rows={5}
                            value={formData.content}
                            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            カテゴリー
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Post['category'] }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        >
                            <option value="ディスカッション">ディスカッション</option>
                            <option value="質問">質問</option>
                            <option value="お知らせ">お知らせ</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            タグ
                        </label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={formData.tagInput}
                                onChange={(e) => setFormData(prev => ({ ...prev, tagInput: e.target.value }))}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddTag();
                                    }
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                                placeholder="タグを入力..."
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9]"
                            >
                                追加
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.tags.map(tag => (
                                <span
                                    key={tag}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm flex items-center"
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveTag(tag)}
                                        className="ml-2 text-gray-400 hover:text-gray-600"
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9]"
                        >
                            投稿
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}