import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Edit2, Award, Gift, Clock, MapPin, Phone } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface PointTransaction {
  id: string;
  points: number;
  description: string;
  transaction_type: 'earn' | 'spend';
  created_at: string;
}

export default function Profile() {
  const { user, profile, updateProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    phone_number: '',
    birth_date: '',
    address: ''
  });
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        phone_number: profile.phone_number || '',
        birth_date: profile.birth_date || '',
        address: profile.address || ''
      });
    }

    fetchPointHistory();
  }, [user, profile]);

  const fetchPointHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPointHistory(data);
    } catch (err) {
      console.error('Error fetching point history:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMembershipColor = (level: string) => {
    const colors = {
      basic: 'bg-gray-100 text-gray-600',
      silver: 'bg-gray-200 text-gray-700',
      gold: 'bg-yellow-100 text-yellow-700',
      platinum: 'bg-purple-100 text-purple-700'
    };
    return colors[level as keyof typeof colors] || colors.basic;
  };

  if (!profile) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">プロフィール</h2>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-pink-600 hover:text-pink-700 flex items-center space-x-1"
              >
                <Edit2 className="h-4 w-4" />
                <span>{isEditing ? 'キャンセル' : '編集'}</span>
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    表示名
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    生年月日
                  </label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    住所
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:bg-pink-300"
                  >
                    {loading ? '更新中...' : '保存'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">表示名</p>
                    <p className="font-medium text-gray-900">{profile.display_name || '未設定'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">電話番号</p>
                    <p className="font-medium text-gray-900">{profile.phone_number || '未設定'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">生年月日</p>
                    <p className="font-medium text-gray-900">{profile.birth_date || '未設定'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">住所</p>
                    <p className="font-medium text-gray-900">{profile.address || '未設定'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Membership Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">メンバーシップ</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                getMembershipColor(profile.membership_level)
              }`}>
                {profile.membership_level?.toUpperCase() || 'BASIC'}
              </span>
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <Award className="h-8 w-8 text-pink-600" />
              <div>
                <p className="text-sm text-gray-500">現在のポイント</p>
                <p className="text-2xl font-bold text-gray-900">{profile.points || 0} pt</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">ポイント履歴</h4>
              <div className="space-y-2">
                {pointHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center space-x-2">
                      <Gift className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">{transaction.description}</span>
                    </div>
                    <span className={`font-medium ${
                      transaction.transaction_type === 'earn'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'earn' ? '+' : '-'}
                      {transaction.points} pt
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}