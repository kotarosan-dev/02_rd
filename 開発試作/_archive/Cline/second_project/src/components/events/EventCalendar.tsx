import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Event } from '../../types';

interface EventCalendarProps {
    events: Event[];
    onEventClick: (event: Event) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
    const [currentDate, setCurrentDate] = React.useState(new Date());

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    const weeks = Math.ceil((daysInMonth + firstDayOfMonth) / 7);
    const days = Array.from({ length: weeks * 7 }, (_, i) => {
        const dayNumber = i - firstDayOfMonth + 1;
        if (dayNumber < 1 || dayNumber > daysInMonth) return null;
        return dayNumber;
    });

    const getEventsForDay = (day: number) => {
        return events.filter(event => {
            const eventDate = new Date(event.date);
            return (
                eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear()
            );
        });
    };

    const monthNames = [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月'
    ];

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-[#2c3e50]">
                    {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                </h2>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-gray-100 rounded-full"
                        title="前月"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 text-sm bg-[#3498db] text-white rounded-md hover:bg-[#2980b9]"
                    >
                        今月
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-gray-100 rounded-full"
                        title="翌月"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-gray-200">
                {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
                        {day}
                    </div>
                ))}
                {days.map((day, index) => (
                    <div
                        key={index}
                        className={`bg-white p-2 min-h-[100px] ${
                            day ? 'hover:bg-gray-50' : ''
                        }`}
                    >
                        {day && (
                            <>
                                <div className="text-sm text-gray-500 mb-1">{day}</div>
                                <div className="space-y-1">
                                    {getEventsForDay(day).map(event => (
                                        <button
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            className={`w-full text-left text-xs p-1 rounded truncate
                                                ${event.status === '開催予定' ? 'bg-blue-100 text-blue-800' :
                                                  event.status === '開催中' ? 'bg-green-100 text-green-800' :
                                                  'bg-gray-100 text-gray-800'}`}
                                            title={event.title}
                                        >
                                            {event.title}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}