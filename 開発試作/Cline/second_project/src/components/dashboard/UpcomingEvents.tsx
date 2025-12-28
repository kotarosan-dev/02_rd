import React from 'react';
import { Calendar } from 'lucide-react';
import { useEvents } from '../../hooks/useEvents';
import { Link } from 'react-router-dom';

export function UpcomingEvents() {
  const { events } = useEvents();
  const upcomingEvents = events
    .filter(event => event.status === '開催予定')
    .slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[#2c3e50]">近日開催のイベント</h3>
        <Link
          to="/dashboard/events"
          className="text-sm text-[#3498db] hover:text-[#2980b9]"
        >
          すべて表示
        </Link>
      </div>
      <div className="space-y-4">
        {upcomingEvents.map(event => (
          <div
            key={event.id}
            className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Calendar className="h-5 w-5 text-[#3498db] mt-1" />
            <div>
              <h4 className="font-medium text-[#2c3e50]">{event.title}</h4>
              <p className="text-sm text-gray-500">{event.date}</p>
              <p className="text-sm text-gray-500">{event.location}</p>
            </div>
          </div>
        ))}
        {upcomingEvents.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            予定されているイベントはありません
          </p>
        )}
      </div>
    </div>
  );
}