import React from 'react';
import Image from 'next/image';
import { Event } from '@/src/types/event';
import { formatDate } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onJoin?: (eventId: string) => void;
}

export function EventCard({ event, onJoin }: EventCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-48">
        <Image
          src={event.image || '/images/event-placeholder.jpg'}
          alt={event.title}
          fill
          className="object-cover"
        />
        <div className="absolute top-4 right-4 z-10">
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${event.status === '開催予定' ? 'bg-[#3498db] text-white' : 
              event.status === '開催中' ? 'bg-[#2ecc71] text-white' : 
              'bg-gray-200 text-gray-700'}
          `}>
            {event.status}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{event.title}</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            <span>{event.participants.length} / {event.capacity} 参加者</span>
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-700 line-clamp-2">
          {event.description}
        </p>
        {onJoin && (
          <div className="mt-4">
            <Button
              onClick={() => onJoin(event.id)}
              className="w-full"
              disabled={event.participants.length >= event.capacity}
            >
              {event.participants.length >= event.capacity ? '満員' : '参加する'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}