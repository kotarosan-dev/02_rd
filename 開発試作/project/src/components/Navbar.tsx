import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Scissors,
  MessageCircle,
  Calendar,
  Home,
  LogOut,
  Shield,
  History,
  UserCircle,
  Target,
  Users,
  BookOpen
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

function Navbar() {
  const { user, profile, isAdmin, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <Scissors className="h-8 w-8 text-pink-600" />
              <span className="text-xl font-semibold text-gray-900">BeautyConnect</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'text-pink-600' : ''}`}>
              <Home className="h-5 w-5" />
              <span>ホーム</span>
            </Link>

            {user && (
              <>
                {isAdmin ? (
                  // 管理者用メニュー
                  <>
                    <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'text-pink-600' : ''}`}>
                      <Shield className="h-5 w-5" />
                      <span>管理画面</span>
                    </Link>
                    <Link to="/booking-history" className={`nav-link ${location.pathname === '/booking-history' ? 'text-pink-600' : ''}`}>
                      <Calendar className="h-5 w-5" />
                      <span>予約状況</span>
                    </Link>
                  </>
                ) : (
                  // 一般ユーザー用メニュー
                  <>
                    <Link to="/booking" className={`nav-link ${location.pathname === '/booking' ? 'text-pink-600' : ''}`}>
                      <Calendar className="h-5 w-5" />
                      <span>予約</span>
                    </Link>
                    <Link to="/progress" className={`nav-link ${location.pathname === '/progress' ? 'text-pink-600' : ''}`}>
                      <Target className="h-5 w-5" />
                      <span>成長記録</span>
                    </Link>
                    <Link to="/community" className={`nav-link ${location.pathname === '/community' ? 'text-pink-600' : ''}`}>
                      <Users className="h-5 w-5" />
                      <span>コミュニティ</span>
                    </Link>
                    <Link to="/learn" className={`nav-link ${location.pathname === '/learn' ? 'text-pink-600' : ''}`}>
                      <BookOpen className="h-5 w-5" />
                      <span>学習</span>
                    </Link>
                  </>
                )}

                <Link to="/chat" className={`nav-link ${location.pathname === '/chat' ? 'text-pink-600' : ''}`}>
                  <MessageCircle className="h-5 w-5" />
                  <span>チャット</span>
                </Link>

                <div className="flex items-center space-x-4">
                  <Link to="/profile" className={`nav-link ${location.pathname === '/profile' ? 'text-pink-600' : ''}`}>
                    <UserCircle className="h-5 w-5" />
                    <span>{isAdmin ? '管理者' : profile?.display_name || 'ゲスト様'}</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-600 hover:text-pink-600 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              </>
            )}

            {!user && (
              <>
                <Link
                  to="/login"
                  className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  to="/signup"
                  className="bg-white text-pink-600 px-4 py-2 rounded-lg border-2 border-pink-600 hover:bg-pink-50 transition-colors"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;