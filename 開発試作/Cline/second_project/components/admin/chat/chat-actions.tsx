import supabase from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function ChatActions({ chatId }: { chatId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteChat = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('chats')
        .delete()
        .match({ id: chatId });

      if (error) {
        throw error;
      }

      toast.success('Chat deleted successfully');
    } catch (error) {
      toast.error('Error deleting chat');
    } finally {
      setIsDeleting(false);
    }
  };
}