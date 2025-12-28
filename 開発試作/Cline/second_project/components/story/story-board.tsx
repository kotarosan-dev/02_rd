import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JourneyMap } from "@/components/goals/journey-map";
import type { Goal } from "@/types/goal";
import type { StoryChapter, StoryCharacter } from "@/types/story";

interface StoryBoardProps {
  title: string;
  premise: string;
  chapters: (StoryChapter & {
    characters: StoryCharacter[];
    goals: Goal[];
  })[];
  currentChapter?: number;
  onDeleteStory?: () => void;
  onDeleteGoal?: (goalId: number) => void;
}

export function StoryBoard({ 
  title, 
  premise, 
  chapters, 
  currentChapter = 0,
  onDeleteStory,
  onDeleteGoal
}: StoryBoardProps) {
  // ジャーニーマップのデータを生成
  const journeyMapData = {
    phases: chapters.map((chapter, index) => ({
      name: `第${index + 1}章: ${chapter.title}`,
      description: chapter.description,
      duration: "2-4週間",
      milestones: chapter.goals.map(goal => goal.title)
    })),
    totalDuration: `${chapters.length * 3}週間`,
    expectedOutcome: premise
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <CardDescription className="text-lg">{premise}</CardDescription>
          </CardHeader>
        </Card>
        {onDeleteStory && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="ml-4">
                <Trash2 className="h-4 w-4 mr-2" />
                ストーリーを削除
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>ストーリーを削除しますか？</AlertDialogTitle>
                <AlertDialogDescription>
                  この操作は取り消せません。ストーリーと関連する目標がすべて削除されます。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>キャンセル</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteStory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  削除する
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Tabs defaultValue="story" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="story">ストーリー</TabsTrigger>
          <TabsTrigger value="journey">ジャーニーマップ</TabsTrigger>
        </TabsList>

        <TabsContent value="story">
          <ScrollArea className="h-[600px] rounded-md border p-4">
            <div className="space-y-8">
              {chapters.map((chapter, index) => {
                const isCurrentChapter = index === currentChapter;
                const isPastChapter = index < currentChapter;
                const isFutureChapter = index > currentChapter;

                return (
                  <div key={index} className="relative">
                    {index > 0 && (
                      <Separator className="absolute -top-4 left-0 right-0" />
                    )}
                    <Card className={`
                      ${isCurrentChapter ? 'border-primary' : ''}
                      ${isPastChapter ? 'opacity-75' : ''}
                      ${isFutureChapter ? 'opacity-50' : ''}
                    `}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle>第{index + 1}章: {chapter.title}</CardTitle>
                          {isCurrentChapter && (
                            <Badge variant="secondary">現在の章</Badge>
                          )}
                        </div>
                        <CardDescription>{chapter.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">目標</h4>
                            <div className="grid gap-4">
                              {chapter.goals.map((goal, goalIndex) => (
                                <Card key={goalIndex} className="p-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h5 className="font-semibold">{goal.title}</h5>
                                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge>{goal.category}</Badge>
                                      {onDeleteGoal && (
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>目標を削除しますか？</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                この操作は取り消せません。目標に関連するデータがすべて削除されます。
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>キャンセル</AlertDialogCancel>
                                              <AlertDialogAction 
                                                onClick={() => onDeleteGoal(goal.id)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                削除する
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      )}
                                    </div>
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    達成目標: {goal.target_value}% / 期限: {new Date(goal.end_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {chapter.characters && chapter.characters.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold mb-2">登場人物</h4>
                              <div className="grid gap-4">
                                {chapter.characters.map((character, charIndex) => (
                                  <div key={charIndex} className="flex items-center space-x-4">
                                    <Avatar>
                                      <AvatarFallback>{character.role[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-semibold">{character.role}</div>
                                      <p className="text-sm text-muted-foreground">{character.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="journey">
          <Card>
            <CardContent className="pt-6">
              <JourneyMap
                phases={journeyMapData.phases}
                totalDuration={journeyMapData.totalDuration}
                expectedOutcome={journeyMapData.expectedOutcome}
                currentPhase={currentChapter}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 