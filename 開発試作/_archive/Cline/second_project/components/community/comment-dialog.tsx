"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CommentForm } from "./comment-form";
import { CommentList } from "./comment-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useCallback } from "react";
import { getComments } from "@/lib/community";
import { useToast } from "@/hooks/use-toast";
import type { Comment } from "@/types/community";

interface CommentDialogProps {
  postId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentDialog({ postId, open, onOpenChange }: CommentDialogProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadComments = useCallback(async () => {
    try {
      const { data, error } = await getComments(postId);
      if (error) {
        console.error('Error loading comments:', error);
        throw error;
      }
      setComments(data || []);
    } catch (error) {
      toast({
        title: "エラー",
        description: "コメントの読み込みに失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [postId, toast]);

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, loadComments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>コメント</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <ScrollArea className="h-[300px] pr-4">
            {loading ? (
              <div className="text-center py-4">読み込み中...</div>
            ) : comments.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                コメントはありません
              </div>
            ) : (
              <CommentList comments={comments} />
            )}
          </ScrollArea>
          <CommentForm postId={postId.toString()} onCommentCreated={loadComments} />
        </div>
      </DialogContent>
    </Dialog>
  );
}