"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Award } from "lucide-react";

interface PopularRewardsProps {
  rewards: {
    id: number;
    title: string;
    category: string;
    points: number;
    exchangeCount: number;
  }[];
}

export function PopularRewards({ rewards }: PopularRewardsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>人気の特典</CardTitle>
        <CardDescription>最も交換された特典のランキング</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {rewards.map((reward, index) => (
              <div
                key={reward.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      index === 0
                        ? "bg-yellow-500"
                        : index === 1
                        ? "bg-gray-400"
                        : index === 2
                        ? "bg-amber-600"
                        : "bg-gray-200"
                    }`}
                  >
                    <Award className={`h-5 w-5 ${
                      index < 3 ? "text-white" : "text-gray-500"
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium">{reward.title}</div>
                    <div className="text-sm text-gray-500">
                      {reward.category} • {reward.points}ポイント
                    </div>
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {reward.exchangeCount}回
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}