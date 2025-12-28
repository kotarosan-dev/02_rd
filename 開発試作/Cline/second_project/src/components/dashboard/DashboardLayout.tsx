import React from 'react';
import { LayoutGrid, Users, Calendar, BookOpen, Award } from 'lucide-react';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
    const menuItems = [
        { icon: LayoutGrid, label: 'ダッシュボード', href: '/dashboard' },
        { icon: Calendar, label: 'イベント', href: '/dashboard/events' },
        { icon: BookOpen, label: '学習コンテンツ', href: '/dashboard/learning' },
        { icon: Award, label: 'プロジェクト', href: '/dashboard/projects' },
        { icon: Users, label: 'コミュニティ', href: '/dashboard/community' },
    ];

    return (
        <div className="flex h-screen bg-[#ecf0f1]">
            <Sidebar menuItems={menuItems} />
            <div className="flex-1 overflow-auto">
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}