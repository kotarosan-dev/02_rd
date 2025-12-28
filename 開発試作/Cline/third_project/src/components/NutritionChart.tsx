import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface NutritionData {
  calories?: number
  protein?: number
  fat?: number
  carbohydrates?: number
  fiber?: number
}

interface NutritionChartProps {
  data: NutritionData
}

const NutritionChart: React.FC<NutritionChartProps> = ({ data }) => {
  const chartData = {
    labels: ['カロリー(kcal)', 'タンパク質(g)', '脂質(g)', '炭水化物(g)', '食物繊維(g)'],
    datasets: [
      {
        label: '栄養成分値',
        data: [
          data.calories || 0,
          data.protein || 0,
          data.fat || 0,
          data.carbohydrates || 0,
          data.fiber || 0,
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: '栄養成分グラフ',
      },
    },
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <Bar data={chartData} options={options} />
    </div>
  )
}

export default NutritionChart
