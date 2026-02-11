import React, { useState, useEffect } from 'react';
import { Users, Calendar, MessageCircle, Settings, TrendingUp, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

interface DashboardStats {
  totalCustomers: number;
  monthlyBookings: number;
  dailyInquiries: number;
  monthlyRevenue: number;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  status: 'online' | 'offline';
  last_active: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    monthlyBookings: 0,
    dailyInquiries: 0,
    monthlyRevenue: 0
  });
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 顧客総数を取得
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // 今月の予約数を取得
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { count: bookingCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .gte('booking_date', startOfMonth.toISOString())
        .eq('status', 'confirmed');

      // 本日の問い合わせ数を取得
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: inquiryCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .gte('created_at', startOfDay.toISOString());

      // スタッフ一覧を取得
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff');

      setStats({
        totalCustomers: customerCount || 0,
        monthlyBookings: bookingCount || 0,
        dailyInquiries: inquiryCount || 0,
        monthlyRevenue: (bookingCount || 0) * 15000 // 仮の計算
      });

      if (staffData) {
        setStaffList(staffData.map(staff => ({
          id: staff.id,
          name: staff.display_name || '名称未設定',
          role: staff.staff_role || 'スタイリスト',
          status: staff.last_active ? 'online' : 'offline',
          last_active: staff.last_active
        })));
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/chat"
            className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            チャット管理
          </Link>
          <button
            className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            <Shield className="h-5 w-5 mr-2" />
            新規スタッフ登録
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={<Users className="h-6 w-6" />}
          title="総顧客数"
          value={stats.totalCustomers.toString()}
          trend="+12%"
        />
        <StatCard
          icon={<Calendar className="h-6 w-6" />}
          title="今月の予約数"
          value={stats.monthlyBookings.toString()}
          trend="+8%"
        />
        <StatCard
          icon={<MessageCircle className="h-6 w-6" />}
          title="本日の問い合わせ"
          value={stats.dailyInquiries.toString()}
          trend="+15%"
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6" />}
          title="月間売上"
          value={`¥${stats.monthlyRevenue.toLocaleString()}`}
          trend="+23%"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">スタッフ一覧</h2>
          <div className="space-y-4">
            {staffList.map((staff) => (
              <StaffCard key={staff.id} {...staff} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">システム設定</h2>
          <div className="space-y-4">
            {settings.map((setting) => (
              <SettingItem key={setting.id} {...setting} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, trend }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-pink-100 rounded-lg">
          {React.cloneElement(icon as React.ReactElement, {
            className: 'text-pink-600'
          })}
        </div>
        <span className="text-sm text-green-600 font-medium">{trend}</span>
      </div>
      <h3 className="text-gray-600 text-sm mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function StaffCard({ name, role, status, last_active }: Staff) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
          <span className="text-pink-600 font-medium">{name[0]}</span>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{name}</h4>
          <p className="text-sm text-gray-500">{role}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'online' ? 'bg-green-500' : 'bg-gray-300'
        }`} />
        <span className="text-sm text-gray-500">
          {status === 'online' ? 'オンライン' : 'オフライン'}
        </span>
      </div>
    </div>
  );
}

function SettingItem({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
      <div className="p-2 bg-pink-100 rounded-lg">
        {React.cloneElement(icon as React.ReactElement, {
          className: 'h-5 w-5 text-pink-600'
        })}
      </div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
}

const settings = [
  {
    id: 1,
    icon: <Settings />,
    title: "基本設定",
    description: "営業時間、定休日、料金設定"
  },
  {
    id: 2,
    icon: <Users />,
    title: "スタッフ管理",
    description: "スタッフの追加・編集・権限設定"
  },
  {
    id: 3,
    icon: <MessageCircle />,
    title: "自動応答設定",
    description: "AIチャットボットの設定"
  }
];