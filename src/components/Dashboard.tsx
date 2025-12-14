import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, MediaItem } from '../lib/supabase';
import { Download, Video, Music, FileText, Link2, Loader2, Scissors, History, TrendingUp, Calendar, Zap, ExternalLink, Play } from 'lucide-react';
import MediaEditor from '../MediaEditor';

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

interface VideoMetadata {
  title: string;
  duration: number;
  thumbnail: string;
  description?: string;
  uploader?: string;
  viewCount?: number;
  uploadDate?: string;
}

const Dashboard: React.FC = () => {
  const { user, session, profile } = useAuth();
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

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [history, setHistory] = useState<MediaItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'download' | 'history'>('download');
  const [monthlyDownloads, setMonthlyDownloads] = useState(0);
  const [downloadsRemaining, setDownloadsRemaining] = useState(5);

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchMonthlyDownloads();
    }
  }, [user]);

  useEffect(() => {
    // Fetch metadata when URL changes (debounced)
    const timeoutId = setTimeout(() => {
      if (downloadState.url && isValidYouTubeUrl(downloadState.url)) {
        fetchMetadata(downloadState.url);
      } else {
        setMetadata(null);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [downloadState.url]);

  const isValidYouTubeUrl = (url: string): boolean => {
    const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return pattern.test(url);
  };

  const fetchMetadata = async (url: string) => {
    setMetadataLoading(true);
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/video-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        const data = await response.json();
        setMetadata(data);
      } else {
        setMetadata(null);
      }
    } catch (error) {
      console.error('Error fetching metadata:', error);
      setMetadata(null);
    } finally {
      setMetadataLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      const { data, error } = await supabase
        .from('media_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchMonthlyDownloads = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { count, error } = await supabase
        .from('media_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      if (error) throw error;
      
      const downloads = count || 0;
      setMonthlyDownloads(downloads);
      
      // Calculate remaining downloads for free users
      if (profile?.subscription_tier === 'free') {
        setDownloadsRemaining(Math.max(0, 5 - downloads));
      } else {
        setDownloadsRemaining(999); // Unlimited for pro users
      }
    } catch (error) {
      console.error('Error fetching monthly downloads:', error);
    }
  };

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
    
    // Check download limit for free users
    if (profile?.subscription_tier === 'free' && downloadsRemaining <= 0) {
      setDownloadState(prev => ({
        ...prev,
        status: 'error',
        message: 'You have reached your monthly download limit. Upgrade to Pro for unlimited downloads!',
      }));
      return;
    }
    
    setDownloadState(prev => ({ ...prev, status: 'loading', message: '', fileUrl: undefined, mediaInfo: undefined }));
    
    try {
      const apiUrl = getApiUrl();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
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
          userId: user?.id,
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

      // Refresh history and download count after successful download
      if (data.success) {
        await fetchHistory();
        await fetchMonthlyDownloads();
      }
    } catch (error) {
      setDownloadState(prev => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process media. Please try again.',
      }));
    }
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Subscription</h3>
            <Zap className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold capitalize">{profile?.subscription_tier || 'free'}</p>
          {profile?.subscription_tier === 'free' && (
            <p className="text-sm text-gray-400 mt-1">Upgrade for unlimited downloads</p>
          )}
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">This Month</h3>
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold">{monthlyDownloads}</p>
          <p className="text-sm text-gray-400 mt-1">downloads</p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-400">Remaining</h3>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold">
            {profile?.subscription_tier === 'pro' ? '∞' : downloadsRemaining}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {profile?.subscription_tier === 'pro' ? 'Unlimited' : 'downloads left'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-white/10">
        <button
          onClick={() => setActiveTab('download')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'download'
              ? 'border-purple-400 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Download
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium transition-colors border-b-2 ${
            activeTab === 'history'
              ? 'border-purple-400 text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 inline-block mr-2" />
          History
        </button>
      </div>

      {/* Download Tab */}
      {activeTab === 'download' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Download Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
              <h2 className="text-2xl font-bold mb-6">Download Media</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* URL Input */}
                <div>
                  <label htmlFor="url" className="block text-sm font-medium mb-2">
                    YouTube URL
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
                      className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
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

                {/* Voice Isolation Option */}
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
                  disabled={downloadState.status === 'loading' || (profile?.subscription_tier === 'free' && downloadsRemaining <= 0)}
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

                {/* Status Message */}
                {downloadState.message && (
                  <div className={`p-4 rounded-lg ${
                    downloadState.status === 'success' 
                      ? 'bg-green-500/20 text-green-200' 
                      : 'bg-red-500/20 text-red-200'
                  }`}>
                    {downloadState.status === 'success' && downloadState.fileUrl ? (
                      <div className="space-y-4">
                        <a 
                          href={downloadState.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 hover:text-white transition-colors"
                        >
                          {downloadState.message}
                          <ExternalLink className="w-4 h-4" />
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
                    ) : (
                      <p>{downloadState.message}</p>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* Media Editor */}
            {editorState.isOpen && downloadState.fileUrl && downloadState.mediaInfo && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
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
          </div>

          {/* Metadata Preview */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10 sticky top-4">
              <h3 className="text-lg font-bold mb-4">Video Preview</h3>
              
              {metadataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              ) : metadata ? (
                <div className="space-y-4">
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800">
                    <img 
                      src={metadata.thumbnail} 
                      alt={metadata.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white opacity-80" />
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2 line-clamp-2">{metadata.title}</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      {metadata.uploader && (
                        <p><span className="font-medium">Channel:</span> {metadata.uploader}</p>
                      )}
                      {metadata.duration && (
                        <p><span className="font-medium">Duration:</span> {formatDuration(metadata.duration)}</p>
                      )}
                      {metadata.viewCount && (
                        <p><span className="font-medium">Views:</span> {metadata.viewCount.toLocaleString()}</p>
                      )}
                      {metadata.uploadDate && (
                        <p><span className="font-medium">Uploaded:</span> {new Date(metadata.uploadDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : downloadState.url ? (
                <div className="text-center py-12 text-gray-400">
                  <p>Enter a valid YouTube URL to see preview</p>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Video metadata will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/10">
          <h2 className="text-2xl font-bold mb-6">Download History</h2>
          
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No downloads yet. Start downloading to see your history here!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => {
                const Icon = item.media_type === 'video' ? Video : item.media_type === 'audio' ? Music : FileText;
                return (
                  <div
                    key={item.id}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-purple-400/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {item.thumbnail_url ? (
                        <img 
                          src={item.thumbnail_url} 
                          alt={item.title}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 truncate">{item.title}</h3>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-2">
                          <span className="capitalize">{item.media_type}</span>
                          {item.duration && (
                            <span>{formatDuration(item.duration)}</span>
                          )}
                          {item.file_size && (
                            <span>{formatFileSize(item.file_size)}</span>
                          )}
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                        {item.file_url && (
                          <a
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
