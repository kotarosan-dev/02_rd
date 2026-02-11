import { useState, useEffect } from 'react';
import type { Project } from '../types';
import supabase from '@/lib/supabase';

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select(`
                    *,
                    project_likes (
                        user_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (projectsError) throw projectsError;

            const formattedProjects: Project[] = projectsData.map(project => ({
                id: project.id,
                title: project.title,
                description: project.description,
                creator: project.creator,
                createdAt: project.created_at,
                tags: project.tags || [],
                imageUrl: project.image_url,
                likes: project.project_likes?.length || 0,
            }));

            setProjects(formattedProjects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setError(error instanceof Error ? error : new Error('プロジェクトの取得中にエラーが発生しました'));
        } finally {
            setLoading(false);
        }
    }

    return {
        projects,
        loading,
        error
    };
}