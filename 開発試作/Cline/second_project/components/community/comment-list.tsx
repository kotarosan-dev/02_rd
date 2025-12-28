"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Comment } from "@/types/community";

interface CommentListProps {
  comments: Comment[];
}

export function CommentList({ comments }: CommentListProps) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{comment.author.name}</span>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(comment.createdAt, { addSuffix: true, locale: ja })}
              </span>
            </div>
            <p className="text-sm mt-1">{comment.content}</p>
          </div>
        </div>
      ))}
    </div>
  );
}