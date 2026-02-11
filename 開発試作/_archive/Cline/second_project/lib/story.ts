import supabase from '@/lib/supabase';
import type { Story, StoryChapter, StoryCharacter, FormattedStory } from '@/types/story';
import type { Goal } from '@/types/goal';

interface RawStoryChapter extends StoryChapter {
  story_characters: StoryCharacter[];
  story_chapter_goals: Array<{ goals: Goal }>;
}

interface RawStory extends Story {
  story_chapters: RawStoryChapter[];
}

function formatStory(story: Story): FormattedStory {
  return {
    ...story,
    chapters: [],
  };
}

export async function createStory(
  title: string,
  premise: string,
  chapters: {
    title: string;
    description: string;
    characters: { role: string; description: string; }[];
    goals: {
      title: string;
      description: string;
      target_value: number;
      category: string;
      type: Goal['type'];
      end_date: Date;
    }[];
  }[]
) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('認証が必要です');
  }

  // 作成したリソースのIDを保持
  const createdResources = {
    storyId: null as number | null,
    chapterIds: [] as number[],
    characterIds: [] as number[],
    goalIds: [] as number[],
  };

  try {
    // 1. ストーリーを作成
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .insert({
        user_id: session.user.id,
        title,
        premise,
        current_chapter: 0
      })
      .select()
      .single();

    if (storyError) throw storyError;
    createdResources.storyId = story.id;

    // 2. 各章を作成
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      // 2.1. 章を作成
      const { data: chapterData, error: chapterError } = await supabase
        .from('story_chapters')
        .insert({
          story_id: story.id,
          chapter_number: i,
          title: chapter.title,
          description: chapter.description
        })
        .select()
        .single();

      if (chapterError) throw chapterError;
      createdResources.chapterIds.push(chapterData.id);

      // 2.2. キャラクターを作成
      if (chapter.characters.length > 0) {
        const { data: charactersData, error: charactersError } = await supabase
          .from('story_characters')
          .insert(
            chapter.characters.map(char => ({
              chapter_id: chapterData.id,
              role: char.role,
              description: char.description
            }))
          )
          .select();

        if (charactersError) throw charactersError;
        createdResources.characterIds.push(...charactersData.map(char => char.id));
      }

      // 2.3. 目標を作成
      for (const goal of chapter.goals) {
        const { data: goalData, error: goalError } = await supabase
          .from('goals')
          .insert({
            user_id: session.user.id,
            title: goal.title,
            description: goal.description,
            target_value: goal.target_value,
            current_value: 0,
            category: goal.category,
            type: goal.type,
            end_date: goal.end_date,
            status: 'active'
          })
          .select()
          .single();

        if (goalError) throw goalError;
        createdResources.goalIds.push(goalData.id);

        // 2.4. 目標と章を関連付け
        const { error: linkError } = await supabase
          .from('story_chapter_goals')
          .insert({
            chapter_id: chapterData.id,
            goal_id: goalData.id
          });

        if (linkError) throw linkError;
      }
    }

    // 作成したストーリーを取得して返す
    const createdStory = await getStory(story.id);
    return createdStory;

  } catch (error) {
    console.error('Error creating story:', error);
    
    // エラー時のロールバック処理
    if (supabase) {
      // 作成したリソースを逆順で削除
      try {
        // 1. 目標の削除（関連するstory_chapter_goalsは自動的に削除される）
        if (createdResources.goalIds.length > 0) {
          await supabase
            .from('goals')
            .delete()
            .in('id', createdResources.goalIds);
        }

        // 2. キャラクターの削除
        if (createdResources.characterIds.length > 0) {
          await supabase
            .from('story_characters')
            .delete()
            .in('id', createdResources.characterIds);
        }

        // 3. 章の削除
        if (createdResources.chapterIds.length > 0) {
          await supabase
            .from('story_chapters')
            .delete()
            .in('id', createdResources.chapterIds);
        }

        // 4. ストーリーの削除
        if (createdResources.storyId) {
          await supabase
            .from('stories')
            .delete()
            .eq('id', createdResources.storyId);
        }
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
    
    throw error;
  }
}

export async function getStory(storyId: number): Promise<FormattedStory> {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_chapters (
          *,
          story_characters (
            id,
            role,
            description
          ),
          story_chapter_goals!inner (
            goals (
              id,
              title,
              description,
              target_value,
              current_value,
              category,
              status,
              end_date
            )
          )
        )
      `)
      .eq('id', storyId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('ストーリーが見つかりませんでした');

    const rawStory = data as RawStory;
    return {
      ...rawStory,
      chapters: (rawStory.story_chapters || []).map(chapter => ({
        ...chapter,
        characters: chapter.story_characters || [],
        goals: chapter.story_chapter_goals.map(link => link.goals)
      }))
    };
  } catch (error) {
    console.error('Error fetching story:', error);
    throw error;
  }
}

export async function updateStoryProgress(storyId: number, newChapter: number) {
  try {
    const { error } = await supabase
      .from('user_story_progress')
      .upsert({
        story_id: storyId,
        current_chapter: newChapter,
        updated_at: new Date().toISOString()
      })
      .eq('story_id', storyId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating story progress:', error);
    throw error;
  }
} 