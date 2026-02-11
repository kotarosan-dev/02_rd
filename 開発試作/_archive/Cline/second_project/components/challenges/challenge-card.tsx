"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Award, Users, Calendar } from "lucide-react";

interface ChallengeCardProps {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  participants: number;
  progress: number;
  category: string;
  isJoined: boolean;
  onJoin: () => void;
}

export function ChallengeCard({
  title,
  description,
  startDate,
  endDate,
  participants,
  progress,
  category,
  isJoined,
  onJoin,
}: ChallengeCardProps) {
  const isActive = new Date() >= startDate && new Date() <= endDate;
  const daysLeft = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Badge variant={isActive ? "default" : "secondary"}>
          {category}
        </Badge>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>達成度</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{isActive ? `残り${daysLeft}日` : "終了"}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{participants}人が参加中</span>
        </div>
      </div>

      <Button
        className="w-full"
        variant={isJoined ? "secondary" : "default"}
        onClick={onJoin}
        disabled={!isActive}
      >
        <Award className="h-4 w-4 mr-2" />
        {isJoined ? "参加中" : "チャレンジに参加"}
      </Button>
    </Card>
  );
}