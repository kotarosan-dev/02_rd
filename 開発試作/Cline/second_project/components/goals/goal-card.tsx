"use client";

import { useEffect, useState } from "react";
import { Goal } from "@/types/goal";
import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MoreVertical, BarChart2, Edit2, Trash2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getGoalLikes, incrementClap, updateGoalProgress } from "@/lib/goals";
import dynamic from 'next/dynamic';
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { EditGoalDialog } from "./edit-goal-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import supabase from "@/lib/supabase";
import { GoalComments } from "./goal-comments";
import type { GoalComment } from "@/types/goal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { HelpRequestDialog } from "./help-request-dialog";
import { Progress } from "@/components/ui/progress";
import Image from 'next/image';

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

interface GoalCardProps {
  goal: Goal;
  onDelete?: (goalId: number) => void;
  onStatusChange?: (goalId: number, newStatus: 'active' | 'completed' | 'failed') => void;
  onEdit?: (goal: Goal) => void;
  isCommentsEnabled?: boolean;
  showAuthor?: boolean;
  story?: {
    title: string;
    current_chapter: number;
    chapters: {
      title: string;
      chapter_number: number;
    }[];
  } | null;
}

const STATUS_ORDER = ['active', 'completed', 'failed'] as const;
const STATUS_LABELS = {
  active: '頑張り中',
  completed: '達成済み',
  failed: '未達成'
} as const;

export function GoalCard({ 
  goal, 
  onDelete, 
  onStatusChange, 
  onEdit,
  isCommentsEnabled = true,
  showAuthor = false,
  story
}: GoalCardProps) {
  const [likes, setLikes] = useState({ totalClaps: 0, userClaps: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [progress, setProgress] = useState(
    goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0
  );
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [needsHelp, setNeedsHelp] = useState(goal.needs_help || false);
  const { toast } = useToast();
  const [comments, setComments] = useState<GoalComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showHelpRequestDialog, setShowHelpRequestDialog] = useState(false);
  const [helpRequestContent, setHelpRequestContent] = useState<string | null>(null);
  const [authorProfile, setAuthorProfile] = useState<{ 
    username: string; 
    full_name: string | null;
    avatar_url: string | null 
  } | null>(null);

  useEffect(() => {
    const newProgress = goal.target_value > 0 
      ? Math.round((goal.current_value / goal.target_value) * 100)
      : 0;
    setProgress(newProgress);
  }, [goal.current_value, goal.target_value]);

  useEffect(() => {
    const loadLikes = async () => {
      try {
        const { data } = await getGoalLikes(goal.id);
        if (data) {
          setLikes({
            totalClaps: data.totalClaps || 0,
            userClaps: data.userClaps || 0
          });
        }
      } catch (error) {
        console.error('Error loading likes:', error);
      }
    };
    loadLikes();
  }, [goal.id]);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoadingComments(true);
      try {
        if (!supabase) throw new Error("Supabaseクライアントの初期化に失敗しました");

        const { data, error, count } = await supabase
          .from("goal_comments")
          .select("*, profiles(username, avatar_url)", { count: "exact" })
          .eq("goal_id", goal.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        setComments(data || []);
        if (count !== null) setCommentsCount(count);
      } catch (error) {
        console.error("コメント取得エラー:", error);
      } finally {
        setIsLoadingComments(false);
      }
    };

    fetchComments();
  }, [goal.id]);

  useEffect(() => {
    const fetchHelpRequest = async () => {
      if (!goal.needs_help) return;

      try {
        if (!supabase) throw new Error("Supabaseクライアントの初期化に失敗しました");

        const { data, error } = await supabase
          .from("goal_help_requests")
          .select("description")
          .eq("goal_id", goal.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;
        if (data) {
          setHelpRequestContent(data.description);
        }
      } catch (error) {
        console.error("ヘルプリクエスト取得エラー:", error);
      }
    };

    fetchHelpRequest();
  }, [goal.id, goal.needs_help]);

  useEffect(() => {
    const fetchAuthorProfile = async () => {
      if (!showAuthor) return;
      
      try {
        if (!supabase) throw new Error("Supabaseクライアントの初期化に失敗しました");

        const { data, error } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", goal.user_id)
          .single();

        if (error) throw error;
        if (data) {
          setAuthorProfile(data);
        }
      } catch (error) {
        console.error("プロフィール取得エラー:", error);
      }
    };

    fetchAuthorProfile();
  }, [goal.user_id, showAuthor]);

  const handleClap = async () => {
    if (likes.userClaps >= 10) {
      toast({
        title: "最大応援数に達しました",
        description: "この目標には最大の応援をしています！",
      });
      return;
    }

    try {
      await incrementClap(goal.id);
      const newUserClaps = likes.userClaps + 1;
      const newTotalClaps = likes.totalClaps + 1;
      
      setLikes({
        totalClaps: newTotalClaps,
        userClaps: newUserClaps
      });
      
      if (newUserClaps === 10) {
        setShowConfetti(true);
        setTimeout(() => {
          toast({
            title: "🎉 おめでとうございます！",
            description: "最大の応援を送りました！あなたの応援が目標達成の力になります。",
          });
        }, 0);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "応援の処理に失敗しました",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'completed':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'failed':
        return 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const handleProgressUpdate = async (newProgress: number) => {
    try {
      await updateGoalProgress(goal.id, newProgress);
      setProgress(newProgress);
      toast({
        title: "進捗を更新しました",
        description: `目標の達成率が${newProgress}%になりました`,
      });
      setShowProgressDialog(false);
    } catch (error) {
      toast({
        title: "エラー",
        description: "進捗の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleProgressDialogOpen = (open: boolean) => {
    if (open) {
      setTempProgress(progress);
    }
    setShowProgressDialog(open);
  };

  const handleEdit = (updatedGoal: Goal) => {
    if (onEdit) {
      onEdit(updatedGoal);
    }
  };

  const handleHelpRequest = async () => {
    if (!isCommentsEnabled) return;

    if (needsHelp) {
      return;
    } else {
      setShowHelpRequestDialog(true);
    }
  };

  const handleHelpRequestSubmitted = async () => {
    try {
      if (!supabase) throw new Error("Supabaseクライアントの初期化に失敗しました");

      const { error } = await supabase
        .from("goals")
        .update({ needs_help: true })
        .eq("id", goal.id);

      if (error) throw error;

      setNeedsHelp(true);
    } catch (error) {
      console.error("目標の更新エラー:", error);
      toast({
        title: "エラー",
        description: "目標の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleHelpRequestEnd = async () => {
    try {
      if (!supabase) throw new Error("Supabaseクライアントの初期化に失敗しました");

      const { error } = await supabase
        .from("goals")
        .update({ needs_help: false })
        .eq("id", goal.id);

      if (error) throw error;

      setNeedsHelp(false);
      toast({
        title: "アドバイス募集を終了しました",
        description: "アドバイスの募集を終了しました。ご協力ありがとうございました",
      });
    } catch (error) {
      console.error("アドバイス要求の更新エラー:", error);
      toast({
        title: "エラー",
        description: "アドバイス要求の更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      <EditGoalDialog
        goal={goal}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={handleEdit}
      />
      <Card className="w-full hover:shadow-md transition-shadow duration-200">
        <div className="p-4 sm:p-6 flex flex-col min-h-[180px] sm:min-h-[200px]">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              {showAuthor && (
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="relative w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden bg-muted">
                    {authorProfile?.avatar_url ? (
                      <Image
                        src={authorProfile.avatar_url}
                        alt={authorProfile.full_name || authorProfile.username || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                        {authorProfile?.full_name ? 
                          authorProfile.full_name.charAt(0).toUpperCase() : 
                          authorProfile?.username ? 
                            authorProfile.username.charAt(0).toUpperCase() : 
                            '?'
                        }
                      </div>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {authorProfile?.full_name || authorProfile?.username || 'ユーザー不明'}
                  </span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                {onStatusChange ? (
                  <Select
                    value={goal.status}
                    onValueChange={(value) => onStatusChange(goal.id, value as typeof STATUS_ORDER[number])}
                  >
                    <SelectTrigger className={cn(
                      "h-6 sm:h-7 text-xs",
                      getStatusColor(goal.status)
                    )}>
                      <SelectValue>{STATUS_LABELS[goal.status as keyof typeof STATUS_LABELS]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" align="start" sideOffset={5}>
                      {STATUS_ORDER.map((status) => (
                        <SelectItem
                          key={status}
                          value={status}
                          className={cn("text-xs", getStatusColor(status))}
                        >
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    getStatusColor(goal.status)
                  )}>
                    {STATUS_LABELS[goal.status as keyof typeof STATUS_LABELS]}
                  </span>
                )}
                {progress > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    {progress}% 達成
                  </span>
                )}
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-base sm:text-lg leading-tight relative">
                    <span className="block hover:text-clip" title={goal.title}>{goal.title}</span>
                  </h3>
                </div>
                
                <div className="relative group/description">
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2" title={goal.description}>
                    {goal.description}
                  </p>
                  <div className="absolute left-0 right-0 top-full opacity-0 group-hover/description:opacity-100 bg-white dark:bg-gray-950 p-2 sm:p-3 rounded shadow-lg transition-opacity z-10 pointer-events-none mt-1">
                    <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap">{goal.description}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t space-y-2 sm:space-y-3">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm text-muted-foreground">
            <span className="text-xs px-2 py-1 rounded-full bg-muted">
              {new Date(goal.end_date).toLocaleDateString('ja-JP')} まで
            </span>
            {likes.totalClaps > 0 && (
              <span className="text-xs px-2 py-1 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-900/20 dark:text-pink-400">
                👏 {likes.totalClaps}
                {likes.userClaps > 0 && ` (あなた: ${likes.userClaps})`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isCommentsEnabled ? (
                <Dialog open={showProgressDialog} onOpenChange={handleProgressDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm">
                      <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>進捗 {progress}%</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>進捗を更新</DialogTitle>
                      <DialogDescription>
                        スライダーを動かして目標の達成率を設定してください
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <Slider
                        defaultValue={[progress]}
                        max={100}
                        step={1}
                        value={[tempProgress]}
                        onValueChange={(value) => setTempProgress(value[0])}
                      />
                      <div className="text-center mt-2">
                        現在の達成率: {tempProgress}%
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowProgressDialog(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        onClick={() => handleProgressUpdate(tempProgress)}
                      >
                        更新する
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-[120px] sm:min-w-[140px]">
                  <BarChart2 className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Progress value={progress} className="h-1.5 sm:h-2" />
                    <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">{progress}% 達成</p>
                  </div>
                </div>
              )}

              {onEdit && isCommentsEnabled && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit2 className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span>編集</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 sm:h-9 gap-1 sm:gap-2">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs">{commentsCount}</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>
                      {goal.needs_help ? "アドバイス募集中" : "コメント"}
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <GoalComments 
                      goalId={goal.id} 
                      initialComments={comments}
                      isHelpNeeded={goal.needs_help}
                      helpRequestContent={helpRequestContent || undefined}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              {isCommentsEnabled ? (
                <>
                  {needsHelp ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="default"
                          size="sm"
                          className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
                        >
                          <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                          <span>教えて</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>アドバイス募集を終了しますか？</AlertDialogTitle>
                          <AlertDialogDescription>
                            アドバイス募集を終了すると、他のユーザーにアドバイスが必要なことが伝わらなくなります。
                            十分なアドバイスを得られましたか？
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>キャンセル</AlertDialogCancel>
                          <AlertDialogAction onClick={handleHelpRequestEnd}>
                            終了する
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 sm:h-9 gap-1 sm:gap-2 text-xs sm:text-sm"
                      onClick={() => setShowHelpRequestDialog(true)}
                    >
                      <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>教えて</span>
                    </Button>
                  )}
                  <HelpRequestDialog
                    goalId={goal.id}
                    open={showHelpRequestDialog}
                    onOpenChange={setShowHelpRequestDialog}
                    onRequestSubmitted={handleHelpRequestSubmitted}
                  />
                </>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {goal.needs_help && (
                    <div className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                      <HelpCircle className="h-3 w-3" />
                      <span>アドバイス募集中</span>
                    </div>
                  )}
                </div>
              )}

              <div className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 sm:h-9 text-muted-foreground hover:text-pink-500",
                    likes.userClaps > 0 && "text-pink-500",
                    likes.userClaps >= 10 && "opacity-50 cursor-not-allowed hover:text-pink-500"
                  )}
                  onClick={handleClap}
                  disabled={likes.userClaps >= 10}
                >
                  <span className="text-base sm:text-lg">👏</span>
                </Button>
                {likes.userClaps >= 10 && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-white dark:bg-gray-800 px-2 sm:px-3 py-1 rounded-md shadow-lg text-xs text-muted-foreground whitespace-nowrap">
                      たくさんの応援ありがとうございました！
                    </div>
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45"></div>
                  </div>
                )}
              </div>

              {onDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 sm:h-9 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>目標を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は取り消せません。目標に関連するすべてのデータが削除されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(goal.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
} 