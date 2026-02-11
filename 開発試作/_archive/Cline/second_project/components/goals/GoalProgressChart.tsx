'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { GoalProgress } from '@/types/goal';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface GoalProgressChartProps {
  progress: GoalProgress[];
  targetValue: number;
}

export const GoalProgressChart: React.FC<GoalProgressChartProps> = ({
  progress,
  targetValue
}) => {
  // データを日付でソート
  const sortedProgress = [...progress].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // グラフ用のデータを整形
  const chartData = sortedProgress.map(p => ({
    date: format(new Date(p.recorded_at), 'MM/dd', { locale: ja }),
    progress: p.progress,
    target: targetValue
  }));

  return (
    <div className="w-full h-[300px] mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            label={{ value: '日付', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            label={{
              value: '進捗',
              angle: -90,
              position: 'insideLeft',
              offset: 10
            }}
          />
          <Tooltip
            formatter={(value: number) => [`${value}`, '値']}
            labelFormatter={(label) => `${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="progress"
            stroke="#8884d8"
            name="実績"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
          <Line
            type="monotone"
            dataKey="target"
            stroke="#82ca9d"
            name="目標"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GoalProgressChart; 