import { useState, useEffect } from 'react';
import type { Event } from '../types';
import supabase from '@/lib/supabase';

export function useEvents() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    async function fetchEvents() {
        try {
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select(`
                    *,
                    event_participants (
                        user_id
                    )
                `)
                .order('date', { ascending: true });

            if (eventsError) throw eventsError;

            const formattedEvents: Event[] = eventsData.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                date: event.date,
                location: event.location,
                capacity: event.capacity,
                participants: event.event_participants.map((p: any) => p.user_id),
                type: event.type,
                status: event.status,
            }));

            setEvents(formattedEvents);
        } catch (error) {
            console.error('Error fetching events:', error);
            setError(error instanceof Error ? error : new Error('イベント取得中にエラーが発生しました'));
        } finally {
            setLoading(false);
        }
    }

    return {
        events,
        loading,
        error
    };
}