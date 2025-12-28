import React from 'react';
import { Activity } from 'lucide-react';

export function RecentActivity() {
  const activities = [
    {
      id: 1,
      user: '山田太郎',
      action: 'イベントに参加',
      target: 'AI基礎講座',
      time: '1時間前',
    },
    {
      id: 2,
      user: '佐藤花子',
      action: 'プロジェクトを作成',
      target: 'チャットボットアプリ',
      time: '3時間前',
    },
    {
      id: 3,
      user: '鈴木一郎',
      action: 'コースを完了',
      target: 'ノーコード入門',
      time: '5時間前',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-[#2c3e50] mb-4">最近のアクティビティ</h3>
      <div className="space-y-4">
        {activities.map(activity => (
          <div
            key={activity.id}
            className="flex items-start space-x-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Activity className="h-5 w-5 text-[#3498db] mt-1" />
            <div>
              <p className="text-[#2c3e50]">
                <span className="font-medium">{activity.user}</span>
                が
                <span className="text-[#3498db]">{activity.target}</span>
                {activity.action}しました
              </p>
              <p className="text-sm text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}