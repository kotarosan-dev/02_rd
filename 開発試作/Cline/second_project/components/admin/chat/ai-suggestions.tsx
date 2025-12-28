"use client";

import { useEffect, useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import type { AISuggestion } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import supabase from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';
import { useSuggestion as applySuggestion } from '@/lib/chat';

interface AISuggestionsProps {
  channelId: string;
}

export function AISuggestions({ channelId }: AISuggestionsProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingSuggestion, setUsingSuggestion] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions(data.map(suggestion => ({
        id: suggestion.id,
        channelId: suggestion.channel_id,
        suggestionType: suggestion.suggestion_type,
        content: suggestion.content,
        createdAt: new Date(suggestion.created_at),
        usedAt: suggestion.used_at ? new Date(suggestion.used_at) : null,
        metadata: suggestion.metadata,
      })));
    } catch (err) {
      console.error('AI提案の取得に失敗:', err);
      setError('AI提案の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    const channel = supabase
      .channel(`ai_suggestions_${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_suggestions',
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const newSuggestion = payload.new;
          setSuggestions(prev => [{
            id: newSuggestion.id,
            channelId: newSuggestion.channel_id,
            suggestionType: newSuggestion.suggestion_type,
            content: newSuggestion.content,
            createdAt: new Date(newSuggestion.created_at),
            usedAt: newSuggestion.used_at ? new Date(newSuggestion.used_at) : null,
            metadata: newSuggestion.metadata,
          }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const handleUseSuggestion = useCallback(async (suggestion: AISuggestion) => {
    if (usingSuggestion) return;

    setUsingSuggestion(suggestion.id);
    try {
      await applySuggestion(channelId, suggestion.id, suggestion.content);
      setSuggestions(prev =>
        prev.map(s =>
          s.id === suggestion.id
            ? { ...s, usedAt: new Date() }
            : s
        )
      );
      toast({
        description: '提案を送信しました',
      });
    } catch (error) {
      console.error('提案の使用に失敗:', error);
      toast({
        title: 'エラー',
        description: '提案の使用に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setUsingSuggestion(null);
    }
  }, [channelId, usingSuggestion, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        <AlertCircle className="h-6 w-6 mr-2" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b">
        <h3 className="font-semibold">AI提案</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {suggestions.length === 0 ? (
            <div className="text-center text-muted-foreground">
              AI提案はありません
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="rounded-lg border bg-card p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(suggestion.createdAt, {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                  {suggestion.usedAt && (
                    <span className="text-xs text-green-500">使用済み</span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap mb-3">
                  {suggestion.content}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={!!suggestion.usedAt || usingSuggestion === suggestion.id}
                  onClick={() => handleUseSuggestion(suggestion)}
                >
                  {usingSuggestion === suggestion.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {suggestion.usedAt ? '使用済み' : 'この提案を使用'}
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 