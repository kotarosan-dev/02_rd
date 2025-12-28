import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUsers } from './hooks/useUsers';
import { AuthUI } from './components/auth/AuthUI';
import { Header } from './components/Header';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { EventManagement } from './components/events/EventManagement';
import { LearningContent } from './components/learning/LearningContent';
import { Projects } from './components/projects/Projects';
import { Community } from './components/community/Community';
import { useRouter } from 'next/navigation';

function App() {
  const { currentUser, loading } = useUsers();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/auth');
      } else {
        router.push('/mypage');
      }
    }
  }, [currentUser, loading, router]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  return null;
}

export default App;