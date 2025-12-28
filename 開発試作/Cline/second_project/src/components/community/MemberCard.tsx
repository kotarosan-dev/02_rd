import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import type { User } from '../../types';
import Image from 'next/image';

interface MemberCardProps {
  user: User;
}

export function MemberCard({ user }: MemberCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-4">
        {user.avatar ? (
          <div className="relative w-16 h-16">
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="rounded-full object-cover"
            />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#3498db] flex items-center justify-center text-white text-xl">
            {user.name.charAt(0)}
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-[#2c3e50]">{user.name}</h3>
          <p className="text-sm text-gray-500">{user.role}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <button className="w-full flex items-center justify-center px-4 py-2 bg-[#3498db] text-white rounded-md hover:bg-[#2980b9] transition-colors">
          <MessageSquare className="h-4 w-4 mr-2" />
          メッセージを送る
        </button>
        <button className="w-full flex items-center justify-center px-4 py-2 border border-[#3498db] text-[#3498db] rounded-md hover:bg-blue-50 transition-colors">
          <Mail className="h-4 w-4 mr-2" />
          メールを送る
        </button>
      </div>
    </div>
  );
}