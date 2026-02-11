import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

interface StoryChapter {
  title: string;
  description: string;
  goals: {
    title: string;
    description: string;
    targetValue: number;
    category: string;
    endDate: string;
  }[];
  characters?: {
    role: string;
    description: string;
  }[];
}

interface StoryResponse {
  title: string;
  premise: string;
  chapters: StoryChapter[];
}

export async function POST(request: Request) {
  try {
    // OpenAIクライアントを実行時に初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { currentSituation, desiredOutcome } = await request.json();

    // サーバーサイド用のSupabaseクライアントを作成
    const supabase = createServerComponentClient({ cookies });

    // セッションの取得
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('セッションの取得に失敗しました');
    }

    if (!session?.user) {
      throw new Error('認証が必要です');
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, username')
      .eq('id', session.user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('プロフィールの取得に失敗しました');
    }

    const userName = profile?.full_name || profile?.username || '目標達成者';

    console.log('Generating story for user:', userName);

    const prompt = `
あなたは実践的な自己成長ストーリーを作成するエキスパートです。
ユーザーの現状と目指したい状態から、現実的で達成可能なストーリーを作成してください。
主人公の名前は「${userName}」です。

以下の形式でJSONを出力してください：

{
  "title": "物語全体のタイトル（実践的で現実的なもの）",
  "premise": "現状の詳細な分析と目標達成に向けた具体的なアプローチ",
  "chapters": [
    {
      "title": "章のタイトル（具体的なマイルストーン）",
      "description": "実践的なアクションプランと期待される成果",
      "goals": [
        {
          "title": "具体的な行動目標",
          "description": "詳細な実施手順と評価基準",
          "targetValue": 目標値（1-100の数値）,
          "category": "美容" | "健康" | "スキル" | "趣味" | "その他",
          "endDate": "YYYY-MM-DD形式の達成予定日（3ヶ月以内）"
        }
      ],
      "characters": [
        {
          "role": "支援者の役割（上司、同僚、家族など）",
          "description": "支援内容と関係性の説明"
        }
      ]
    }
  ]
}

以下の条件を満たすストーリーを生成してください：
1. 3-4章程度の現実的な長さ
2. 各章に1-2個の具体的で測定可能な目標を設定
3. 段階的な成長プロセスを重視
4. 現実の職場や生活環境に即した設定
5. 架空のキャラクターは最小限に抑え、実在する支援者を中心に設定
6. 各目標は3ヶ月以内に達成可能なスケール
7. すべての文章は日本語で記述

ユーザーの現状：
${currentSituation}

目指したい状態：
${desiredOutcome}
`;

    console.log('Calling OpenAI API...');

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "あなたは実践的な自己成長ストーリーを作成するエキスパートです。現実的で達成可能な目標を設定し、具体的なアクションプランを提案します。必ずJSON形式で応答してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
    });

    console.log('OpenAI API response received');

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('APIからの応答が空です');
    }

    try {
      const parsed = JSON.parse(response) as StoryResponse;
      console.log('Successfully parsed response');

      // ストーリーをSupabaseに保存
      const { data: story, error: storyError } = await supabase
        .from('stories')
        .insert({
          user_id: session.user.id,
          title: parsed.title,
          premise: parsed.premise,
          current_chapter: 0,
        })
        .select()
        .single();

      if (storyError) {
        console.error('Story insert error:', storyError);
        throw new Error('ストーリーの保存に失敗しました');
      }

      // 各チャプターを保存
      for (let i = 0; i < parsed.chapters.length; i++) {
        const chapter = parsed.chapters[i];
        
        // チャプターを保存
        const { data: savedChapter, error: chapterError } = await supabase
          .from('story_chapters')
          .insert({
            story_id: story.id,
            chapter_number: i,
            title: chapter.title,
            description: chapter.description,
          })
          .select()
          .single();

        if (chapterError) {
          console.error('Chapter insert error:', chapterError);
          throw new Error(`チャプター${i + 1}の保存に失敗しました`);
        }

        // キャラクターを保存
        if (chapter.characters) {
          for (const character of chapter.characters) {
            const { error: characterError } = await supabase
              .from('story_characters')
              .insert({
                chapter_id: savedChapter.id,
                role: character.role,
                description: character.description,
              });

            if (characterError) {
              console.error('Character insert error:', characterError);
              throw new Error('キャラクターの保存に失敗しました');
            }
          }
        }

        // 目標を保存
        for (const goal of chapter.goals) {
          const { data: savedGoal, error: goalError } = await supabase
            .from('goals')
            .insert({
              user_id: session.user.id,
              title: goal.title,
              description: goal.description,
              target_value: goal.targetValue,
              current_value: 0,
              category: goal.category,
              status: 'active',
              end_date: goal.endDate,
            })
            .select()
            .single();

          if (goalError) {
            console.error('Goal insert error:', goalError);
            throw new Error('目標の保存に失敗しました');
          }

          // 目標とチャプターを紐付け
          const { error: linkError } = await supabase
            .from('story_chapter_goals')
            .insert({
              chapter_id: savedChapter.id,
              goal_id: savedGoal.id,
            });

          if (linkError) {
            console.error('Goal link error:', linkError);
            throw new Error('目標の紐付けに失敗しました');
          }
        }
      }

      return NextResponse.json({
        ...parsed,
        id: story.id,
        current_chapter: 0,
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', response);
      throw new Error('AIの応答をJSONとして解析できませんでした');
    }
  } catch (error) {
    console.error('Error generating story:', error);
    return NextResponse.json(
      { error: 'ストーリーの生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
} 