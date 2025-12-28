"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserAnalysisProps {
  userId: string;
  userName: string;
}

interface Channel {
  id: string;
  lastMessage: string;
  userName: string;
  userEmail: string;
  type: string;
  lastMessageAt: string | null;
}

export function UserAnalysis({ userId, userName }: UserAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [channels, setChannels] = useState<Channel[]>([]);

  // チャンネル一覧を取得
  const fetchChannels = useCallback(async () => {
    try {
      const response = await fetch('/api/chat/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('チャンネルの取得に失敗しました');
      }

      const data = await response.json();
      setChannels(data.channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }, [userId]);

  const analyzeUser = useCallback(async (type: 'behavior' | 'sentiment' | 'content', purpose?: string) => {
    if (type === 'sentiment' && !selectedChannel) {
      setAnalysisResult('チャンネルを選択してください');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/analysis/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type,
          channelId: selectedChannel,
          purpose,
        }),
      });

      if (!response.ok) {
        throw new Error('分析に失敗しました');
      }

      const data = await response.json();
      setAnalysisResult(data.result);
    } catch (error) {
      console.error('Error analyzing user:', error);
      setAnalysisResult('分析中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedChannel]);

  // コンポーネントマウント時にチャンネル一覧を取得
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">{userName}さんの分析</h2>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => analyzeUser('behavior')}
            disabled={loading}
            variant="outline"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            行動パターンを分析
          </Button>

          <div className="flex items-center gap-2">
            <Select
              value={selectedChannel}
              onValueChange={setSelectedChannel}
              disabled={loading}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="チャンネルを選択" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.id} value={channel.id}>
                    {channel.lastMessage
                      ? `${channel.lastMessage.slice(0, 30)}${channel.lastMessage.length > 30 ? '...' : ''}`
                      : '新規チャット'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => analyzeUser('sentiment')}
              disabled={loading || !selectedChannel}
              variant="outline"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              感情分析を実行
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => analyzeUser('content', 'follow_up')}
            disabled={loading}
          >
            フォローアップ文章を生成
          </Button>
          <Button
            onClick={() => analyzeUser('content', 'recommendation')}
            disabled={loading}
          >
            サービス提案を生成
          </Button>
          <Button
            onClick={() => analyzeUser('content', 'reminder')}
            disabled={loading}
          >
            リマインダーを生成
          </Button>
        </div>
      </div>

      {analysisResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">分析結果</h3>
          <div className="whitespace-pre-wrap">{analysisResult}</div>
        </div>
      )}
    </Card>
  );
} 