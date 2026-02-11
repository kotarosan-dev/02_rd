import supabase from '@/lib/supabase';
import type { Service } from '@/types/service';

interface ServiceCardProps {
  service: Service;
  onDelete?: () => void;
}

export async function deleteService(service: Service) {
  try {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', service.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting service:', error);
    throw error;
  }
}

export const ServiceCard = ({ service, onDelete }: ServiceCardProps) => {
  // ... existing code ...
};