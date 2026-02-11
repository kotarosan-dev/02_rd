import { NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // OpenAIクライアントを実行時に初期化
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { input } = await req.json();

    if (!input) {
      return new NextResponse('Input is required', { status: 400 });
    }

    const prompt = `
あなたは美容とセルフケアの専門家です。以下の目標や願望を、具体的で達成可能な小目標に分解し、ジャーニーマップを作成してください。
大きな目標を、より具体的で測定可能な複数の小目標に分けて提案してください。

入力: ${input}

以下の形式で応答してください：
{
  "goals": [
    {
      "title": "具体的な小目標のタイトル",
      "description": "目標の詳細な説明（具体的な行動計画を含む）",
      "category": "beauty",
      "recommendedPeriod": 4,
      "parentGoal": "この小目標が属する大きな目標のタイトル",
      "phase": "準備期間|実践期間|習慣化期間|目標達成期間",
      "order": 1
    }
  ],
  "journeyMap": {
    "phases": [
      {
        "name": "準備期間",
        "description": "この段階での主な取り組みと目標",
        "duration": "2週間",
        "milestones": ["重要なマイルストーン1", "重要なマイルストーン2"]
      },
      {
        "name": "実践期間",
        "description": "この段階での主な取り組みと目標",
        "duration": "4週間",
        "milestones": ["重要なマイルストーン1", "重要なマイルストーン2"]
      },
      {
        "name": "習慣化期間",
        "description": "この段階での主な取り組みと目標",
        "duration": "4週間",
        "milestones": ["重要なマイルストーン1", "重要なマイルストーン2"]
      },
      {
        "name": "目標達成期間",
        "description": "最終段階での仕上げと継続のための取り組み",
        "duration": "2週間",
        "milestones": ["重要なマイルストーン1", "重要なマイルストーン2"]
      }
    ],
    "totalDuration": "12週間",
    "expectedOutcome": "期待される最終的な成果"
  },
  "advice": "全体的なアドバイスと目標達成のためのヒント"
}

例えば「10kgの減量」という目標の場合、各フェーズで以下のような目標を設定します：

準備期間（2週間）:
- 現在の食生活を記録し分析
- 体重・体脂肪率の測定習慣化
- 運動計画の立案

実践期間（4週間）:
- カロリー制限の開始
- 週3回の運動習慣確立
- 食事内容の改善

習慣化期間（4週間）:
- 新しい食習慣の定着
- 運動強度の向上
- ストレス管理方法の確立

目標達成期間（2週間）:
- 最終調整
- 維持のための計画立案
- 成果の振り返り

のように、段階的な目標設定と実行計画を立ててください。
各小目標は、測定可能で具体的な成功基準を含むようにしてください。`;

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "美容とセルフケアの専門家として、ユーザーの目標を具体的なステップに分解し、JSON形式で応答してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Failed to generate response');
    }

    const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanResponse);
    } catch (error) {
      console.error('Failed to parse OpenAI response:', error);
      console.error('Response content:', cleanResponse);
      throw new Error('Invalid response format from AI');
    }

    if (!parsedResponse.goals || !Array.isArray(parsedResponse.goals)) {
      throw new Error('Invalid response format: goals array is missing');
    }

    // Supabaseに目標を保存
    const { data: goals, error } = await supabase
      .from('goals')
      .insert(
        parsedResponse.goals.map((goal: any) => ({
          user_id: user.id,
          title: goal.title,
          description: goal.description,
          category: goal.category,
          type: 'monthly',
          target_value: 100,
          status: 'active',
          end_date: new Date(Date.now() + goal.recommendedPeriod * 7 * 24 * 60 * 60 * 1000).toISOString()
        }))
      )
      .select();

    if (error) {
      console.error('Error saving goals:', error);
      throw error;
    }

    return NextResponse.json({
      goals: parsedResponse.goals,
      journeyMap: parsedResponse.journeyMap,
      advice: parsedResponse.advice
    });

  } catch (error) {
    console.error('Error in analyze route:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }
} 