import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { AlertCircle } from 'lucide-react';
import { useBooking } from '../hooks/useBooking';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

interface BookingDetails {
  id: string;
  booking_date: string;
  booking_time: string;
  service_id: string;
  status: string;
}

export default function BookingEdit() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { updateBooking, checkAvailability, loading, error } = useBooking();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [updateError, setUpdateError] = useState<string>('');

  useEffect(() => {
    if (!user || !bookingId) {
      navigate('/login');
      return;
    }

    fetchBookingDetails();
  }, [bookingId, user]);

  const fetchBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      if (data) {
        setBooking(data);
        setSelectedDate(parseISO(data.booking_date));
        setSelectedTime(data.booking_time);
        setSelectedService(data.service_id);
      }
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setUpdateError('予約情報の取得に失敗しました');
    }
  };

  const handleUpdate = async () => {
    if (!selectedDate || !selectedTime || !selectedService) {
      setUpdateError('すべての項目を入力してください');
      return;
    }

    const isAvailable = await checkAvailability(selectedDate, selectedTime, bookingId);
    if (!isAvailable) {
      setUpdateError('選択された時間帯は既に予約が入っています');
      return;
    }

    const success = await updateBooking(bookingId!, {
      date: selectedDate,
      time: selectedTime,
      serviceId: selectedService
    });

    if (success) {
      navigate('/booking-history', {
        state: { message: '予約を更新しました' }
      });
    }
  };

  if (!booking) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">予約変更</h1>

        {(updateError || error) && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <p className="ml-3 text-sm text-red-700">{updateError || error}</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              サービス
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.duration})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              予約日
            </label>
            <input
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setSelectedDate(e.target.value ? parseISO(e.target.value) : null)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              時間
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
            >
              {timeSlots.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-4">
          <button
            onClick={() => navigate('/booking-history')}
            className="px-6 py-2 text-pink-600 border-2 border-pink-600 rounded-lg hover:bg-pink-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:bg-pink-300 disabled:cursor-not-allowed"
          >
            {loading ? '更新中...' : '予約を更新する'}
          </button>
        </div>
      </div>
    </div>
  );
}

const services = [
  {
    id: 'counseling',
    name: '無料カウンセリング',
    duration: '30分'
  },
  {
    id: 'cut',
    name: 'カット',
    duration: '60分'
  },
  {
    id: 'color',
    name: 'カラー',
    duration: '120分'
  },
  {
    id: 'treatment',
    name: 'トリートメント',
    duration: '60分'
  }
];

const timeSlots = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];