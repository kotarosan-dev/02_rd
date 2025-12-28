import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface SidebarProps {
    menuItems: {
        icon: LucideIcon;
        label: string;
        href: string;
    }[];
}

export function Sidebar({ menuItems }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();

    const handleNavigation = useCallback((href: string) => {
        navigate(href);
    }, [navigate]);

    return (
        <aside className="w-64 bg-white shadow-md">
            <div className="p-4">
                <h2 className="text-lg font-semibold text-[#2c3e50]">管理パネル</h2>
            </div>
            <nav className="mt-4">
                {menuItems.map((item) => (
                    <button
                        key={item.href}
                        onClick={() => handleNavigation(item.href)}
                        className={`w-full flex items-center px-4 py-3 text-[#2c3e50] hover:bg-[#3498db] hover:text-white transition-colors ${
                            location.pathname === item.href ? 'bg-[#3498db] text-white' : ''
                        }`}
                    >
                        <item.icon className="h-5 w-5 mr-3" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}