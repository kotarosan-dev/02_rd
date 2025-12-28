"use client";

import { useSearchParams } from 'next/navigation';
import { ChatLayout } from '@/components/admin/chat/chat-layout';
import { LineBroadcast } from '@/components/admin/chat/line-broadcast';
import { useEffect, useState } from 'react';

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) return;
    const channelId = searchParams.get('channel');
    if (channelId) {
      setSelectedChannelId(channelId);
    }
  }, [searchParams]);

  return (
    <div className="space-y-8">
      <ChatLayout selectedChannelId={selectedChannelId || undefined} />
      <LineBroadcast />
    </div>
  );
} 