"use client";

import { useEffect, useState, useCallback } from 'react';
import supabase from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { GoalCard } from '@/components/goals/goal-card';
import type { Goal } from '@/types/goal';
import { 
  type SupabaseStoryResponse,
  type FormattedStory,
  formatSupabaseResponse
} from '@/types/story';
import { Button } from '@/components/ui/button';
import { Plus, Sparkles, BookOpen, Heart, HelpCircle } from 'lucide-react';
import { CreateGoalDialog } from '@/components/goals/create-goal-dialog';
import { CreateStoryDialog } from '@/components/story/create-story-dialog';
import { StoryBoard } from '@/components/story/story-board';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableGoalCard } from "../../../components/goals/sortable-goal-card";
import { GoalAdvisorDialog } from '@/components/goals/goal-advisor-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deleteGoal } from "@/lib/goals";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const GENRES = [
  { value: "all", label: "すべて" },
  { value: "beauty", label: "美容" },
  { value: "health", label: "健康" },
  { value: "skill", label: "スキル" },
  { value: "hobby", label: "趣味" },
  { value: "other", label: "その他" },
];

const STATUSES = [
  { value: "active" as const, label: "頑張り中", color: "bg-green-50 dark:bg-green-900/20 border-green-200" },
  { value: "completed" as const, label: "達成済み", color: "bg-blue-50 dark:bg-blue-900/20 border-blue-200" },
  { value: "failed" as const, label: "未達成", color: "bg-red-50 dark:bg-red-900/20 border-red-200" },
] as const;

function StatusColumn({ 
  status, 
  goals, 
  onStatusChange,
  onDeleteGoal,
  onUpdateGoal
}: { 
  status: typeof STATUSES[number], 
  goals: Goal[], 
  onStatusChange: (goalId: number, newStatus: Goal['status']) => void,
  onDeleteGoal: (goalId: number) => void,
  onUpdateGoal: (updatedGoal: Goal) => void
}) {
  return (
    <div
      className={`p-4 rounded-lg border-2 ${status.color} min-h-[300px] sm:min-h-[500px] transition-colors duration-200`}
    >
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{status.label}</h3>
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="relative group">
              <GoalCard 
                goal={goal} 
                onDelete={onDeleteGoal}
                onStatusChange={onStatusChange}
                onEdit={onUpdateGoal}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [story, setStory] = useState<FormattedStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showAdvisorDialog, setShowAdvisorDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("goals");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        if (!supabase) {
          throw new Error('Supabaseクライアントの初期化に失敗しました');
        }

        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*, profiles(username, avatar_url)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (goalsError) throw goalsError;

        // 重複を排除して、一意の目標のみを保持
        const uniqueGoals = Array.from(new Map(goalsData?.map(goal => [goal.id, goal]) || []).values());
        
        // ステータスごとに目標を分類
        const goalsByStatus = uniqueGoals.reduce((acc, goal) => {
          if (!acc[goal.status]) {
            acc[goal.status] = [];
          }
          acc[goal.status].push(goal);
          return acc;
        }, {} as Record<string, Goal[]>);

        console.log('Goals by status:', goalsByStatus);
        setGoals(uniqueGoals);
      } catch (err) {
        const error = err as Error;
        console.error('目標取得エラー:', error);
        setError(error);
        toast({
          title: 'エラー',
          description: '目標の取得に失敗しました',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchStory = async () => {
      try {
        if (!supabase || !user) return;

        const { data, error } = await supabase
          .from('stories')
          .select(`
            *,
            story_chapters:story_chapters(
              *,
              story_characters(*),
              story_chapter_goals(goals(*))
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          const formattedStory = formatSupabaseResponse(data as SupabaseStoryResponse);
          setStory(formattedStory);
        } else {
          setStory(null);
        }
      } catch (err) {
        console.error('Error fetching story:', err);
        setError(err as Error);
        toast({
          title: "エラー",
          description: "ストーリーの取得に失敗しました",
          variant: "destructive",
        });
      }
    };

    if (mounted) {
      fetchGoals();
      fetchStory();
    }
  }, [user, toast, selectedGenre, mounted]);

  const handleStatusChange = async (goalId: number, newStatus: Goal['status']) => {
    if (!user) return;

    const currentGoal = goals.find(g => g.id === goalId);
    if (!currentGoal) return;

    // 同じステータスへの変更は無視
    if (currentGoal.status === newStatus) return;

    try {
      // UI更新
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, status: newStatus } : goal
      ));

      // データベース更新
      const { data, error } = await supabase
        .from('goals')
        .update({ status: newStatus })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select();

      if (error) throw error;

      toast({
        title: "更新完了",
        description: `目標のステータスを「${STATUSES.find(s => s.value === newStatus)?.label}」に変更しました`,
      });

      // ストーリーの章の目標が完了した場合の処理
      if (story && newStatus === 'completed' && currentGoal.status !== 'completed') {
        // 現在の章の全ての目標が完了しているか確認
        const currentChapterGoals = story.chapters[story.current_chapter]?.goals || [];
        
        const updatedGoals = goals.map(g => g.id === goalId ? { ...g, status: newStatus } : g);
        const allGoalsCompleted = currentChapterGoals.every(goal => {
          const currentGoal = updatedGoals.find(g => g.id === goal.id);
          return currentGoal?.status === 'completed';
        });

        if (allGoalsCompleted) {
          // 最終章の場合
          if (story.current_chapter === story.chapters.length - 1) {
            toast({
              title: "🎉 おめでとうございます！",
              description: "ストーリーが完了しました！全ての目標を達成し、素晴らしい成長を遂げました！",
              variant: "default"
            });
          }
          // まだ次の章がある場合
          else if (story.current_chapter < story.chapters.length - 1) {
            const newChapter = story.current_chapter + 1;
            
            // データベースを更新
            const { error: updateError } = await supabase
              .from('stories')
              .update({ current_chapter: newChapter })
              .eq('id', story.id)
              .eq('user_id', user.id);

            if (updateError) {
              console.error('章の更新エラー:', updateError);
              throw updateError;
            }

            // ローカルのストーリー状態を更新
            setStory(prev => prev ? {
              ...prev,
              current_chapter: newChapter
            } : null);

            toast({
              title: "章が進行しました",
              description: `第${newChapter + 1}章が開始されました！`,
              variant: "default"
            });
          }
        }
      }
    } catch (error) {
      console.error('更新エラー:', error);
      
      // エラー時は元に戻す
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? { ...goal, status: currentGoal.status } : goal
      ));

      toast({
        title: "エラー",
        description: "更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleStoryCreated = (newStory: SupabaseStoryResponse) => {
    const formattedStory = formatSupabaseResponse(newStory);
    setStory(formattedStory);
    setActiveTab("story");
    toast({
      title: "ストーリーを作成しました",
      description: "あなたの物語の旅が始まります！",
    });
  };

  const goalsByStatus = goals.reduce((acc, goal) => {
    if (!acc[goal.status]) {
      acc[goal.status] = [];
    }

    // ストーリーが存在する場合、章の順番に基づいてソート
    if (story) {
      const sortedGoals = [...acc[goal.status], goal].sort((a, b) => {
        const aChapterIndex = story.chapters.findIndex(chapter => 
          chapter.goals.some(g => g.id === a.id)
        );
        const bChapterIndex = story.chapters.findIndex(chapter => 
          chapter.goals.some(g => g.id === b.id)
        );
        
        // ストーリーに含まれない目標は後ろに配置
        if (aChapterIndex === -1) return 1;
        if (bChapterIndex === -1) return -1;
        
        // 章番号で昇順にソート
        const aChapter = story.chapters[aChapterIndex];
        const bChapter = story.chapters[bChapterIndex];
        return aChapter.chapter_number - bChapter.chapter_number;
      });
      acc[goal.status] = sortedGoals;
    } else {
      acc[goal.status].push(goal);
    }
    
    return acc;
  }, {} as Record<string, Goal[]>);

  const handleDeleteStory = async () => {
    if (!user || !story) return;

    try {
      if (!supabase) {
        throw new Error('Supabaseクライアントの初期化に失敗しました');
      }

      console.log('削除対象のストーリー情報:', {
        storyId: story.id,
        userId: user.id,
        chapterIds: story.chapters.map(c => c.id),
        goalIds: story.chapters.flatMap(c => c.goals.map(g => g.id))
      });

      // 削除前の確認
      const { data: existingStory } = await supabase
        .from('stories')
        .select('*')
        .eq('id', story.id)
        .single();

      console.log('データベース上の既存ストーリー:', existingStory);

      // 以下、既存の削除処理
      console.log('ストーリー削除開始:', story.id);

      // 1. story_chapter_goalsの削除（章と目標の関連付け）
      const { data: linkData, error: storyChapterGoalsError } = await supabase
        .from('story_chapter_goals')
        .delete()
        .in('chapter_id', story.chapters.map(chapter => chapter.id))
        .select();

      console.log('1. story_chapter_goals削除結果:', { linkData, error: storyChapterGoalsError });

      if (storyChapterGoalsError) {
        console.error('関連付け削除エラー:', storyChapterGoalsError);
        throw storyChapterGoalsError;
      }

      // 2. story_charactersの削除（章のキャラクター）
      const { data: charData, error: characterError } = await supabase
        .from('story_characters')
        .delete()
        .in('chapter_id', story.chapters.map(chapter => chapter.id))
        .select();

      console.log('2. story_characters削除結果:', { charData, error: characterError });

      if (characterError) {
        console.error('キャラクター削除エラー:', characterError);
        throw characterError;
      }

      // 3. goalsの削除
      const goalIds = story.chapters.flatMap(chapter => chapter.goals.map(goal => goal.id));
      if (goalIds.length > 0) {
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .delete()
          .in('id', goalIds)
          .select();

        console.log('3. goals削除結果:', { goalData, error: goalError, goalIds });

        if (goalError) {
          console.error('目標削除エラー:', goalError);
          throw goalError;
        }
      }

      // 4. story_chaptersの削除
      const { data: chapterData, error: storyChaptersError } = await supabase
        .from('story_chapters')
        .delete()
        .eq('story_id', story.id)
        .select();

      console.log('4. story_chapters削除結果:', { chapterData, error: storyChaptersError });

      if (storyChaptersError) {
        console.error('チャプター削除エラー:', storyChaptersError);
        throw storyChaptersError;
      }

      // 5. storiesの削除
      const { data: storyData, error: storyError } = await supabase
        .from('stories')
        .delete()
        .eq('id', story.id)
        .eq('user_id', user.id)
        .select('*');

      console.log('5. stories削除結果:', { 
        storyData, 
        error: storyError, 
        storyId: story.id, 
        userId: user.id,
        userAuthId: user.id,
        query: `DELETE FROM stories WHERE id = ${story.id} AND user_id = '${user.id}'`
      });

      if (storyError) {
        console.error('ストーリー削除エラー:', storyError);
        throw storyError;
      }

      // UIの更新
      setStory(null);
      setGoals(prev => prev.filter(goal => !goalIds.includes(goal.id)));

      toast({
        title: "削除完了",
        description: "ストーリーと関連する目標を削除しました",
      });
    } catch (error) {
      console.error('ストーリー削除エラー:', error);
      toast({
        title: "エラー",
        description: "ストーリーの削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGoal = async (goalId: number) => {
    if (!user) return;

    try {
      await deleteGoal(goalId);
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
      if (story) {
        setStory(prev => {
          if (!prev) return null;
          return {
            ...prev,
            chapters: prev.chapters.map(chapter => ({
              ...chapter,
              goals: chapter.goals.filter(goal => goal.id !== goalId)
            }))
          };
        });
      }
      toast({
        title: "目標を削除しました",
        description: "目標が正常に削除されました",
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "エラー",
        description: "目標の削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleUpdateGoal = (updatedGoal: Goal) => {
    setGoals(prev => prev.map(g => 
      g.id === updatedGoal.id ? updatedGoal : g
    ));
  };

  if (!user) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <div className="text-lg">この機能を利用するにはログインが必要です</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <div className="text-center text-red-500">
          {error.message || '目標の取得に失敗しました'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 -mx-6 sm:mx-0">
      <Collapsible>
        <CollapsibleTrigger asChild>
          <div className="bg-muted/50 p-4 sm:p-6 rounded-lg border cursor-pointer hover:bg-muted/70 transition-colors group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-semibold">目標管理について</h2>
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <div className="bg-muted/50 p-4 sm:p-6 rounded-lg border mt-2">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-sm text-muted-foreground">
                Inner Glow Beautyの目標管理では、あなたの「なりたい自分」への道のりをサポートします。
                外見の変化は内面の自信につながり、その自信が新たな一歩を踏み出す原動力となります。
              </p>
              <div className="grid gap-3 mt-3">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">AIアドバイザーとは？</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      あなたの美容目標をサポートするAIアシスタントです。
                      「髪のツヤを改善したい」「肌のくすみを改善したい」など、
                      具体的で実現可能な美容目標の設定をサポートします。
                      プロの美容アドバイスを基に、あなたに合った目標設定をお手伝いします。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BookOpen className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">ストーリーを作成とは？</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      あなたの美容における変化と成長を物語として記録します。
                      「憧れの艶髪を手に入れるまでの道のり」「透明感のある肌を目指す美容習慣」など、
                      日々の努力と変化を魅力的なストーリーとして残すことができます。
                      写真や記録と共に、あなたの美の軌跡を紡いでいきましょう。
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 mt-1 text-primary" />
                  <div>
                    <h3 className="text-sm font-medium">コミュニティとの連携</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      目標を公開すると、コミュニティのメンバーからいいねや応援メッセージをもらえます。
                      同じ目標を持つ仲間と繋がり、互いに刺激し合いながら成長できます。
                      みんなの目標ページでは、他のメンバーの目標も見ることができ、
                      新しいアイデアやモチベーションを得ることができます。
                    </p>
                    <Button
                      variant="link"
                      className="px-0 py-1 h-auto text-xs text-primary"
                      onClick={() => router.push('/goals')}
                    >
                      みんなの目標を見る →
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 -mx-6 sm:mx-0 border-b">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="flex-1 sm:flex-none" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            目標を作成
          </Button>
          <Button onClick={() => setShowStoryDialog(true)} className="flex-1 sm:flex-none" size="sm">
            <BookOpen className="mr-2 h-4 w-4" />
            ストーリーを作成
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="goals">目標一覧</TabsTrigger>
          <TabsTrigger value="story">ストーリーモード</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="mb-4 w-full sm:w-auto">
            <Select value={selectedGenre} onValueChange={setSelectedGenre}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="ジャンルを選択" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((genre) => (
                  <SelectItem key={genre.value} value={genre.value}>
                    {genre.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {STATUSES.map((status) => (
              <StatusColumn
                key={status.value}
                status={status}
                goals={goalsByStatus[status.value] || []}
                onStatusChange={handleStatusChange}
                onDeleteGoal={handleDeleteGoal}
                onUpdateGoal={handleUpdateGoal}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="story">
          {story ? (
            <StoryBoard
              title={story.title}
              premise={story.premise}
              chapters={story.chapters}
              currentChapter={story.current_chapter}
              onDeleteStory={handleDeleteStory}
              onDeleteGoal={handleDeleteGoal}
            />
          ) : (
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold mb-4">物語をまだ作成していません</h2>
              <p className="text-muted-foreground mb-8">
                「ストーリーを作成」ボタンをクリックして、あなたの物語を作成しましょう。
              </p>
              <Button onClick={() => setShowStoryDialog(true)}>
                <BookOpen className="mr-2 h-4 w-4" />
                ストーリーを作成
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateGoalDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onGoalCreated={() => {
          router.refresh();
        }}
      />

      <CreateStoryDialog
        open={showStoryDialog}
        onOpenChange={setShowStoryDialog}
        onStoryCreated={handleStoryCreated}
      />

      <GoalAdvisorDialog
        open={showAdvisorDialog}
        onOpenChange={setShowAdvisorDialog}
      />
    </div>
  );
} 