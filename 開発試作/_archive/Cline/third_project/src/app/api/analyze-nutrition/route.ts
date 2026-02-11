import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json()

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured')
    }

    // OpenAI APIにリクエストを送信
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '画像内の栄養成分表示を解析し、以下のJSON形式で返してください：\n' +
                      '{\n' +
                      '  "calories": number, // カロリー(kcal)\n' +
                      '  "protein": number, // タンパク質(g)\n' +
                      '  "fat": number, // 脂質(g)\n' +
                      '  "carbohydrates": number, // 炭水化物(g)\n' +
                      '  "fiber": number // 食物繊維(g)\n' +
                      '}'
              },
              {
                type: 'image_url',
                image_url: imageUrl
              }
            ]
          }
        ],
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error('OpenAI APIリクエストに失敗しました')
    }

    const data = await response.json()
    const content = data.choices[0].message.content

    // JSONとして解析可能な文字列を抽出
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('栄養成分データの解析に失敗しました')
    }

    const nutritionData = JSON.parse(jsonMatch[0])

    return NextResponse.json(nutritionData)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予期せぬエラーが発生しました' },
      { status: 500 }
    )
  }
}
