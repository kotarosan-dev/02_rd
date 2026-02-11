export interface SalesOverviewData {
  totalSales: number;
  salesGrowth: number;
  totalAppointments: number;
  appointmentsGrowth: number;
  uniqueCustomers: number;
  customersGrowth: number;
  averageOrderValue: number;
  aovGrowth: number;
}

export interface SalesChartData {
  date: string;
  sales: number;
}

export interface SalesByServiceData {
  name: string;
  sales: number;
  count: number;
}

export interface SalesByStaffData {
  name: string;
  sales: number;
  count: number;
}