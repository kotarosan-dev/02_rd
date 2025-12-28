import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const generateAIResponse = async (message: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-0125-preview',
      messages: [
        {
          role: 'system',
          content: '美容師のアシスタントとして、丁寧で専門的なアドバイスを提供してください。'
        },
        {
          role: 'user',
          content: message
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('AIレスポンスの生成に失敗しました');
  }
};