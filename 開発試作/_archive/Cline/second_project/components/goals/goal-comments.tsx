import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import supabase from "@/lib/supabase";
import type { GoalComment } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface GoalCommentsProps {
  goalId: number;
  initialComments: GoalComment[];
  isHelpNeeded?: boolean;
  helpRequestContent?: string;
}

export function GoalComments({ 
  goalId, 
  initialComments, 
  isHelpNeeded,
  helpRequestContent 
}: GoalCommentsProps) {
  const [comments, setComments] = useState<GoalComment[]>(initialComments);
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentType, setCommentType] = useState<'achievement' | 'advice'>('achievement');
  const [filter, setFilter] = useState<'all' | 'advice' | 'achievement'>('all');
  const { toast } = useToast();
  const { user } = useAuth();

  const filteredComments = comments.filter(comment => 
    filter === 'all' ? true : comment.type === filter
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { data: newComment, error } = await supabase
        .from("goal_comments")
        .insert({
          goal_id: goalId,
          user_id: user.id,
          content: content.trim(),
          type: commentType
        })
        .select("*, profiles(username, avatar_url)")
        .single();

      if (error) throw error;

      setComments(prev => [newComment, ...prev]);
      setContent("");
      toast({
        title: "コメントを投稿しました",
        description: commentType === 'advice' ? "アドバイスを送信しました" : "応援メッセージを送信しました",
      });
    } catch (error) {
      console.error("コメント投稿エラー:", error);
      toast({
        title: "エラー",
        description: "コメントの投稿に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {isHelpNeeded && (
        <div className="space-y-3">
          <div className="p-3 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 rounded-md text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">👋 アドバイス募集中</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100/50">質問内容</span>
            </div>
            {helpRequestContent && (
              <p className="mt-2 text-sm whitespace-pre-wrap">{helpRequestContent}</p>
            )}
            <p className="text-xs mt-2">目標達成に向けてアドバイスをお願いします！</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Select
            value={commentType}
            onValueChange={(value: 'achievement' | 'advice') => setCommentType(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="achievement">応援</SelectItem>
              <SelectItem value="advice">アドバイス</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={commentType === 'advice' ? "アドバイスを入力..." : "応援メッセージを入力..."}
            className="flex-1"
          />
          <Button type="submit" disabled={isSubmitting || !content.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            送信
          </Button>
        </div>
      </form>

      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">コメント一覧</div>
        <Select
          value={filter}
          onValueChange={(value: 'all' | 'advice' | 'achievement') => setFilter(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="advice">アドバイスのみ</SelectItem>
            <SelectItem value="achievement">応援のみ</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredComments.map((comment) => (
          <div 
            key={comment.id} 
            className={cn(
              "flex gap-3 p-3 rounded-lg",
              comment.type === 'advice' 
                ? "bg-yellow-50/50 dark:bg-yellow-900/10" 
                : "bg-muted/50"
            )}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.profiles?.avatar_url || ''} />
              <AvatarFallback>
                {comment.profiles?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">
                  {comment.profiles?.username || '匿名ユーザー'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleString('ja-JP')}
                </span>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  comment.type === 'advice' 
                    ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                    : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                )}>
                  {comment.type === 'advice' ? 'アドバイス' : '応援'}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
        {filteredComments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {filter === 'all' 
              ? 'まだコメントはありません' 
              : filter === 'advice' 
                ? 'アドバイスコメントはありません'
                : '応援コメントはありません'
            }
          </div>
        )}
      </div>
    </div>
  );
} 