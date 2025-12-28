import React from 'react';
import { Users, Calendar, BookOpen, Award } from 'lucide-react';

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend?: string;
}

function StatCard({ icon, label, value, trend }: StatCardProps) {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
                <div className="text-[#3498db]">{icon}</div>
                {trend && (
                    <span className="text-sm text-[#2ecc71]">{trend}</span>
                )}
            </div>
            <p className="mt-4 text-2xl font-semibold text-[#2c3e50]">{value}</p>
            <p className="text-gray-500">{label}</p>
        </div>
    );
}

export function DashboardStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                icon={<Users className="h-6 w-6" />}
                label="総ユーザー数"
                value="156"
                trend="+12% 増加"
            />
            <StatCard
                icon={<Calendar className="h-6 w-6" />}
                label="今月のイベント"
                value="8"
                trend="先月比 +2"
            />
            <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                label="学習コンテンツ数"
                value="24"
            />
            <StatCard
                icon={<Award className="h-6 w-6" />}
                label="完了プロジェクト"
                value="47"
                trend="+5 今週"
            />
        </div>
    );
}