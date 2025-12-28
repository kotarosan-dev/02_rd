"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createComment } from "@/lib/community";

interface CommentFormProps {
  postId: string;
  onCommentCreated: () => void;
}

export function CommentForm({ postId, onCommentCreated }: CommentFormProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      const { error } = await createComment(postId, content);
      if (error) {
        console.error('Comment creation error:', error);
        throw error;
      }

      toast({
        title: "コメント完了",
        description: "コメントが投稿されました",
      });
      
      setContent("");
      onCommentCreated();
    } catch (error) {
      toast({
        title: "コメントエラー",
        description: "コメントの投稿に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="コメントを入力してください..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !content.trim()}>
          {isSubmitting ? "送信中..." : "コメントする"}
        </Button>
      </div>
    </form>
  );
}