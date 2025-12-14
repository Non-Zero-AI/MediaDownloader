import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Download, User, LogOut, Database, MessageSquare, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import KnowledgeBase from './components/KnowledgeBase';
import AIChat from './components/AIChat';
import SettingsPage from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';


function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const navItems = [
    { path: '/knowledge-base', label: 'Knowledge Base', icon: Database },
    { path: '/chat', label: 'AI Chat', icon: MessageSquare },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-white/10 backdrop-blur-lg border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold">
              <Download className="w-6 h-6" />
              Media Downloader
            </Link>
            {user && (
              <div className="flex items-center gap-4">
                <Link
                  to="/dashboard"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    location.pathname === '/dashboard'
                      ? 'bg-purple-500/30 text-white'
                      : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Dashboard
                </Link>
                {navItems.map(({ path, label, icon: Icon }) => (
                  <Link
                    key={path}
                    to={path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      location.pathname === path
                        ? 'bg-purple-500/30 text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  <span className="text-gray-300">{user.email}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
      {showAuth && !user && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative">
            <button
              onClick={() => setShowAuth(false)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ×
            </button>
            <Auth onClose={() => setShowAuth(false)} />
          </div>
        </div>
      )}
    </nav>
  );
}


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function HomeRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <LandingPage />;
}

function App() {
  React.useEffect(() => {
    console.log('App mounted successfully');
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
            <Navigation />
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/knowledge-base"
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 py-8">
                      <KnowledgeBase />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 py-8">
                      <AIChat />
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <div className="container mx-auto px-4 py-8">
                      <SettingsPage />
                    </div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
