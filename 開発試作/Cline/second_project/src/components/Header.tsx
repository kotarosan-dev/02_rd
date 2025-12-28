import React from 'react';
import { Menu, User, LogOut, Settings } from 'lucide-react';
import supabase from '../../lib/supabase';
import { useUsers } from '../hooks/useUsers';

export function Header() {
    const { currentUser } = useUsers();

    const handleSignOut = async () => {
        if (!supabase) {
            console.error('Supabaseクライアントの初期化に失敗しました');
            return;
        }
        await supabase.auth.signOut();
    };

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Menu className="h-6 w-6 text-[#2c3e50]" />
                        <h1 className="ml-4 text-xl font-semibold text-[#2c3e50]">
                            諫早市 AI・ノーコード学習プラットフォーム
                        </h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <span className="mr-4 text-[#2c3e50]">{currentUser?.name}</span>
                        </div>
                        <button className="p-2 rounded-full hover:bg-gray-100" title="プロフィール設定">
                            <User className="h-5 w-5 text-[#2c3e50]" />
                        </button>
                        <button className="p-2 rounded-full hover:bg-gray-100" title="設定">
                            <Settings className="h-5 w-5 text-[#2c3e50]" />
                        </button>
                        <button
                            onClick={handleSignOut}
                            className="p-2 rounded-full hover:bg-gray-100"
                            title="ログアウト"
                        >
                            <LogOut className="h-5 w-5 text-[#2c3e50]" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}