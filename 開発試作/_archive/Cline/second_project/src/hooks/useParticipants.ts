import { useState } from 'react';
import type { Event } from '../types';

export function useParticipants() {
    const [participantsByEvent, setParticipantsByEvent] = useState<Record<string, string[]>>({});

    const joinEvent = (eventId: string, userId: string) => {
        setParticipantsByEvent(prev => ({
            ...prev,
            [eventId]: [...(prev[eventId] || []), userId]
        }));
    };

    const leaveEvent = (eventId: string, userId: string) => {
        setParticipantsByEvent(prev => ({
            ...prev,
            [eventId]: (prev[eventId] || []).filter(id => id !== userId)
        }));
    };

    const removeParticipant = (eventId: string, userId: string) => {
        leaveEvent(eventId, userId);
    };

    const getEventParticipants = (eventId: string) => {
        return participantsByEvent[eventId] || [];
    };

    const isParticipant = (eventId: string, userId: string) => {
        return (participantsByEvent[eventId] || []).includes(userId);
    };

    return {
        joinEvent,
        leaveEvent,
        removeParticipant,
        getEventParticipants,
        isParticipant,
    };
}