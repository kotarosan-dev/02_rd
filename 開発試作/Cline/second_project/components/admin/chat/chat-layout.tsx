"use client";

import { useState } from 'react';
import { ChatSidebar } from './chat-sidebar';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { AISuggestions } from './ai-suggestions';
import { Button } from '@/components/ui/button';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatLayoutProps {
  selectedChannelId?: string;
}

export function ChatLayout({ selectedChannelId }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(!selectedChannelId);

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleBackToChannels = () => {
    setSidebarOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* モバイル用チャンネル一覧 */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-background md:relative md:z-0 md:w-64 transition-transform duration-200",
          !sidebarOpen && "translate-x-[-100%] md:translate-x-0"
        )}
      >
        <ChatSidebar 
          selectedChannelId={selectedChannelId} 
          onChannelSelect={handleCloseSidebar}
        />
      </div>

      {/* メインコンテンツ */}
      <div className={cn(
        "fixed inset-0 z-40 flex flex-col w-full bg-background md:relative md:z-0 transition-transform duration-200",
        sidebarOpen && "translate-x-[100%] md:translate-x-0"
      )}>
        {selectedChannelId ? (
          <>
            {/* モバイル用ヘッダー */}
            <div className="flex items-center p-4 border-b md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToChannels}
                className="mr-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="font-medium">チャット</div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0 w-full">
                <ChatMessages channelId={selectedChannelId} />
                <ChatInput channelId={selectedChannelId} />
              </div>
              <div className="hidden w-64 border-l lg:block overflow-y-auto">
                <AISuggestions channelId={selectedChannelId} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center text-lg">
            チャンネルを選択してください
          </div>
        )}
      </div>
    </div>
  );
} 