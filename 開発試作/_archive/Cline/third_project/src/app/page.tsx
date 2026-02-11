'use client'

import { useState } from 'react'
import Camera from '@/components/Camera'
import NutritionChart from '@/components/NutritionChart'
import { supabase } from '@/lib/supabase'

interface NutritionData {
  calories?: number
  protein?: number
  fat?: number
  carbohydrates?: number
  fiber?: number
}

export default function Home() {
  const [nutritionData, setNutritionData] = useState<NutritionData>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleImageCapture = async (imageData: string) => {
    try {
      setIsProcessing(true)
      setError(null)

      // 画像をSupabaseのStorageにアップロード
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('food-images')
        .upload(`image-${Date.now()}.jpg`, base64ToBlob(imageData), {
          contentType: 'image/jpeg',
        })

      if (uploadError) throw new Error('画像のアップロードに失敗しました')

      // OpenAI APIを使用して栄養成分を解析
      const response = await fetch('/api/analyze-nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/food-images/${uploadData.path}`,
        }),
      })

      if (!response.ok) throw new Error('栄養成分の解析に失敗しました')

      const data = await response.json()
      setNutritionData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const base64ToBlob = (base64: string) => {
    const byteString = atob(base64.split(',')[1])
    const mimeString = base64.split(',')[0].split(':')[1].split(';')[0]
    const ab = new ArrayBuffer(byteString.length)
    const ia = new Uint8Array(ab)
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i)
    }

    return new Blob([ab], { type: mimeString })
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        食品栄養成分管理システム
      </h1>

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Camera onCapture={handleImageCapture} />
        </div>

        {isProcessing && (
          <div className="text-center mb-8">
            <p className="text-gray-600">栄養成分を解析中...</p>
          </div>
        )}

        {error && (
          <div className="text-center mb-8">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {Object.keys(nutritionData).length > 0 && (
          <div className="mb-8">
            <NutritionChart data={nutritionData} />
          </div>
        )}
      </div>
    </main>
  )
}
