export type PricingPlan = {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string[];
  is_popular?: boolean;
  created_at?: string;
  updated_at?: string;
}; 