"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { CommentDialog } from "./comment-dialog";
import { PostForm } from "./post-form";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface ForumPostProps {
  id: number;
  author: {
    name: string;
    avatar?: string;
  };
  content: string;
  createdAt: Date;
  likes: number;
  comments: number;
  category?: string;
  tags?: string[];
  images?: string[];
  isBookmarked?: boolean;
  isOwnPost?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onBookmark: () => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function ForumPost({
  id,
  author,
  content,
  createdAt,
  likes,
  comments,
  category = "一般",
  tags = [],
  images = [],
  isBookmarked = false,
  isOwnPost = false,
  onLike,
  onComment,
  onShare,
  onBookmark,
  onEdit,
  onDelete,
}: ForumPostProps) {
  const [showComments, setShowComments] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

  const handleImageClick = (image: string) => {
    setSelectedImage(image);
    setShowImageDialog(true);
  };

  return (
    <Card className="p-6 space-y-4 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-lg hover:shadow-xl transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/10">
            <AvatarImage src={author.avatar} />
            <AvatarFallback>{author.name[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{author.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatDistanceToNow(createdAt, { addSuffix: true, locale: ja })}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {category}
          </Badge>
          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete?.(id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {images.map((image, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(image)}
              >
                <Image
                  src={image}
                  alt={`投稿画像 ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        )}
        
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className="space-x-1 hover:text-primary"
          >
            <Heart className={cn("h-4 w-4", likes > 0 && "fill-current text-primary")} />
            <span>{likes}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(true)}
            className="space-x-1"
          >
            <MessageCircle className="h-4 w-4" />
            <span>{comments}</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onBookmark}
          className={cn(
            "hover:text-primary",
            isBookmarked && "text-primary"
          )}
        >
          <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
        </Button>
      </div>

      <CommentDialog
        postId={id}
        open={showComments}
        onOpenChange={setShowComments}
      />

      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像の表示</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video">
            <Image
              src={selectedImage}
              alt="拡大画像"
              fill
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}