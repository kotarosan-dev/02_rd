import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock, Calendar as CalendarIcon, CheckCircle, XCircle, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface BookingHistoryItem {
  id: string;
  booking_date: string;
  booking_time: string;
  service_id: string;
  status: string;
  customer_name: string;
  created_at: string;
}

export default function BookingHistory() {
  const [bookings, setBookings] = useState<BookingHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchBookingHistory();
  }, [user, navigate, isAdmin]);

  const fetchBookingHistory = async () => {
    try {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          service_id,
          status,
          customers (
            name
          ),
          created_at
        `)
        .order('booking_date', { ascending: true })
        .order('booking_time', { ascending: true });

      // 管理者でない場合は、自分の予約のみを表示
      if (!isAdmin) {
        const { data: customerData } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (customerData) {
          query = query.eq('customer_id', customerData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setBookings(data.map(booking => ({
        ...booking,
        customer_name: booking.customers?.name || '名称未設定'
      })));
    } catch (err) {
      console.error('Error fetching booking history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    const services: { [key: string]: string } = {
      counseling: '無料カウンセリング',
      cut: 'カット',
      color: 'カラー',
      treatment: 'トリートメント'
    };
    return services[serviceId] || serviceId;
  };

  const handleEditBooking = (bookingId: string) => {
    navigate(`/booking/edit/${bookingId}`);
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        {isAdmin ? '全予約履歴' : '予約履歴'}
      </h1>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      ) : bookings.length > 0 ? (
        <div className="space-y-6">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {booking.status === 'confirmed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`font-medium ${
                    booking.status === 'confirmed' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {booking.status === 'confirmed' ? '予約確定' : 'キャンセル済み'}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500">
                    予約日: {format(new Date(booking.created_at), 'yyyy/MM/dd HH:mm')}
                  </span>
                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => handleEditBooking(booking.id)}
                      className="flex items-center space-x-1 text-pink-600 hover:text-pink-700"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>変更</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">予約日時</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(booking.booking_date), 'yyyy年M月d日(E)', { locale: ja })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">時間</p>
                    <p className="font-medium text-gray-900">{booking.booking_time}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">予約内容</h3>
                    <p className="text-gray-600">{getServiceName(booking.service_id)}</p>
                  </div>
                  {isAdmin && (
                    <div className="text-right">
                      <p className="text-sm text-gray-500">予約者</p>
                      <p className="font-medium text-gray-900">{booking.customer_name}様</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">予約履歴がありません</p>
        </div>
      )}
    </div>
  );
}