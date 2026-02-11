import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GoalCard } from './goal-card';
import type { Goal } from '@/types/goal';
import { GripVertical } from "lucide-react";

interface Props {
  goal: Goal;
  onDelete?: (id: number) => void;
  story?: {
    title: string;
    current_chapter: number;
    chapters: {
      title: string;
      chapter_number: number;
    }[];
  } | null;
}

export function SortableGoalCard({ goal, onDelete, story }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: goal.id.toString(),
    data: {
      type: 'goal',
      goal: goal,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`${isDragging ? 'scale-105' : ''} transition-transform duration-200`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 z-10 h-full w-8 cursor-grab opacity-0 hover:opacity-100 active:cursor-grabbing"
      >
        <div className="flex h-full items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </div>
      </div>
      <GoalCard goal={goal} onDelete={onDelete} story={story} />
    </div>
  );
} 