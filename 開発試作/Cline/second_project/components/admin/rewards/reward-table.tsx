"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteReward } from "@/lib/rewards";
import type { Reward } from "@/types/rewards";

interface RewardTableProps {
  rewards: Reward[];
  onEdit: (reward: Reward) => void;
  onRewardUpdated: () => void;
}

export function RewardTable({
  rewards,
  onEdit,
  onRewardUpdated,
}: RewardTableProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!deletingId) return;

    try {
      setIsDeleting(true);
      const { error } = await deleteReward(deletingId);
      
      if (error) throw error;

      toast({
        title: "特典を削除しました",
      });
      
      onRewardUpdated();
    } catch (error) {
      toast({
        title: "エラー",
        description: "特典の削除に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>タイトル</TableHead>
            <TableHead>説明</TableHead>
            <TableHead>ポイント</TableHead>
            <TableHead>カテゴリー</TableHead>
            <TableHead>在庫数</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rewards.map((reward) => (
            <TableRow key={reward.id}>
              <TableCell className="font-medium">{reward.title}</TableCell>
              <TableCell>{reward.description}</TableCell>
              <TableCell>{reward.points.toLocaleString()} pt</TableCell>
              <TableCell>
                <Badge variant="outline">{reward.category}</Badge>
              </TableCell>
              <TableCell>{reward.stock}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(reward)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingId(reward.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>特典を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。特典を削除すると、関連する交換履歴は保持されますが、
              新たな交換はできなくなります。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}