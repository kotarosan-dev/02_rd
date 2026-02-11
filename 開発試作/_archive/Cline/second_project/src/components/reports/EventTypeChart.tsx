import React from 'react';
import type { Event } from '../../types';

interface EventTypeChartProps {
    events: Event[];
}

export function EventTypeChart({ events }: EventTypeChartProps) {
    const typeData = events.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + event.participants.length;
        return acc;
    }, {} as Record<string, number>);

    const total = Object.values(typeData).reduce((sum, count) => sum + count, 0);
    const maxValue = Math.max(...Object.values(typeData));

    const typeLabels = {
        workshop: 'ワークショップ',
        seminar: 'セミナー',
        meetup: 'ミートアップ',
    };

    const typeColors = {
        workshop: '#3498db',
        seminar: '#2ecc71',
        meetup: '#e74c3c',
    };

    return (
        <div className="space-y-4">
            {Object.entries(typeData).map(([type, count]) => (
                <div key={type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                            {typeLabels[type as keyof typeof typeLabels]}
                        </span>
                        <span className="text-gray-900 font-medium">
                            {count}人 ({((count / total) * 100).toFixed(1)}%)
                        </span>
                    </div>
                    <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                            style={{
                                width: `${(count / maxValue) * 100}%`,
                                backgroundColor: typeColors[type as keyof typeof typeColors],
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}