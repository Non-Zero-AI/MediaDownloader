import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Download, Music, FileText, Video, Link2, Loader2, Scissors, User, LogOut, Database, MessageSquare, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MediaEditor from './MediaEditor';
import Auth from './components/Auth';
import KnowledgeBase from './components/KnowledgeBase';
import AIChat from './components/AIChat';
import SettingsPage from './components/Settings';

interface DownloadState {
  url: string;
  type: 'video' | 'audio' | 'text';
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  voiceIsolation: boolean;
  fileUrl?: string;
  mediaInfo?: {
    title: string;
    duration: string;
    thumbnail: string;
  };
}

interface EditorState {
  isOpen: boolean;
  clipUrl?: string;
}

function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const navItems = [
    { path: '/', label: 'Downloader', icon: Download },
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

function DownloaderPage() {
  const { user, session } = useAuth();
  const [downloadState, setDownloadState] = useState<DownloadState>({
    url: '',
    type: 'video',
    status: 'idle',
    message: '',
    voiceIsolation: false
  });
  
  const [editorState, setEditorState] = useState<EditorState>({
    isOpen: false,
    clipUrl: undefined
  });

  const getApiUrl = () => {
    if (import.meta.env.DEV) {
      if (window.location.hostname.includes('replit.dev') || 
          window.location.hostname.includes('replit.app') ||
          window.location.hostname.includes('repl.co')) {
        return window.location.origin;
      }
      return 'http://localhost:3000';
    }
    return window.location.origin;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setDownloadState(prev => ({ ...prev, status: 'loading', message: '', fileUrl: undefined, mediaInfo: undefined }));
    
    try {
      const apiUrl = getApiUrl();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Add auth token if user is logged in
      if (user && session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${apiUrl}/api/process-media`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: downloadState.url,
          type: downloadState.type,
          voiceIsolation: downloadState.type === 'audio' ? downloadState.voiceIsolation : false,
          userId: user?.id, // Pass user ID to save to knowledge base
        }),
      });

      const data = await response.json();
      
      setDownloadState(prev => ({
        ...prev,
        status: data.success ? 'success' : 'error',
        message: data.message,
        fileUrl: data.fileUrl,
        mediaInfo: data.mediaInfo,
      }));
    } catch (error) {
      setDownloadState(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process media. Please try again.',
      }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-3">
            <Download className="w-10 h-10" />
            Media Downloader
          </h1>
          <p className="text-gray-300">
            Download videos, extract audio, or convert to text from various platforms
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-2">
                Media URL
              </label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="url"
                  id="url"
                  required
                  placeholder="https://youtube.com/watch?v=..."
                  value={downloadState.url}
                  onChange={(e) => setDownloadState(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Download Format
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { type: 'video', icon: Video, label: 'Video' },
                  { type: 'audio', icon: Music, label: 'Audio' },
                  { type: 'text', icon: FileText, label: 'Text' },
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDownloadState(prev => ({ ...prev, type: type as 'video' | 'audio' | 'text' }))}
                    className={`flex flex-col items-center justify-center p-4 rounded-lg border transition-all ${
                      downloadState.type === type
                        ? 'bg-purple-500 border-purple-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Isolation Option (only for Audio) */}
            {downloadState.type === 'audio' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="voiceIsolation"
                  checked={downloadState.voiceIsolation}
                  onChange={(e) => setDownloadState(prev => ({ ...prev, voiceIsolation: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 bg-white/5 border-white/10 rounded focus:ring-purple-500"
                />
                <label htmlFor="voiceIsolation" className="ml-2 text-sm font-medium">
                  Isolate vocals (remove background music)
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={downloadState.status === 'loading'}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloadState.status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {downloadState.type === 'text' ? 'Transcribing...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  {downloadState.type === 'text' ? 'Transcribe' : 'Download'}
                </>
              )}
            </button>

            {/* Status Message and Media Info */}
            {downloadState.message && (
              <div className={`p-4 rounded-lg ${
                downloadState.status === 'success' 
                  ? 'bg-green-500/20 text-green-200' 
                  : 'bg-red-500/20 text-red-200'
              }`}>
                {downloadState.status === 'success' && downloadState.fileUrl ? (
                  <div className="space-y-4">
                    {downloadState.mediaInfo && (
                      <div className="flex items-start gap-4">
                        {downloadState.mediaInfo.thumbnail && (
                          <img 
                            src={downloadState.mediaInfo.thumbnail} 
                            alt="Thumbnail"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{downloadState.mediaInfo.title}</h3>
                          <p className="text-sm opacity-80">Duration: {downloadState.mediaInfo.duration}s</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4">
                      <a 
                        href={downloadState.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:text-white transition-colors"
                      >
                        {downloadState.message}
                        <Download className="w-4 h-4" />
                      </a>
                      
                      {(downloadState.type === 'video' || downloadState.type === 'audio') && (
                        <button
                          onClick={() => setEditorState({ isOpen: true })}
                          className="mt-2 py-2 px-4 bg-white/10 rounded-lg flex items-center gap-2 hover:bg-white/20 transition-colors"
                        >
                          <Scissors className="w-4 h-4" />
                          Edit and Create Clip
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p>{downloadState.message}</p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Media Editor */}
        {editorState.isOpen && downloadState.fileUrl && downloadState.mediaInfo && (
          <div className="mt-8">
            <MediaEditor
              mediaUrl={downloadState.fileUrl}
              mediaType={downloadState.type as 'video' | 'audio'}
              mediaDuration={parseInt(downloadState.mediaInfo.duration)}
              onClipCreated={(clipUrl) => {
                setEditorState({ isOpen: false, clipUrl });
              }}
              onCancel={() => setEditorState({ isOpen: false })}
            />
          </div>
        )}
        
        {/* Clip Result */}
        {editorState.clipUrl && !editorState.isOpen && (
          <div className="mt-8 p-4 rounded-lg bg-green-500/20 text-green-200">
            <div className="space-y-4">
              <h3 className="font-medium">Clip Created Successfully!</h3>
              <a 
                href={editorState.clipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                Download your clip
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
          <Navigation />
          <Routes>
            <Route path="/" element={<DownloaderPage />} />
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
  );
}

export default App;
