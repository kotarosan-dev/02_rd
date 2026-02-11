import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { format, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Target, TrendingUp, Award, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ProgressData {
  date: string;
  confidence_score: number;
  beauty_score: number;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  target_date: string;
  progress: number;
  category: 'daily' | 'weekly' | 'monthly';
}

interface BeforeAfter {
  id: string;
  title: string;
  before_image: string;
  after_image: string;
  date: string;
  description: string;
}

export default function Progress() {
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [beforeAfter, setBeforeAfter] = useState<BeforeAfter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      fetchProgressData();
      fetchGoals();
      fetchBeforeAfter();
    }
  }, [user]);

  const fetchProgressData = async () => {
    // Demo data for progress chart
    const demoData: ProgressData[] = Array.from({ length: 7 }, (_, i) => ({
      date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
      confidence_score: 60 + Math.random() * 20,
      beauty_score: 65 + Math.random() * 20
    })).reverse();

    setProgressData(demoData);
  };

  const fetchGoals = async () => {
    // Demo data for goals
    const demoGoals: Goal[] = [
      {
        id: '1',
        title: 'スキンケアルーティン',
        description: '毎日の朝晩のスキンケアを継続する',
        target_date: '2024-03-31',
        progress: 80,
        category: 'daily'
      },
      {
        id: '2',
        title: '運動習慣',
        description: '週3回のヨガを継続する',
        target_date: '2024-03-31',
        progress: 60,
        category: 'weekly'
      },
      {
        id: '3',
        title: 'メイクスキル向上',
        description: '新しいメイクテクニックを3つマスターする',
        target_date: '2024-03-31',
        progress: 40,
        category: 'monthly'
      }
    ];

    setGoals(demoGoals);
  };

  const fetchBeforeAfter = async () => {
    // Demo data for before/after
    const demoBeforeAfter: BeforeAfter[] = [
      {
        id: '1',
        title: 'ヘアスタイルの変化',
        before_image: 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&h=300&fit=crop',
        after_image: 'https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=400&h=300&fit=crop',
        date: '2024-02-15',
        description: 'イメージチェンジで自信が持てるようになりました'
      },
      {
        id: '2',
        title: 'スキンケアの効果',
        before_image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=300&fit=crop',
        after_image: 'https://images.unsplash.com/photo-1601412436009-d964bd02edbc?w=400&h=300&fit=crop',
        date: '2024-01-30',
        description: '肌トラブルが改善され、明るい印象に'
      }
    ];

    setBeforeAfter(demoBeforeAfter);
    setLoading(false);
  };

  const chartData = {
    labels: progressData.map(d => format(new Date(d.date), 'M/d')),
    datasets: [
      {
        label: '自己肯定感スコア',
        data: progressData.map(d => d.confidence_score),
        borderColor: 'rgb(219, 39, 119)',
        backgroundColor: 'rgba(219, 39, 119, 0.5)',
      },
      {
        label: '美容目標達成度',
        data: progressData.map(d => d.beauty_score),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.5)',
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '成長の記録'
      }
    },
    scales: {
      y: {
        min: 0,
        max: 100
      }
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
      {/* Progress Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <TrendingUp className="h-6 w-6 text-pink-600" />
          <h2 className="text-2xl font-bold text-gray-900">プログレスチャート</h2>
        </div>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Goals */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-2 mb-6">
          <Target className="h-6 w-6 text-pink-600" />
          <h2 className="text-2xl font-bold text-gray-900">目標設定と進捗</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <div key={goal.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{goal.title}</h3>
                <span className="text-sm text-gray-500">{goal.category}</span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{goal.description}</p>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-pink-600 bg-pink-200">
                      進捗 {goal.progress}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-gray-600">
                      目標日: {format(new Date(goal.target_date), 'yyyy/MM/dd')}
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-pink-200">
                  <div
                    style={{ width: `${goal.progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-pink-600"
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Before/After Gallery */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Camera className="h-6 w-6 text-pink-600" />
          <h2 className="text-2xl font-bold text-gray-900">ビフォーアフター ギャラリー</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {beforeAfter.map((item) => (
            <div key={item.id} className="space-y-4">
              <h3 className="font-medium text-gray-900">{item.title}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-2">Before</p>
                  <img
                    src={item.before_image}
                    alt="Before"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">After</p>
                  <img
                    src={item.after_image}
                    alt="After"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">{item.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(item.date), 'yyyy年M月d日')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}