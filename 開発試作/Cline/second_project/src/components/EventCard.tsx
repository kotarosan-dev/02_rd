import React from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import type { Event } from '../types';

interface EventCardProps {
    event: Event;
}

export function EventCard({ event }: EventCardProps) {
    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#2c3e50]">{event.title}</h3>
                    <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${event.status === '開催予定' ? 'bg-[#3498db] text-white' : 
                          event.status === '開催中' ? 'bg-[#2ecc71] text-white' : 
                          'bg-gray-200 text-gray-700'}
                    `}>
                        {event.status}
                    </span>
                </div>
                <p className="text-gray-600 mb-4">{event.description}</p>
                <div className="space-y-2">
                    <div className="flex items-center text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span className="text-sm">{event.date}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                        <MapPin className="h-4 w-4 mr-2" />
                        <span className="text-sm">{event.location}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-sm">{event.participants.length}/{event.capacity} 参加者</span>
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t">
                <button className="w-full bg-[#3498db] text-white py-2 px-4 rounded-md hover:bg-[#2980b9] transition-colors">
                    参加する
                </button>
            </div>
        </div>
    );
}