import React from 'react';
import { UserX } from 'lucide-react';
import type { User } from '../../types';
import Image from 'next/image';

interface ParticipantListProps {
    participants: User[];
    capacity: number;
    onRemoveParticipant?: (userId: string) => void;
    isAdmin?: boolean;
}

export function ParticipantList({
    participants,
    capacity,
    onRemoveParticipant,
    isAdmin = false,
}: ParticipantListProps) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-[#2c3e50]">
                    参加者一覧 ({participants.length}/{capacity})
                </h3>
                <span className={`px-2 py-1 rounded-full text-sm ${
                    participants.length >= capacity
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                }`}>
                    {participants.length >= capacity ? '定員満席' : '参加可能'}
                </span>
            </div>
            <div className="bg-white rounded-lg shadow divide-y">
                {participants.map((participant) => (
                    <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 hover:bg-gray-50"
                    >
                        <div className="flex items-center space-x-3">
                            {participant.avatar ? (
                                <div className="relative w-10 h-10">
                                    <Image
                                        src={participant.avatar}
                                        alt={participant.name}
                                        fill
                                        className="rounded-full object-cover"
                                    />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-[#3498db] flex items-center justify-center text-white">
                                    {participant.name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-[#2c3e50]">{participant.name}</p>
                                <p className="text-sm text-gray-500">{participant.email}</p>
                            </div>
                        </div>
                        {isAdmin && onRemoveParticipant && (
                            <button
                                onClick={() => onRemoveParticipant(participant.id)}
                                className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50"
                                title="参加をキャンセル"
                            >
                                <UserX className="h-5 w-5" />
                            </button>
                        )}
                    </div>
                ))}
                {participants.length === 0 && (
                    <div className="p-4 text-center text-gray-500">
                        まだ参加者がいません
                    </div>
                )}
            </div>
        </div>
    );
}