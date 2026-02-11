import { useState, useEffect } from 'react';
import type { Event, User } from '../../types';
import { useUsers } from '../../hooks/useUsers';
import supabase from '@/lib/supabase';
import Image from 'next/image';

interface EventDetailsProps {
    event: Event;
    onJoin: (eventId: string) => void;
    onLeave: (eventId: string) => void;
    onRemoveParticipant: (eventId: string, userId: string) => void;
}

export function EventDetails({
    event,
    onJoin,
    onLeave,
    onRemoveParticipant,
}: EventDetailsProps) {
    const { currentUser } = useUsers();
    const [participantUsers, setParticipantUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const isParticipant = currentUser && event.participants.includes(currentUser.id);
    const isFull = event.participants.length >= event.capacity;

    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const { data: usersData, error: usersError } = await supabase
                    .from('profiles')
                    .select('*')
                    .in('id', event.participants);

                if (usersError) throw usersError;

                const formattedUsers: User[] = usersData.map(user => ({
                    id: user.id,
                    name: user.full_name || user.id,
                    email: user.email,
                    avatar: user.avatar_url,
                    role: user.role || 'user',
                }));

                setParticipantUsers(formattedUsers);
            } catch (error) {
                console.error('Error fetching participants:', error);
                setError(error instanceof Error ? error : new Error('参加者の取得中にエラーが発生しました'));
            } finally {
                setLoading(false);
            }
        };

        fetchParticipants();
    }, [event.participants]);

    if (loading) {
        return <div>読み込み中...</div>;
    }

    if (error) {
        return <div>エラーが発生しました: {error.message}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-bold text-[#2c3e50]">{event.title}</h3>
                    <p className="text-gray-600">{event.description}</p>
                </div>
                <span className={`
                    px-3 py-1 rounded-full text-sm
                    ${event.status === '開催予定' ? 'bg-blue-100 text-blue-800' :
                      event.status === '開催中' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'}
                `}>
                    {event.status}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">開催情報</h4>
                    <div className="space-y-2 text-sm">
                        <p>日時: {new Date(event.date).toLocaleString('ja-JP')}</p>
                        <p>場所: {event.location}</p>
                        <p>定員: {event.participants.length} / {event.capacity}名</p>
                        <p>タイプ: {event.type}</p>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2">参加者一覧</h4>
                    <div className="space-y-2">
                        {participantUsers.map(user => (
                            <div key={user.id} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    {user.avatar ? (
                                        <Image
                                            src={user.avatar}
                                            alt={user.name}
                                            width={24}
                                            height={24}
                                            className="rounded-full"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full bg-[#3498db] flex items-center justify-center text-white text-xs">
                                            {user.name.charAt(0)}
                                        </div>
                                    )}
                                    <span className="text-sm">{user.name}</span>
                                </div>
                                {currentUser?.role === 'admin' && (
                                    <button
                                        onClick={() => onRemoveParticipant(event.id, user.id)}
                                        className="text-red-500 hover:text-red-700 text-sm"
                                    >
                                        削除
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {currentUser && (
                <div className="flex justify-end">
                    {isParticipant ? (
                        <button
                            onClick={() => onLeave(event.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                        >
                            参加をキャンセル
                        </button>
                    ) : (
                        <button
                            onClick={() => onJoin(event.id)}
                            disabled={isFull}
                            className={`
                                px-4 py-2 rounded-md transition-colors
                                ${isFull
                                    ? 'bg-gray-300 cursor-not-allowed'
                                    : 'bg-[#3498db] text-white hover:bg-[#2980b9]'}
                            `}
                        >
                            {isFull ? '定員に達しました' : '参加する'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}