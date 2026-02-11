"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";

interface ExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  points: number;
  onConfirm: () => void;
  isExchanging: boolean;
}

export function ExchangeDialog({
  open,
  onOpenChange,
  title,
  points,
  onConfirm,
  isExchanging,
}: ExchangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>特典と交換</DialogTitle>
          <DialogDescription>
            以下の特典とポイントを交換します。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="h-4 w-4" />
            <span className="font-bold">{points.toLocaleString()} pt</span>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExchanging}
          >
            キャンセル
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isExchanging}
          >
            {isExchanging ? "交換中..." : "交換する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}