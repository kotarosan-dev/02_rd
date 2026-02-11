import { Goal } from './goal';

export interface Story {
  id: number;
  user_id: string;
  title: string;
  premise: string;
  current_chapter: number;
  created_at: string;
  updated_at: string;
}

export interface StoryChapter {
  id: number;
  story_id: number;
  chapter_number: number;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface StoryCharacter {
  id: number;
  chapter_id: number;
  role: string;
  description: string;
  created_at: string;
}

export interface StoryChapterGoal {
  chapter_id: number;
  goal_id: number;
  goals: Goal;
}

export interface SupabaseStoryChapter extends StoryChapter {
  story_characters: StoryCharacter[];
  story_chapter_goals: { goals: Goal }[];
}

export interface SupabaseStoryResponse extends Story {
  story_chapters: SupabaseStoryChapter[];
}

export interface FormattedStory extends Story {
  chapters: (Omit<StoryChapter, 'story_characters' | 'story_chapter_goals'> & {
    characters: StoryCharacter[];
    goals: Goal[];
  })[];
}

export const formatSupabaseResponse = (response: SupabaseStoryResponse): FormattedStory => {
  return {
    ...response,
    chapters: response.story_chapters.map(chapter => ({
      id: chapter.id,
      story_id: chapter.story_id,
      chapter_number: chapter.chapter_number,
      title: chapter.title,
      description: chapter.description,
      created_at: chapter.created_at,
      updated_at: chapter.updated_at,
      characters: chapter.story_characters || [],
      goals: chapter.story_chapter_goals?.map(link => link.goals) || []
    }))
  };
}; 