"use client";

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { GoalCard } from '@/components/goals/goal-card';
import type { Goal } from '@/types/goal';
import { HelpCircle, Trophy, Users, ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const categories = [
  { value: "all", label: "すべて" },
  { value: "スキンケア", label: "スキンケア" },
  { value: "ボディケア", label: "ボディケア" },
  { value: "メンタルケア", label: "メンタルケア" },
  { value: "ヘアケア", label: "ヘアケア" },
  { value: "メイク", label: "メイク" },
];

const sortOptions = [
  { value: "latest", label: "最新順" },
  { value: "claps", label: "応援数順" },
  { value: "comments", label: "コメント数順" },
  { value: "progress", label: "進捗率順" },
] as const;

type SortOption = typeof sortOptions[number]["value"];

interface GoalWithStats extends Goal {
  total_claps: number;
  comments_count: number;
  latest_progress: number;
  goal_likes?: Array<{ clap_number: number }>;
  goal_comments?: Array<{ id: number }>;
  goal_progress?: Array<{ progress: number }>;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithStats[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState<SortOption>("latest");
  const [communityStats, setCommunityStats] = useState({
    helpNeeded: 0,
    solved: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    const fetchGoals = async () => {
      let query = supabase
        .from('goals')
        .select(`
          *,
          profiles!goals_user_id_fkey(username),
          goal_likes(clap_number),
          goal_progress(progress)
        `)
        .eq('is_public', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      // ソート順の適用
      switch (selectedSort) {
        case "latest":
          query = query.order('created_at', { ascending: false });
          break;
        case "progress":
          query = query.order('current_value', { ascending: false });
          break;
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching goals:', error);
        return;
      }

      // データの加工
      const processedGoals = (data || []).map(goal => ({
        ...goal,
        total_claps: goal.goal_likes?.reduce((sum: number, like: { clap_number: number }) => 
          sum + (like.clap_number || 0), 0) || 0,
        comments_count: 0, // コメント機能は別途実装予定
        latest_progress: goal.goal_progress?.[0]?.progress || 0,
      }));

      // クライアントサイドでのソート
      let sortedGoals = [...processedGoals];
      if (selectedSort === "claps") {
        sortedGoals.sort((a, b) => b.total_claps - a.total_claps);
      }

      setGoals(sortedGoals);
    };

    const fetchCommunityStats = async () => {
      // ヘルプが必要な目標の数を取得
      const { count: helpNeeded } = await supabase
        .from('goals')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .eq('needs_help', true);

      // 解決済みの目標の数を取得
      const { count: solved } = await supabase
        .from('goals')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .eq('status', 'completed');

      // アクティブユーザー数を取得
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact' });

      setCommunityStats({
        helpNeeded: helpNeeded || 0,
        solved: solved || 0,
        activeUsers: activeUsers || 0,
      });
    };

    fetchGoals();
    fetchCommunityStats();
  }, [selectedCategory, selectedSort]);

  // 目標を種類別に分類
  const helpNeededGoals = goals.filter(goal => goal.needs_help);
  const recentlyAchievedGoals = goals.filter(goal => goal.status === 'completed');
  const regularGoals = goals.filter(goal => !goal.needs_help && goal.status !== 'completed');

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6 sm:space-y-8">
      {/* コミュニティダッシュボード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 sm:h-5 w-4 sm:w-5 text-yellow-600" />
            <h3 className="font-semibold text-sm sm:text-base">助けを求めている人</h3>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2">{communityStats.helpNeeded}人</p>
        </Card>
        <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 sm:h-5 w-4 sm:w-5 text-green-600" />
            <h3 className="font-semibold text-sm sm:text-base">解決された課題</h3>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2">{communityStats.solved}件</p>
        </Card>
        <Card className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2">
            <Users className="h-4 sm:h-5 w-4 sm:w-5 text-blue-600" />
            <h3 className="font-semibold text-sm sm:text-base">アクティブメンバー</h3>
          </div>
          <p className="text-xl sm:text-2xl font-bold mt-2">{communityStats.activeUsers}人</p>
        </Card>
      </div>

      {/* フィルターとソート */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="カテゴリー" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedSort} 
          onValueChange={(value) => setSelectedSort(value as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="並び替え" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* メインコンテンツ */}
      <Tabs defaultValue="help" className="space-y-4">
        <TabsList className="w-full flex">
          <TabsTrigger value="help" className="flex-1 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <HelpCircle className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline">みんなで助け合おう！</span>
            <span className="sm:hidden">助け合い</span>
            {helpNeededGoals.length > 0 && (
              <span className="ml-1 sm:ml-2 bg-yellow-100 text-yellow-800 text-xs px-1.5 sm:px-2 py-0.5 rounded-full">
                {helpNeededGoals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex-1 text-xs sm:text-sm">みんなの頑張り</TabsTrigger>
          <TabsTrigger value="achieved" className="flex-1 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Trophy className="h-3 sm:h-4 w-3 sm:w-4" />
            <span className="hidden sm:inline">最近達成！</span>
            <span className="sm:hidden">達成</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="help" className="space-y-3 sm:space-y-4">
          {helpNeededGoals.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {helpNeededGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isCommentsEnabled={true}
                  showAuthor={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
              現在、助けを求めている人はいません
            </div>
          )}
        </TabsContent>

        <TabsContent value="regular" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {regularGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isCommentsEnabled={false}
                showAuthor={true}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="achieved" className="space-y-3 sm:space-y-4">
          {recentlyAchievedGoals.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {recentlyAchievedGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isCommentsEnabled={true}
                  showAuthor={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-sm sm:text-base">
              最近達成された目標はありません
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}