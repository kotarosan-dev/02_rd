interface GoalSuggestion {
  title: string;
  description: string;
  targetValue: number;
  category: string;
  endDate: string;
}

export async function analyzeGoals(input: string): Promise<GoalSuggestion[]> {
  try {
    const response = await fetch('/api/goals/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      throw new Error('API request failed');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.goals;
  } catch (error) {
    console.error('Goal analysis error:', error);
    throw new Error('目標の分析に失敗しました');
  }
} 