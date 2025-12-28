import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Event } from '../../types';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (eventData: Omit<Event, 'id'>) => void;
    event?: Event | null;
}

export function EventModal({ isOpen, onClose, onSubmit, event }: EventModalProps) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        location: '',
        capacity: 1,
        type: 'ワークショップ' as Event['type'],
        participants: [] as string[],
        status: '開催予定' as Event['status'],
    });

    useEffect(() => {
        if (event) {
            setFormData({
                title: event.title,
                description: event.description,
                date: event.date,
                location: event.location,
                capacity: event.capacity,
                type: event.type,
                participants: event.participants,
                status: event.status,
            });
        } else {
            setFormData({
                title: '',
                description: '',
                date: '',
                location: '',
                capacity: 1,
                type: 'ワークショップ' as Event['type'],
                participants: [],
                status: '開催予定' as Event['status'],
            });
        }
    }, [event]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-2xl mx-4">
                <div className="flex justify-between items-center p-6 border-b">
                    <h3 className="text-xl font-semibold text-[#2c3e50]">
                        {event ? 'イベントを編集' : '新規イベント作成'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            イベント名
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            説明
                        </label>
                        <textarea
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                日時
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                定員
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.capacity}
                                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            場所
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            イベントタイプ
                        </label>
                        <select
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as Event['type'] })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3498db] focus:border-transparent"
                        >
                            <option value="ワークショップ">ワークショップ</option>
                            <option value="セミナー">セミナー</option>
                            <option value="交流会">交流会</option>
                        </select>
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
                            {event ? '更新' : '作成'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}