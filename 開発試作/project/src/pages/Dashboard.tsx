import React from 'react';
import { useAuthStore } from '../store/authStore';
import { Calendar, MessageCircle, Users, Sparkles } from 'lucide-react';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        ようこそ、{user?.email?.split('@')[0]}さん
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardCard
          icon={<Calendar className="h-8 w-8 text-pink-600" />}
          title="本日の予約"
          value="3件"
          link="/calendar"
        />
        <DashboardCard
          icon={<MessageCircle className="h-8 w-8 text-pink-600" />}
          title="未読メッセージ"
          value="5件"
          link="/chat"
        />
        <DashboardCard
          icon={<Users className="h-8 w-8 text-pink-600" />}
          title="登録顧客数"
          value="42名"
          link="/customers"
        />
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">最近のアクティビティ</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="p-4 flex items-start space-x-4 border-b last:border-b-0"
            >
              <div className="bg-pink-100 rounded-full p-2">
                <Sparkles className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-gray-900">{activity.message}</p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, link }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  link: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        {icon}
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      <h3 className="text-lg font-medium text-gray-700">{title}</h3>
    </div>
  );
}

const activities = [
  {
    message: "山田様が新規予約を登録しました",
    time: "10分前"
  },
  {
    message: "佐藤様からメッセージが届いています",
    time: "30分前"
  },
  {
    message: "鈴木様の予約が確定しました",
    time: "1時間前"
  }
];