import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

export const CustomerChart = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: customers, error } = await supabase
        .from('customers')
        .select('created_at')
        .order('created_at');

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      // Process data for chart
      // ... existing code ...
    };

    fetchData();
  }, []);

  // ... existing code ...
};