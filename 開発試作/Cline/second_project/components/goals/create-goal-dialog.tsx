"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createGoal } from "@/lib/goals";
import { Loader2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JourneyMap } from "@/components/goals/journey-map";

const CATEGORIES = [
  { value: "beauty", label: "美容" },
  { value: "health", label: "健康" },
  { value: "skill", label: "スキル" },
  { value: "hobby", label: "趣味" },
  { value: "other", label: "その他" },
];

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoalCreated?: () => void;
}

export function CreateGoalDialog({
  open,
  onOpenChange,
  onGoalCreated,
}: CreateGoalDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestedGoals, setSuggestedGoals] = useState<any[]>([]);
  const [loadingGoals, setLoadingGoals] = useState<number[]>([]);
  const [selectedGoals, setSelectedGoals] = useState<number[]>([]);
  const [advice, setAdvice] = useState("");
  const [activeTab, setActiveTab] = useState("manual");
  const [journeyMap, setJourneyMap] = useState<any>(null);
  const { toast } = useToast();

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !category || !endDate) {
      toast({
        title: "入力エラー",
        description: "すべての項目を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await createGoal({
        title,
        description,
        category,
        type: 'monthly',
        target_value: 100,
        end_date: new Date(endDate).toISOString(),
        status: "active",
      });
      
      onOpenChange(false);
      onGoalCreated?.();
      toast({
        title: "目標を作成しました",
        description: "新しい目標が追加されました",
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "目標の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput) {
      toast({
        title: "入力エラー",
        description: "目標や願望を入力してください",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/goals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: aiInput }),
      });

      if (!response.ok) throw new Error("分析に失敗しました");

      const data = await response.json();
      setSuggestedGoals(data.goals.map((goal: any, index: number) => ({ ...goal, id: index })));
      setJourneyMap(data.journeyMap);
      setAdvice(data.advice);
    } catch (error) {
      toast({
        title: "エラー",
        description: "目標の分析に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddGoal = async (goal: any) => {
    if (goal.isAdded) return;
    
    setLoadingGoals(prev => [...prev, goal.id]);
    try {
      const goalData = {
        title: goal.title,
        description: goal.description,
        category: goal.category || 'beauty',
        type: 'monthly' as const,
        target_value: 100,
        end_date: new Date(Date.now() + goal.recommendedPeriod * 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
      };
      await createGoal(goalData);

      setSuggestedGoals(prev => 
        prev.map(g => 
          g.id === goal.id 
            ? { ...g, isAdded: true }
            : g
        )
      );

      toast({
        title: "目標を追加しました",
        description: goal.title,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "目標の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setLoadingGoals(prev => prev.filter(id => id !== goal.id));
    }
  };

  const handleGoalSelection = (goalId: number) => {
    setSelectedGoals(prev => 
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const handleSelectedGoalsSubmit = async () => {
    if (selectedGoals.length === 0) {
      toast({
        title: "選択エラー",
        description: "少なくとも1つの目標を選択してください",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const selectedGoalData = suggestedGoals
        .filter(goal => selectedGoals.includes(goal.id))
        .map(goal => ({
          title: goal.title,
          description: goal.description,
          category: goal.category || 'beauty',
          type: 'monthly' as const,
          target_value: 100,
          end_date: new Date(Date.now() + goal.recommendedPeriod * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
        }));

      for (const goalData of selectedGoalData) {
        await createGoal(goalData);
      }

      onOpenChange(false);
      onGoalCreated?.();
      toast({
        title: "目標を作成しました",
        description: `${selectedGoalData.length}個の目標が追加されました`,
      });
    } catch (error) {
      toast({
        title: "エラー",
        description: "目標の作成に失敗しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新しい目標を作成</DialogTitle>
          <DialogDescription>
            目標の詳細を入力してください。AIアドバイザーに相談することもできます。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">手動で作成</TabsTrigger>
            <TabsTrigger value="ai">AIに相談</TabsTrigger>
          </TabsList>

          <TabsContent value="manual">
            <form onSubmit={handleManualSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Input
                    placeholder="目標のタイトル"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Textarea
                    placeholder="目標の詳細な説明"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="ジャンルを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  作成する
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          <TabsContent value="ai">
            <form onSubmit={handleAiSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder="あなたの目標や願望を自由に入力してください。例：肌をきれいにしたい、健康的な生活を送りたい"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isAnalyzing}>
                  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  分析する
                </Button>
              </DialogFooter>
            </form>

            {suggestedGoals.length > 0 && (
              <div className="mt-4 space-y-6">
                <div className="space-y-4">
                  <h4 className="mb-2 font-medium">提案された目標：</h4>
                  {Array.from(
                    new Set(suggestedGoals.map(goal => goal.parentGoal)),
                    (parentGoal, index) => (
                      <div key={`parent-${index}-${parentGoal}`} className="space-y-2">
                        <h5 className="font-medium text-primary">{parentGoal}</h5>
                        <div className="pl-4 space-y-2">
                          {suggestedGoals
                            .filter(goal => goal.parentGoal === parentGoal)
                            .map((goal) => (
                              <div
                                key={`goal-${goal.id}-${goal.title}`}
                                className={`p-3 rounded-lg border bg-card transition-all duration-300 ${
                                  goal.isAdded 
                                    ? 'border-green-500 bg-green-50 scale-[0.98]' 
                                    : 'hover:border-primary hover:shadow-sm'
                                }`}
                              >
                                <h6 className="font-medium">{goal.title}</h6>
                                <p className="text-sm text-gray-600">{goal.description}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="text-sm text-gray-500">
                                    期間: {goal.recommendedPeriod}週間
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={goal.isAdded ? "secondary" : "outline"}
                                    onClick={() => handleAddGoal(goal)}
                                    disabled={loadingGoals.includes(goal.id) || goal.isAdded}
                                    className={`transition-all duration-300 ${
                                      goal.isAdded ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
                                    }`}
                                  >
                                    {loadingGoals.includes(goal.id) && (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    {goal.isAdded ? "追加済み ✓" : "この目標を追加"}
                                  </Button>
                                </div>
                              </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>

                {journeyMap && (
                  <div className="mt-6">
                    <JourneyMap
                      phases={journeyMap.phases}
                      totalDuration={journeyMap.totalDuration}
                      expectedOutcome={journeyMap.expectedOutcome}
                    />
                  </div>
                )}

                {advice && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-1">アドバイス：</h4>
                    <p className="text-sm text-gray-600">{advice}</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 