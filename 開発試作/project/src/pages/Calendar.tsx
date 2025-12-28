import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface Appointment {
  id: string;
  booking_date: string;
  booking_time: string;
  service_id: string;
  customer_name: string;
  service_name: string;
  duration: string;
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  const weekStart = startOfWeek(selectedDate, { locale: ja });
  const weekDays = [...Array(7)].map((_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchAppointments();
  }, [user, selectedDate]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          booking_time,
          service_id,
          customers (
            name
          )
        `)
        .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'))
        .order('booking_time', { ascending: true });

      if (error) throw error;

      setAppointments(data.map(booking => ({
        id: booking.id,
        booking_date: booking.booking_date,
        booking_time: booking.booking_time,
        service_id: booking.service_id,
        customer_name: booking.customers?.name || '予約者',
        service_name: getServiceName(booking.service_id),
        duration: getServiceDuration(booking.service_id)
      })));
    } catch (err) {
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceName = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : 'その他';
  };

  const getServiceDuration = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    return service ? service.duration : '60分';
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">予約カレンダー</h1>
        {!isAdmin && (
          <Link
            to="/booking"
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
          >
            新規予約
          </Link>
        )}
      </div>

      <div className="flex justify-between items-center mb-8">
        <button 
          className="p-2 hover:bg-gray-100 rounded-full"
          onClick={() => setSelectedDate(addDays(selectedDate, -7))}
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </button>
        <span className="text-lg font-medium text-gray-900">
          {format(selectedDate, 'yyyy年M月', { locale: ja })}
        </span>
        <button 
          className="p-2 hover:bg-gray-100 rounded-full"
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
        >
          <ChevronRight className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-4 mb-4">
        {weekDays.map((day) => (
          <div
            key={day.toString()}
            className="text-center"
          >
            <div className="text-sm font-medium text-gray-500 mb-1">
              {format(day, 'E', { locale: ja })}
            </div>
            <button
              onClick={() => setSelectedDate(day)}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium ${
                isSameDay(day, selectedDate)
                  ? 'bg-pink-600 text-white'
                  : 'hover:bg-pink-50 text-gray-900'
              }`}
            >
              {format(day, 'd')}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {format(selectedDate, 'M月d日 (E)', { locale: ja })}の予約
        </h2>
        {loading ? (
          <div className="text-center py-4 text-gray-500">読み込み中...</div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <AppointmentCard key={appointment.id} {...appointment} />
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            予約はありません
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentCard({ id, booking_time, customer_name, service_name, duration }: {
  id: string;
  booking_time: string;
  customer_name: string;
  service_name: string;
  duration: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 min-w-[120px]">
          <Clock className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-900">{booking_time}</span>
        </div>
        <div>
          <h3 className="font-medium text-gray-900">{customer_name}様</h3>
          <p className="text-sm text-gray-500">
            {service_name} ({duration})
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate(`/booking/edit/${id}`)}
        className="text-pink-600 hover:text-pink-700 text-sm font-medium"
      >
        予約変更
      </button>
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