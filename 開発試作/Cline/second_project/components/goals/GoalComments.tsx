'use client';

import React, { useState, useCallback, memo } from 'react';
import { GoalComment } from '@/types/goal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

interface CommentItemProps {
  comment: GoalComment;
}

const CommentItem = memo(({ comment }: CommentItemProps) => (
  <div className={`p-4 rounded-lg ${getCommentBackgroundColor(comment.type)}`}>
    <div className="flex items-center gap-2 mb-2">
      {comment.profiles?.avatar_url && (
        <Image
          src={comment.profiles.avatar_url}
          alt={comment.profiles.username || ''}
          width={32}
          height={32}
          className="rounded-full"
        />
      )}
      <span className="font-semibold">
        {comment.profiles?.username || '匿名ユーザー'}
        {comment.profiles?.role === 'admin' && (
          <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
            管理者
          </span>
        )}
      </span>
      <span className="text-sm text-gray-500">
        {format(new Date(comment.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
      </span>
      <span className={`text-sm px-2 py-1 rounded ${getCommentTypeStyle(comment.type)}`}>
        {getCommentTypeLabel(comment.type)}
      </span>
    </div>
    
    {comment.image_url && (
      <div className="mb-4">
        <Image
          src={comment.image_url}
          alt="達成の記録"
          width={300}
          height={200}
          className="rounded-lg object-cover"
        />
      </div>
    )}
    
    <div className="space-y-2">
      <p className="text-gray-700">{comment.content}</p>
      
      {comment.type === 'diary' && (
        <>
          {comment.effort_points && (
            <div className="mt-2">
              <h4 className="font-semibold text-sm text-gray-600">がんばったこと：</h4>
              <p className="text-gray-700">{comment.effort_points}</p>
            </div>
          )}
          {comment.challenges_faced && (
            <div className="mt-2">
              <h4 className="font-semibold text-sm text-gray-600">つらかったこと：</h4>
              <p className="text-gray-700">{comment.challenges_faced}</p>
            </div>
          )}
          {comment.personal_growth && (
            <div className="mt-2">
              <h4 className="font-semibold text-sm text-gray-600">成長したこと：</h4>
              <p className="text-gray-700">{comment.personal_growth}</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
));

CommentItem.displayName = 'CommentItem';

interface GoalCommentsProps {
  goalId: number;
  comments: GoalComment[];
  userId: string;
  isAdmin?: boolean;
}

export const GoalComments: React.FC<GoalCommentsProps> = memo(({
  goalId,
  comments,
  userId,
  isAdmin = false
}) => {
  const [newComment, setNewComment] = useState('');
  const [commentType, setCommentType] = useState<'achievement' | 'advice' | 'diary' | 'admin_feedback'>('achievement');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [effortPoints, setEffortPoints] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [personalGrowth, setPersonalGrowth] = useState('');
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const handleImageUpload = useCallback(async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `goal-images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('goal-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('goal-images')
      .getPublicUrl(filePath);

    return publicUrl;
  }, [supabase]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await handleImageUpload(imageFile);
      }

      const commentData: any = {
        goal_id: goalId,
        content: newComment.trim(),
        type: commentType,
        user_id: userId,
      };

      if (imageUrl) {
        commentData.image_url = imageUrl;
      }

      if (commentType === 'diary') {
        commentData.effort_points = effortPoints;
        commentData.challenges_faced = challengesFaced;
        commentData.personal_growth = personalGrowth;
      }

      const { error } = await supabase
        .from('goal_comments')
        .insert(commentData);

      if (error) throw error;

      // 管理者に通知を送信
      if (commentType === 'achievement' || commentType === 'diary') {
        await supabase.from('notifications').insert({
          user_id: 'admin_user_id', // 管理者のユーザーIDを設定
          actor_id: userId,
          type: 'achievement',
          goal_id: goalId,
          content: `新しい${commentType === 'achievement' ? '達成' : '日記'}が投稿されました`,
        });
      }

      setNewComment('');
      setImageFile(null);
      setEffortPoints('');
      setChallengesFaced('');
      setPersonalGrowth('');
      router.refresh();

      toast({
        title: "投稿完了",
        description: "コメントが投稿されました",
      });
    } catch (error) {
      console.error('コメント投稿エラー:', error);
      toast({
        title: "エラー",
        description: "投稿に失敗しました",
        variant: "destructive",
      });
    }
  }, [newComment, commentType, goalId, userId, imageFile, effortPoints, challengesFaced, personalGrowth, supabase, router, handleImageUpload, toast]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  }, []);

  return (
    <div className="space-y-4 mt-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <select
            value={commentType}
            onChange={(e) => setCommentType(e.target.value as any)}
            className="rounded border p-2"
          >
            <option value="achievement">達成コメント</option>
            <option value="diary">達成日記</option>
            <option value="advice">アドバイス</option>
            {isAdmin && <option value="admin_feedback">管理者フィードバック</option>}
          </select>
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={getCommentPlaceholder(commentType)}
            className="flex-1 rounded border p-2"
          />
        </div>

        {(commentType === 'achievement' || commentType === 'diary') && (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
          </div>
        )}

        {commentType === 'diary' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">がんばったこと</label>
              <textarea
                value={effortPoints}
                onChange={(e) => setEffortPoints(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">つらかったこと</label>
              <textarea
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">成長したこと</label>
              <textarea
                value={personalGrowth}
                onChange={(e) => setPersonalGrowth(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                rows={3}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark transition-colors"
        >
          投稿
        </button>
      </form>

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </div>
    </div>
  );
});

GoalComments.displayName = 'GoalComments';

// ユーティリティ関数
function getCommentBackgroundColor(type: string) {
  switch (type) {
    case 'achievement':
      return 'bg-green-50';
    case 'advice':
      return 'bg-blue-50';
    case 'diary':
      return 'bg-yellow-50';
    case 'admin_feedback':
      return 'bg-purple-50';
    default:
      return 'bg-gray-50';
  }
}

function getCommentTypeStyle(type: string) {
  switch (type) {
    case 'achievement':
      return 'bg-green-200 text-green-800';
    case 'advice':
      return 'bg-blue-200 text-blue-800';
    case 'diary':
      return 'bg-yellow-200 text-yellow-800';
    case 'admin_feedback':
      return 'bg-purple-200 text-purple-800';
    default:
      return 'bg-gray-200 text-gray-800';
  }
}

function getCommentTypeLabel(type: string) {
  switch (type) {
    case 'achievement':
      return '達成';
    case 'advice':
      return 'アドバイス';
    case 'diary':
      return '日記';
    case 'admin_feedback':
      return '管理者フィードバック';
    default:
      return type;
  }
}

function getCommentPlaceholder(type: string) {
  switch (type) {
    case 'achievement':
      return '達成した感想を共有しましょう';
    case 'advice':
      return 'アドバイスを書いてみましょう';
    case 'diary':
      return '達成までの道のりを記録しましょう';
    case 'admin_feedback':
      return '管理者からのフィードバックを入力してください';
    default:
      return 'コメントを入力してください';
  }
}

export default GoalComments; 