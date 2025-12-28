import React, { useState, useEffect } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, MessageSquare, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBooking } from '../hooks/useBooking';

export default function Booking() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { createBooking, checkAvailability, loading } = useBooking();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const availableDates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const availableTimes = generateTimeSlots();

  const handleNextStep = async () => {
    setError('');

    if (step === 1 && !selectedService) {
      setError('サービスを選択してください');
      return;
    }

    if (step === 2) {
      if (!selectedDate || !selectedTime) {
        setError('日時を選択してください');
        return;
      }

      const isAvailable = await checkAvailability(selectedDate, selectedTime);
      if (!isAvailable) {
        setError('選択された時間帯は既に予約が入っています');
        return;
      }
    }

    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handlePrevStep = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const handleBookingConfirmation = async () => {
    if (!user) {
      setError('予約にはログインが必要です');
      return;
    }

    try {
      const result = await createBooking({
        date: selectedDate,
        time: selectedTime,
        serviceId: selectedService,
        customerId: user.id
      });

      if (result) {
        navigate('/calendar', { 
          state: { 
            bookingSuccess: true,
            message: '予約が完了しました。確認メールをお送りしました。' 
          }
        });
      } else {
        setError('予約の作成に失敗しました。もう一度お試しください。');
      }
    } catch (err) {
      console.error('Booking confirmation error:', err);
      setError('予約の作成に失敗しました。もう一度お試しください。');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= stepNumber ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-24 h-1 mx-2 ${
                    step > stepNumber ? 'bg-pink-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          {error && (
            <div className="mb-6 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">サービスを選択</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`p-4 rounded-lg border-2 text-left ${
                      selectedService === service.id
                        ? 'border-pink-600 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {service.icon}
                      <div>
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        <p className="text-sm text-gray-500">{service.duration}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">日時を選択</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">日付</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {availableDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`p-2 rounded-lg text-center ${
                          isSameDay(selectedDate, date)
                            ? 'bg-pink-600 text-white'
                            : 'hover:bg-pink-50'
                        }`}
                      >
                        <div className="text-sm">{format(date, 'E', { locale: ja })}</div>
                        <div className="font-medium">{format(date, 'd')}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">時間</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-2 rounded-lg text-center ${
                          selectedTime === time
                            ? 'bg-pink-600 text-white'
                            : 'hover:bg-pink-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">予約内容の確認</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 text-gray-600">
                  <CalendarIcon className="h-5 w-5" />
                  <span>{format(selectedDate, 'yyyy年M月d日(E)', { locale: ja })}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <Clock className="h-5 w-5" />
                  <span>{selectedTime}</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600">
                  <MessageSquare className="h-5 w-5" />
                  <span>{services.find(s => s.id === selectedService)?.name}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {step > 1 && (
              <button
                onClick={handlePrevStep}
                className="px-6 py-2 text-pink-600 border-2 border-pink-600 rounded-lg hover:bg-pink-50"
              >
                戻る
              </button>
            )}
            <button
              onClick={step === 3 ? handleBookingConfirmation : handleNextStep}
              disabled={loading}
              className="px-6 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 ml-auto disabled:bg-pink-300 disabled:cursor-not-allowed"
            >
              {loading ? '処理中...' : step === 3 ? '予約を確定する' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const services = [
  {
    id: 'counseling',
    name: '無料カウンセリング',
    duration: '30分',
    icon: <MessageSquare className="h-6 w-6 text-pink-600" />
  },
  {
    id: 'cut',
    name: 'カット',
    duration: '60分',
    icon: <User className="h-6 w-6 text-pink-600" />
  },
  {
    id: 'color',
    name: 'カラー',
    duration: '120分',
    icon: <User className="h-6 w-6 text-pink-600" />
  },
  {
    id: 'treatment',
    name: 'トリートメント',
    duration: '60分',
    icon: <User className="h-6 w-6 text-pink-600" />
  }
];

function generateTimeSlots() {
  const times = [];
  for (let hour = 10; hour <= 19; hour++) {
    times.push(`${hour}:00`);
    if (hour !== 19) times.push(`${hour}:30`);
  }
  return times;
}