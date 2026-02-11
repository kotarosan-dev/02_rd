import React from 'react';
import { BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import type { Event } from '../../types';
import { ParticipationChart } from './ParticipationChart';
import { EventTypeChart } from './EventTypeChart';
import { ParticipantTrendChart } from './ParticipantTrendChart';

interface EventReportsProps {
    events: Event[];
}

export function EventReports({ events }: EventReportsProps) {
    const calculateParticipationRate = () => {
        const totalEvents = events.length;
        if (totalEvents === 0) return 0;
        
        const totalCapacity = events.reduce((sum, event) => sum + event.capacity, 0);
        const totalParticipants = events.reduce((sum, event) => sum + event.participants.length, 0);
        
        return (totalParticipants / totalCapacity) * 100;
    };

    const getPopularEventType = () => {
        const typeCounts = events.reduce((acc, event) => {
            acc[event.type] = (acc[event.type] || 0) + event.participants.length;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    };

    const getAverageParticipants = () => {
        if (events.length === 0) return 0;
        const totalParticipants = events.reduce((sum, event) => sum + event.participants.length, 0);
        return Math.round(totalParticipants / events.length);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="text-[#3498db]">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <span className="text-sm text-[#2ecc71]">全期間</span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-[#2c3e50]">
                        {calculateParticipationRate().toFixed(1)}%
                    </p>
                    <p className="text-gray-500">平均参加率</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="text-[#3498db]">
                            <Calendar className="h-6 w-6" />
                        </div>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-[#2c3e50]">
                        {getPopularEventType()}
                    </p>
                    <p className="text-gray-500">人気のイベントタイプ</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div className="text-[#3498db]">
                            <Users className="h-6 w-6" />
                        </div>
                        <span className="text-sm text-[#2ecc71]">
                            {events.length}件のイベント
                        </span>
                    </div>
                    <p className="mt-4 text-2xl font-semibold text-[#2c3e50]">
                        {getAverageParticipants()}人
                    </p>
                    <p className="text-gray-500">平均参加者数</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-[#2c3e50] mb-4">
                        参加率の推移
                    </h3>
                    <ParticipationChart events={events} />
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-[#2c3e50] mb-4">
                        イベントタイプ別の参加者数
                    </h3>
                    <EventTypeChart events={events} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold text-[#2c3e50] mb-4">
                    参加者数の推移
                </h3>
                <ParticipantTrendChart events={events} />
            </div>
        </div>
    );
}