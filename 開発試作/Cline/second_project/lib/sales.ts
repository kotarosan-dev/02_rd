import { startOfDay, endOfDay, subDays, startOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { SalesByStaffData } from '@/types/sales';
import type { Database } from '@/types/supabase';
import supabase from './supabase';

type Tables = Database['public']['Tables'];
type Service = Tables['services']['Row'];
type Staff = Tables['staff']['Row'];

interface AppointmentWithService {
  id: string;
  user_id: string;
  start_time: string;
  service: {
    price: number;
  } | null;
}

interface RawAppointmentData {
  id: string;
  user_id: string;
  start_time: string;
  service: {
    price: number;
  }[];
}

interface ServiceResponse {
  service: {
    id: string;
    name: string;
    price: number;
  };
}

interface StaffResponse {
  staff: {
    id: string;
    name: string;
  };
  service: {
    price: number;
  };
}

type SalesChartData = {
  date: string;
  sales: number;
};

type ServiceSalesData = {
  name: string;
  sales: number;
  count: number;
};

type StaffSalesData = {
  name: string;
  sales: number;
  count: number;
};

export async function getSalesChart(period: "daily" | "weekly" | "monthly") {
  try {
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;

    switch (period) {
      case "daily":
        startDate = subDays(now, 7);
        dateFormat = "M/d";
        break;
      case "weekly":
        startDate = subDays(now, 28);
        dateFormat = "M/d";
        break;
      case "monthly":
        startDate = subDays(now, 180);
        dateFormat = "yyyy/M";
        break;
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        start_time,
        service:service_id (
          price
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    const salesByDate = (data as unknown as AppointmentWithService[])?.reduce((acc: Record<string, number>, appointment) => {
      const date = format(new Date(appointment.start_time), dateFormat, { locale: ja });
      acc[date] = (acc[date] || 0) + (appointment.service?.price || 0);
      return acc;
    }, {});

    const chartData = Object.entries(salesByDate || {})
      .map(([date, sales]) => ({ date, sales }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { data: chartData as SalesChartData[], error: null };
  } catch (error) {
    console.error('Error in getSalesChart:', error);
    return { data: [], error };
  }
}

export async function getSalesByService(period: "daily" | "weekly" | "monthly") {
  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = startOfDay(now);
        break;
      case "weekly":
        startDate = startOfWeek(now, { locale: ja });
        break;
      case "monthly":
        startDate = startOfMonth(now);
        break;
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        service:service_id (
          id,
          name,
          price
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    const salesByService = (data as unknown as ServiceResponse[])?.reduce((acc: Record<string, ServiceSalesData>, appointment) => {
      const service = appointment.service;
      if (!service) return acc;

      if (!acc[service.id]) {
        acc[service.id] = {
          name: service.name,
          sales: 0,
          count: 0
        };
      }
      acc[service.id].sales += service.price;
      acc[service.id].count += 1;
      return acc;
    }, {});

    const sortedData = Object.values(salesByService || {})
      .sort((a, b) => b.sales - a.sales);

    return { data: sortedData, error: null };
  } catch (error) {
    console.error('Error in getSalesByService:', error);
    return { data: [], error };
  }
}

export async function getSalesByStaff(period: "daily" | "weekly" | "monthly") {
  try {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "daily":
        startDate = startOfDay(now);
        break;
      case "weekly":
        startDate = startOfWeek(now, { locale: ja });
        break;
      case "monthly":
        startDate = startOfMonth(now);
        break;
    }

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        staff:staff_id (
          id,
          name
        ),
        service:service_id (
          price
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'completed');

    if (error) throw error;

    const salesByStaff = (data as unknown as StaffResponse[])?.reduce((acc: Record<string, StaffSalesData>, appointment) => {
      const staff = appointment.staff;
      if (!staff) return acc;

      if (!acc[staff.id]) {
        acc[staff.id] = {
          name: staff.name,
          sales: 0,
          count: 0
        };
      }
      acc[staff.id].sales += appointment.service?.price || 0;
      acc[staff.id].count += 1;
      return acc;
    }, {});

    const sortedData = Object.values(salesByStaff || {})
      .sort((a, b) => b.sales - a.sales);

    return { data: sortedData, error: null };
  } catch (error) {
    console.error('Error in getSalesByStaff:', error);
    return { data: [], error };
  }
}

export async function getSalesOverview(period: "daily" | "weekly" | "monthly") {
  try {
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case "daily":
        startDate = startOfDay(now);
        previousStartDate = subDays(startDate, 1);
        previousEndDate = startDate;
        break;
      case "weekly":
        startDate = startOfWeek(now, { locale: ja });
        previousStartDate = subDays(startDate, 7);
        previousEndDate = startDate;
        break;
      case "monthly":
        startDate = startOfMonth(now);
        previousStartDate = subDays(startDate, 30);
        previousEndDate = startDate;
        break;
    }

    // 現在期間のデータを取得
    const { data: currentData, error: currentError } = await supabase
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time,
        service:service_id (
          price
        )
      `)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', now.toISOString())
      .eq('status', 'completed');

    if (currentError) throw currentError;

    // 前期間のデータを取得
    const { data: previousData, error: previousError } = await supabase
      .from('appointments')
      .select(`
        id,
        user_id,
        start_time,
        service:service_id (
          price
        )
      `)
      .gte('start_time', previousStartDate.toISOString())
      .lt('start_time', previousEndDate.toISOString())
      .eq('status', 'completed');

    if (previousError) throw previousError;

    // データの変換
    const convertAppointments = (data: RawAppointmentData[]): AppointmentWithService[] => {
      return data.map(appointment => ({
        ...appointment,
        service: appointment.service[0] || null
      }));
    };

    // 現在期間の集計
    const currentAppointments = convertAppointments(currentData as RawAppointmentData[]);
    const currentSales = currentAppointments.reduce((sum, appointment) => 
      sum + (appointment.service?.price || 0), 0);
    const currentCustomers = new Set(currentAppointments.map(a => a.user_id)).size;
    const currentAOV = currentAppointments.length > 0 ? currentSales / currentAppointments.length : 0;

    // 前期間の集計
    const previousAppointments = convertAppointments(previousData as RawAppointmentData[]);
    const previousSales = previousAppointments.reduce((sum, appointment) => 
      sum + (appointment.service?.price || 0), 0);
    const previousCustomers = new Set(previousAppointments.map(a => a.user_id)).size;
    const previousAOV = previousAppointments.length > 0 ? previousSales / previousAppointments.length : 0;

    // 成長率の計算
    const calculateGrowth = (current: number, previous: number) => 
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      data: {
        totalSales: currentSales,
        salesGrowth: calculateGrowth(currentSales, previousSales),
        totalAppointments: currentAppointments.length,
        appointmentsGrowth: calculateGrowth(currentAppointments.length, previousAppointments.length),
        uniqueCustomers: currentCustomers,
        customersGrowth: calculateGrowth(currentCustomers, previousCustomers),
        averageOrderValue: currentAOV,
        aovGrowth: calculateGrowth(currentAOV, previousAOV)
      },
      error: null
    };
  } catch (error) {
    console.error('Error in getSalesOverview:', error);
    return { data: null, error };
  }
}