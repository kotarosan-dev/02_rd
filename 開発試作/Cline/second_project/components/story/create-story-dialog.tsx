import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import type { SupabaseStoryResponse } from "@/types/story";

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated: (story: SupabaseStoryResponse) => void;
}

export function CreateStoryDialog({
  open,
  onOpenChange,
  onStoryCreated,
}: CreateStoryDialogProps) {
  const [currentSituation, setCurrentSituation] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSituation || !desiredOutcome) {
      toast({
        title: "入力エラー",
        description: "現状と目指したい状態を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/story/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentSituation,
          desiredOutcome,
        }),
      });

      if (!response.ok) {
        throw new Error("ストーリーの生成に失敗しました");
      }

      const story = await response.json();
      onStoryCreated(story);
      onOpenChange(false);
      toast({
        title: "ストーリーを生成しました",
        description: "あなたの物語の旅が始まります！",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ストーリーの生成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (isLoading) return;
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>あなたの美容ストーリーを作成</DialogTitle>
            <DialogDescription>
              現在の状況と目指したい状態を教えてください。AIがあなたの美容における成長物語を紡ぎます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label htmlFor="currentSituation" className="text-sm font-medium">
                現在の状況
              </label>
              <Textarea
                id="currentSituation"
                value={currentSituation}
                onChange={(e) => setCurrentSituation(e.target.value)}
                placeholder="例：髪のパサつきが気になり、ツヤがなく、まとまりにくい状態です。シャンプーやトリートメントを変えても、なかなか改善されません..."
                className="h-24"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="desiredOutcome" className="text-sm font-medium">
                目指したい状態
              </label>
              <Textarea
                id="desiredOutcome"
                value={desiredOutcome}
                onChange={(e) => setDesiredOutcome(e.target.value)}
                placeholder="例：自然な艶のある、指通りの良い健康的な髪を手に入れたいです。美容院でも褒められるような、誰もが憧れる美しい髪を目指したい..."
                className="h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ストーリーを生成中...
                </>
              ) : (
                "物語を生成"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 