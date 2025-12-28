import React from 'react';
import { Edit2, Trash2, UserPlus, UserMinus, Users, Copy } from 'lucide-react';
import type { Event, User } from '../../types';

interface EventTableProps {
    events: Event[];
    onEdit: (event: Event) => void;
    onDuplicate: (event: Event) => void;
    onDelete: (id: string) => void;
    onJoin: (eventId: string) => void;
    onLeave: (eventId: string) => void;
    onRemoveParticipant: (eventId: string, userId: string) => void;
    currentUser: User | null;
    selectedEvents: string[];
    onSelectEvent: (id: string, selected: boolean) => void;
    onBulkDelete: () => void;
}

export function EventTable({
    events,
    onEdit,
    onDuplicate,
    onDelete,
    onJoin,
    onLeave,
    onRemoveParticipant,
    currentUser,
    selectedEvents,
    onSelectEvent,
    onBulkDelete
}: EventTableProps) {
    if (!currentUser) return null;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            {selectedEvents.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
                    <span className="text-sm text-gray-700">
                        {selectedEvents.length}件のイベントを選択中
                    </span>
                    <button
                        onClick={onBulkDelete}
                        className="text-red-600 hover:text-red-900 text-sm font-medium"
                        title="選択したイベントを一括削除"
                    >
                        一括削除
                    </button>
                </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <input
                                type="checkbox"
                                onChange={(e) => {
                                    events.forEach(event => {
                                        onSelectEvent(event.id, e.target.checked);
                                    });
                                }}
                                checked={selectedEvents.length === events.length && events.length > 0}
                                className="rounded border-gray-300 text-[#3498db] focus:ring-[#3498db]"
                            />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            イベント名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            場所
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            参加者数
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((event) => (
                        <tr key={event.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                                <input
                                    type="checkbox"
                                    checked={selectedEvents.includes(event.id)}
                                    onChange={(e) => onSelectEvent(event.id, e.target.checked)}
                                    className="rounded border-gray-300 text-[#3498db] focus:ring-[#3498db]"
                                />
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                <div className="text-sm text-gray-500">{event.type}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{event.date}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">{event.location}</td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                {event.participants.length}/{event.capacity}
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                                    ${event.status === '開催予定' ? 'bg-blue-100 text-blue-800' : 
                                      event.status === '開催中' ? 'bg-green-100 text-green-800' : 
                                      'bg-gray-100 text-gray-800'}`}>
                                    {event.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                                {currentUser && (
                                    event.participants.includes(currentUser.id) ? (
                                        <button
                                            onClick={() => onLeave(event.id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="参加をキャンセル"
                                        >
                                            <UserMinus className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onJoin(event.id)}
                                            disabled={event.participants.length >= event.capacity}
                                            className={`${
                                                event.participants.length >= event.capacity
                                                    ? 'text-gray-400 cursor-not-allowed'
                                                    : 'text-green-600 hover:text-green-900'
                                            }`}
                                            title={
                                                event.participants.length >= event.capacity
                                                    ? '定員満席'
                                                    : '参加する'
                                            }
                                        >
                                            <UserPlus className="h-4 w-4" />
                                        </button>
                                    )
                                )}
                                {currentUser.role === 'admin' && (
                                    <button
                                        onClick={() => {
                                            const participantId = event.participants[0];
                                            if (participantId) {
                                                onRemoveParticipant(event.id, participantId);
                                            }
                                        }}
                                        className="text-blue-600 hover:text-blue-900"
                                        title="参加者管理"
                                    >
                                        <Users className="h-4 w-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onDuplicate(event)}
                                    className="text-[#3498db] hover:text-[#2980b9]"
                                    title="イベントを複製"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onEdit(event)}
                                    className="text-[#3498db] hover:text-[#2980b9]"
                                    title="イベントを編集"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(event.id)}
                                    className="text-red-600 hover:text-red-900"
                                    title="イベントを削除"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}