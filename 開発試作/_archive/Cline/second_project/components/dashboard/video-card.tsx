"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Clock } from "lucide-react";
import Image from "next/image";

interface VideoCardProps {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  category: string;
  views: number;
  onPlay: () => void;
}

export function VideoCard({
  title,
  description,
  thumbnail,
  duration,
  category,
  views,
  onPlay,
}: VideoCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={onPlay}
          >
            <Play className="h-6 w-6" />
          </Button>
        </div>
        <Badge className="absolute bottom-2 right-2 bg-black/60">
          {duration}
        </Badge>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold line-clamp-1">{title}</h3>
          <Badge variant="outline">{category}</Badge>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-4 w-4 mr-1" />
          <span>{views.toLocaleString()}回視聴</span>
        </div>
      </div>
    </Card>
  );
}