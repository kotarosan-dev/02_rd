// No changes needed in this file as it doesn't contain getBrowserClient imports
// or supabase client usage

"use client";

import { useState, useCallback, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';
import { sendMessage } from '@/lib/chat';
import { useToast } from '@/components/ui/use-toast';

interface ChatInputProps {
  channelId: string;
}

export function ChatInput({ channelId }: ChatInputProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await sendMessage(channelId, message.trim());
      setMessage('');
    } catch (error) {
      console.error('メッセージの送信に失敗:', error);
      toast({
        title: 'エラー',
        description: 'メッセージの送信に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [message, isSubmitting, channelId, toast]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="icon"
          className="shrink-0 hidden sm:flex"
          disabled={isSubmitting}
        >
          <Send className="h-5 w-5" />
        </Button>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="min-h-[60px] max-h-[120px] resize-none"
          disabled={isSubmitting}
        />
        <Button
          variant="default"
          size="icon"
          className="shrink-0"
          onClick={handleSubmit}
          disabled={!message.trim() || isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground text-center sm:text-left">
        Enterキーで送信、Shift + Enterで改行
      </div>
    </div>
  );
} 