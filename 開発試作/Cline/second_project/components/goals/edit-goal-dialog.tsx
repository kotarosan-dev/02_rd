import { useState } from "react";
import { Goal } from "@/types/goal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateGoal } from "@/lib/goals";
import { useToast } from "@/hooks/use-toast";

const GENRES = [
  { value: "beauty", label: "美容" },
  { value: "health", label: "健康" },
  { value: "skill", label: "スキル" },
  { value: "hobby", label: "趣味" },
  { value: "other", label: "その他" },
];

const goalSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  description: z.string().min(1, "説明を入力してください"),
  genre: z.string(),
  end_date: z.string(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface EditGoalDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updatedGoal: Goal) => void;
}

export function EditGoalDialog({
  goal,
  open,
  onOpenChange,
  onUpdate,
}: EditGoalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const formatDate = (date: Date | string) => {
    try {
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      // 文字列の場合
      const d = new Date(date);
      return d.toISOString().split('T')[0];
    } catch (error) {
      console.error('日付の変換に失敗しました:', error);
      return new Date().toISOString().split('T')[0]; // フォールバック
    }
  };

  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal.title,
      description: goal.description,
      genre: goal.genre,
      end_date: formatDate(goal.end_date),
    },
  });

  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      const updatedGoal = await updateGoal(goal.id, {
        ...data,
        end_date: new Date(data.end_date),
      });
      onUpdate(updatedGoal);
      onOpenChange(false);
      toast({
        title: "目標を更新しました",
        description: "目標の内容が正常に更新されました",
      });
    } catch (error) {
      console.error('目標の更新に失敗しました:', error);
      toast({
        title: "エラー",
        description: "目標の更新に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>目標を編集</DialogTitle>
          <DialogDescription>
            目標の内容を編集できます。各項目を入力して更新ボタンを押してください。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>タイトル</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="genre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ジャンル</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="ジャンルを選択" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {GENRES.map((genre) => (
                        <SelectItem key={genre.value} value={genre.value}>
                          {genre.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>目標期限</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "更新中..." : "更新する"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 