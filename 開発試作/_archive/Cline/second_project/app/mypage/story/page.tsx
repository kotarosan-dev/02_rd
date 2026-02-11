'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreateStoryDialog } from "@/components/story/create-story-dialog";
import { StoryBoard } from "@/components/story/story-board";
import { PlusCircle } from "lucide-react";
import type { FormattedStory, SupabaseStoryResponse } from "@/types/story";
import { formatSupabaseResponse } from "@/types/story";

export default function StoryPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [story, setStory] = useState<FormattedStory | null>(null);

  const handleStoryCreated = (newStory: SupabaseStoryResponse) => {
    const formattedStory = formatSupabaseResponse(newStory);
    setStory(formattedStory);
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">あなたの物語</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新しい物語を始める
        </Button>
      </div>

      {story ? (
        <StoryBoard
          title={story.title}
          premise={story.premise}
          chapters={story.chapters}
          currentChapter={story.current_chapter}
        />
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-4">物語をまだ作成していません</h2>
          <p className="text-muted-foreground mb-8">
            「新しい物語を始める」ボタンをクリックして、あなたの物語を作成しましょう。
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            物語を作成
          </Button>
        </div>
      )}

      <CreateStoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onStoryCreated={handleStoryCreated}
      />
    </div>
  );
} 