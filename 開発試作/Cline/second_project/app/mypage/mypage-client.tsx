"use client";

import { GoalProgressChart } from '@/components/goals/GoalProgressChart';
import { GoalComments } from '@/components/goals/GoalComments';
import type { GoalWithProgress } from '@/types/goal';

interface MyPageClientProps {
  goals: GoalWithProgress[];
  userId: string;
}

export function MyPageClient({ goals, userId }: MyPageClientProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">マイページ</h1>
      
      {goals?.map((goal: GoalWithProgress) => (
        <div key={goal.id} className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">{goal.title}</h2>
          <div className="mb-4">
            <p className="text-gray-600">{goal.description}</p>
            <p className="mt-2">
              目標値: {goal.target_value} / 現在値: {goal.current_value}
            </p>
          </div>

          {/* 進捗グラフの表示 */}
          {goal.progress && goal.progress.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">進捗グラフ</h3>
              <GoalProgressChart
                progress={goal.progress}
                targetValue={goal.target_value}
              />
            </div>
          )}

          {/* コメントセクション */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">コメント</h3>
            <GoalComments
              goalId={goal.id}
              comments={goal.comments}
              userId={userId}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 