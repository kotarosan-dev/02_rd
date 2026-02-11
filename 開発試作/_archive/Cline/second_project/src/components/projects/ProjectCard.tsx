import { useState, useEffect } from 'react';
import type { Project, User } from '../../types';
import { useUsers } from '../../hooks/useUsers';
import supabase from '@/lib/supabase';
import Image from 'next/image';

interface ProjectCardProps {
    project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
    const { currentUser } = useUsers();
    const [creator, setCreator] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchCreator = async () => {
            try {
                const { data: userData, error: userError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', project.creator)
                    .single();

                if (userError) throw userError;

                setCreator({
                    id: userData.id,
                    name: userData.full_name || userData.id,
                    email: userData.email,
                    avatar: userData.avatar_url,
                    role: userData.role || 'user',
                });
            } catch (error) {
                console.error('Error fetching creator:', error);
                setError(error instanceof Error ? error : new Error('作成者の取得中にエラーが発生しました'));
            } finally {
                setLoading(false);
            }
        };

        fetchCreator();
    }, [project.creator]);

    if (loading) {
        return <div>読み込み中...</div>;
    }

    if (error) {
        return <div>エラーが発生しました: {error.message}</div>;
    }

    return (
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
            {project.imageUrl && (
                <div className="relative h-48 w-full">
                    <Image
                        src={project.imageUrl}
                        alt={project.title}
                        fill
                        className="rounded-t-lg object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                </div>
            )}
            <div className="p-6">
                <h3 className="text-xl font-semibold text-[#2c3e50] mb-2">
                    {project.title}
                </h3>
                <p className="text-gray-600 mb-4">
                    {project.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map(tag => (
                        <span
                            key={tag}
                            className="px-2 py-1 text-sm rounded-full bg-[#3498db] text-white"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                        {creator?.avatar ? (
                            <div className="relative w-6 h-6">
                                <Image
                                    src={creator.avatar}
                                    alt={creator.name}
                                    fill
                                    className="rounded-full object-cover"
                                    sizes="48px"
                                />
                            </div>
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-[#3498db] flex items-center justify-center text-white text-xs">
                                {creator?.name.charAt(0)}
                            </div>
                        )}
                        <span>{creator?.name}</span>
                    </div>
                    <span>👍 {project.likes}</span>
                </div>
            </div>
        </div>
    );
}