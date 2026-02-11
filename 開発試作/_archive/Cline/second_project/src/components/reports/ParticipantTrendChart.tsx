import React from 'react';
import type { Event } from '../../types';

interface ParticipantTrendChartProps {
    events: Event[];
}

export function ParticipantTrendChart({ events }: ParticipantTrendChartProps) {
    const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const maxParticipants = Math.max(...events.map(e => e.participants.length));
    const height = 200;

    const points = sortedEvents.map((event, index) => {
        const x = (index / (sortedEvents.length - 1)) * 100;
        const y = ((maxParticipants - event.participants.length) / maxParticipants) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative h-[200px]">
            <svg className="w-full h-full">
                <polyline
                    points={points}
                    fill="none"
                    stroke="#3498db"
                    strokeWidth="2"
                    className="transition-all duration-500"
                />
                {sortedEvents.map((event, index) => {
                    const x = (index / (sortedEvents.length - 1)) * 100;
                    const y = ((maxParticipants - event.participants.length) / maxParticipants) * height;

                    return (
                        <g key={event.id} className="group">
                            <circle
                                cx={`${x}%`}
                                cy={y}
                                r="4"
                                className="fill-[#3498db]"
                            />
                            <g className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <rect
                                    x={`${x}%`}
                                    y={y - 30}
                                    width="80"
                                    height="20"
                                    transform="translate(-40, 0)"
                                    rx="4"
                                    className="fill-gray-800"
                                />
                                <text
                                    x={`${x}%`}
                                    y={y - 16}
                                    textAnchor="middle"
                                    className="text-xs fill-white"
                                >
                                    {event.participants.length}人
                                </text>
                            </g>
                        </g>
                    );
                })}
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
                {sortedEvents.map(event => (
                    <div
                        key={event.id}
                        className="transform -rotate-45 origin-top-left whitespace-nowrap"
                    >
                        {new Date(event.date).toLocaleDateString()}
                    </div>
                ))}
            </div>
        </div>
    );
}