import supabase from '@/lib/supabase';
import { useEffect, useState } from 'react'

// ... existing code ...

export default function AnalyticsOverview() {
  const [data, setData] = useState<any[] | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const result = await supabase.from('table').select()
      setData(result.data)
    }
    fetchData()
  }, [])

  // ... existing code ...
}