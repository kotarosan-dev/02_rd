import React from 'react';
import type { Event } from '../../types';

interface ParticipationChartProps {
    events: Event[];
}

export function ParticipationChart({ events }: ParticipationChartProps) {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const maxHeight = 200;

    return (
        <div className="relative h-[200px]">
            <div className="absolute inset-0 flex items-end">
                {sortedEvents.map((event, index) => {
                    const participationRate = (event.participants.length / event.capacity) * 100;
                    const height = (participationRate / 100) * maxHeight;

                    return (
                        <div
                            key={event.id}
                            className="flex-1 flex flex-col items-center group"
                        >
                            <div className="relative w-full">
                                <div
                                    className="w-4/5 mx-auto bg-[#3498db] rounded-t"
                                    style={{ height: `${height}px` }}
                                />
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {participationRate.toFixed(1)}%
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                                {new Date(event.date).toLocaleDateString()}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}