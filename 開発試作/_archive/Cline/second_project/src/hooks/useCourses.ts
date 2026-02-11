import { useState, useEffect } from 'react';
import type { Course } from '../types';
import supabase from '@/lib/supabase';

export function useCourses() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    async function fetchCourses() {
        try {
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select(`
                    *,
                    course_enrollments (
                        user_id
                    )
                `)
                .order('created_at', { ascending: false });

            if (coursesError) throw coursesError;

            const formattedCourses: Course[] = coursesData.map(course => ({
                id: course.id,
                title: course.title,
                description: course.description,
                thumbnail: course.thumbnail,
                category: course.category,
                level: course.level,
                duration: course.duration,
                enrolledCount: course.course_enrollments.length,
                lessonCount: course.lesson_count,
            }));

            setCourses(formattedCourses);
        } catch (error) {
            console.error('Error fetching courses:', error);
            setError(error instanceof Error ? error : new Error('コース取得中にエラーが発生しました'));
        } finally {
            setLoading(false);
        }
    }

    return {
        courses,
        loading,
        error
    };
}