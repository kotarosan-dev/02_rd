"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";

interface BeforeAfterCardProps {
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  duration: string;
  category: string;
  likes: number;
  comments: number;
  onLike: () => void;
  onComment: () => void;
}

export function BeforeAfterCard({
  title,
  description,
  beforeImage,
  afterImage,
  duration,
  category,
  likes,
  comments,
  onLike,
  onComment,
}: BeforeAfterCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] grid grid-cols-2">
        <div className="relative">
          <Image
            src={beforeImage}
            alt="Before"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <Badge className="absolute top-2 left-2">Before</Badge>
        </div>
        <div className="relative">
          <Image
            src={afterImage}
            alt="After"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          <Badge className="absolute top-2 right-2 bg-gradient-to-r from-pink-600 to-purple-600">
            After
          </Badge>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">{title}</h3>
            <Badge variant="outline">{category}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            施術期間: {duration}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={onLike} className="space-x-1">
              <Heart className="h-4 w-4" />
              <span>{likes}</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onComment} className="space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{comments}</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}