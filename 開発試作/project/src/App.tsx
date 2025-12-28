import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import AdminRoute from './components/AdminRoute';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminChat from './pages/admin/AdminChat';
import AdminLoginForm from './components/auth/AdminLoginForm';
import Chat from './pages/Chat';
import Calendar from './pages/Calendar';
import LoginForm from './components/auth/LoginForm';
import SignUpForm from './components/auth/SignUpForm';
import Booking from './pages/Booking';
import BookingEdit from './pages/BookingEdit';
import BookingHistory from './pages/BookingHistory';
import ServiceList from './pages/ServiceList';
import Profile from './pages/Profile';
import Blog from './pages/Blog';
import Progress from './pages/Progress';
import Community from './pages/Community';
import Learn from './pages/Learn';
import AIChatBot from './components/AIChatBot';

function App() {
  const { setUser, checkAdminStatus } = useAuthStore();

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, checkAdminStatus]);

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/admin/login" element={<AdminLoginForm />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/chat" element={
            <AdminRoute>
              <AdminChat />
            </AdminRoute>
          } />
          <Route path="/chat" element={<Chat />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/booking/edit/:bookingId" element={<BookingEdit />} />
          <Route path="/booking-history" element={<BookingHistory />} />
          <Route path="/services" element={<ServiceList />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/community" element={<Community />} />
          <Route path="/learn" element={<Learn />} />
        </Routes>
        <AIChatBot />
      </div>
    </Router>
  );
}

export default App;