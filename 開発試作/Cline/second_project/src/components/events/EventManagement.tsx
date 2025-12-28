import React, { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import type { Event } from '../../types';
import { EventTable } from './EventTable';
import { EventModal } from './EventModal';
import { EventCalendar } from './EventCalendar';
import { EventReports } from '../reports/EventReports';
import { useUsers } from '../../hooks/useUsers';
import { useEvents } from '../../hooks/useEvents';
import { useParticipants } from '../../hooks/useParticipants';
import supabase from '@/lib/supabase';

export function EventManagement() {
    const [view, setView] = useState<'table' | 'calendar' | 'reports'>('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { events, loading, error } = useEvents();
    const { currentUser } = useUsers();
    const { joinEvent, leaveEvent, removeParticipant } = useParticipants();

    const handleAddEvent = async (event: Omit<Event, 'id'>) => {
        if (currentUser?.role !== 'admin') return;
        try {
            const { error } = await supabase
                .from('events')
                .insert({
                    title: event.title,
                    description: event.description,
                    date: new Date(event.date).toISOString(),
                    location: event.location,
                    capacity: event.capacity,
                    type: event.type,
                    status: event.status,
                });

            if (error) throw error;
        } catch (error) {
            console.error('Error adding event:', error);
        }
    };

    const handleUpdateEvent = async (id: string, updatedEvent: Partial<Event>) => {
        if (currentUser?.role !== 'admin') return;
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    ...updatedEvent,
                    date: updatedEvent.date ? new Date(updatedEvent.date).toISOString() : undefined,
                })
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating event:', error);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (currentUser?.role !== 'admin') return;
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    if (loading) {
        return <div>読み込み中...</div>;
    }

    if (error) {
        return <div>エラーが発生しました: {error.message}</div>;
    }

    const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = (eventData: Omit<Event, 'id'>) => {
        if (editingEvent) {
            handleUpdateEvent(editingEvent.id, eventData);
        } else {
            handleAddEvent(eventData);
        }
        setIsModalOpen(false);
        setEditingEvent(null);
    };

    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('このイベントを削除してもよろしいですか？')) {
            handleDeleteEvent(id);
        }
    };

    const handleJoinEvent = (eventId: string) => {
        if (currentUser) {
            joinEvent(eventId, currentUser.id);
            handleUpdateEvent(eventId, {
                participants: [...events.find(e => e.id === eventId)!.participants, currentUser.id]
            });
        }
    };

    const handleLeaveEvent = (eventId: string) => {
        if (currentUser) {
            leaveEvent(eventId, currentUser.id);
            handleUpdateEvent(eventId, {
                participants: events.find(e => e.id === eventId)!.participants
                    .filter(id => id !== currentUser.id)
            });
        }
    };

    const handleRemoveParticipant = (eventId: string, userId: string) => {
        removeParticipant(eventId, userId);
        handleUpdateEvent(eventId, {
            participants: events.find(e => e.id === eventId)!.participants
                .filter(id => id !== userId)
        });
    };

    const handleDuplicate = (event: Event) => {
        const newEvent: Omit<Event, 'id'> = {
            ...event,
            title: `${event.title} (コピー)`,
            participants: [],
            status: '開催予定'
        };
        handleAddEvent(newEvent);
    };

    const handleSelectEvent = (id: string, selected: boolean) => {
        if (selected) {
            setSelectedEvents(prev => [...prev, id]);
        } else {
            setSelectedEvents(prev => prev.filter(eventId => eventId !== id));
        }
    };

    const handleBulkDelete = () => {
        if (window.confirm(`選択した${selectedEvents.length}件のイベントを削除してもよろしいですか？`)) {
            selectedEvents.forEach(id => handleDeleteEvent(id));
            setSelectedEvents([]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-4">
                    <h2 className="text-2xl font-bold text-[#2c3e50]">イベント管理</h2>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setView('table')}
                            className={`px-3 py-1 rounded-md text-sm ${
                                view === 'table'
                                    ? 'bg-white text-[#2c3e50] shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            リスト
                        </button>
                        <button
                            onClick={() => setView('calendar')}
                            className={`px-3 py-1 rounded-md text-sm ${
                                view === 'calendar'
                                    ? 'bg-white text-[#2c3e50] shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            カレンダー
                        </button>
                        <button
                            onClick={() => setView('reports')}
                            className={`px-3 py-1 rounded-md text-sm ${
                                view === 'reports'
                                    ? 'bg-white text-[#2c3e50] shadow'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            レポート
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9] transition-colors"
                    title="新しいイベントを作成"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    新規イベント作成
                </button>
            </div>

            {view !== 'reports' && <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        type="text"
                        placeholder="イベントを検索..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                    />
                </div>
                <button 
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    title="イベントの絞り込み条件を設定"
                >
                    <Filter className="h-5 w-5 mr-2" />
                    フィルター
                </button>
            </div>}

            {view === 'table' && <EventTable
                events={filteredEvents}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onJoin={handleJoinEvent}
                onLeave={handleLeaveEvent}
                onRemoveParticipant={handleRemoveParticipant}
                currentUser={currentUser}
                selectedEvents={selectedEvents}
                onSelectEvent={handleSelectEvent}
                onBulkDelete={handleBulkDelete}
            />}

            {view === 'calendar' && (
                <EventCalendar
                    events={filteredEvents}
                    onEventClick={(event) => {
                        setEditingEvent(event);
                        setIsModalOpen(true);
                    }}
                />
            )}

            {view === 'reports' && (
                <EventReports events={events} />
            )}

            <EventModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                }}
                onSubmit={handleSubmit}
                event={editingEvent}
            />
        </div>
    );
}