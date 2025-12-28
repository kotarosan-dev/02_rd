"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Award, Star, Share2 } from "lucide-react";
import confetti from "canvas-confetti";
import { useToast } from "@/hooks/use-toast";

interface AchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalTitle: string;
  points: number;
}

export function AchievementDialog({
  open,
  onOpenChange,
  goalTitle,
  points,
}: AchievementDialogProps) {
  const handleShare = () => {
    const text = `目標「${goalTitle}」を達成しました！ #BeautyConnection`;
    if (navigator.share) {
      navigator.share({
        text,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(`${text}\n${window.location.href}`);
    }
  };

  // コンフェッティ効果
  const showConfetti = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl flex justify-center items-center gap-2">
            <Award className="h-8 w-8 text-yellow-500" />
            目標達成おめでとう！
          </DialogTitle>
        </DialogHeader>
        <div className="py-8 space-y-6">
          <h3 className="text-xl font-semibold">{goalTitle}</h3>
          <div className="flex items-center justify-center gap-2 text-2xl font-bold text-yellow-500">
            <Star className="h-6 w-6" />
            {points} ポイント獲得！
          </div>
          <p className="text-muted-foreground">
            素晴らしい達成です！この調子で次の目標も頑張りましょう。
          </p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            シェアする
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              showConfetti();
              onOpenChange(false);
            }}
          >
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}