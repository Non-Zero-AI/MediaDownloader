import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, MediaItem, Transcript } from '../lib/supabase';
import { Video, Music, FileText, Trash2, Download, Search, MessageSquare } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
  const { user } = useAuth();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'video' | 'audio' | 'text'>('all');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch media items
      const { data: mediaData, error: mediaError } = await supabase
        .from('media_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (mediaError) throw mediaError;
      setMediaItems(mediaData || []);

      // Fetch transcripts
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (transcriptError) throw transcriptError;
      setTranscripts(transcriptData || []);
    } catch (error) {
      console.error('Error fetching knowledge base:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'media' | 'transcript') => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      if (type === 'media') {
        const { error } = await supabase
          .from('media_items')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setMediaItems(mediaItems.filter(item => item.id !== id));
      } else {
        const { error } = await supabase
          .from('transcripts')
          .delete()
          .eq('id', id);
        if (error) throw error;
        setTranscripts(transcripts.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const filteredMedia = mediaItems.filter(item => {
    const matchesType = selectedType === 'all' || item.media_type === selectedType;
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source_url.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredTranscripts = transcripts.filter(transcript => {
    if (selectedType !== 'all' && selectedType !== 'text') return false;
    return searchQuery === '' || 
      transcript.content.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold mb-2">Knowledge Base</h2>
        <p className="text-gray-300">Manage your downloaded media and transcripts</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your knowledge base..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'video', 'audio', 'text'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg transition-all ${
                selectedType === type
                  ? 'bg-purple-500 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Media Items */}
      {filteredMedia.length > 0 && (
        <div>
          <h3 className="text-xl font-medium mb-4">Media Items ({filteredMedia.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-4 space-y-3"
              >
                {item.thumbnail_url && (
                  <img
                    src={item.thumbnail_url}
                    alt={item.title}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h4 className="font-medium mb-1 line-clamp-2">{item.title}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    {item.media_type === 'video' && <Video className="w-4 h-4" />}
                    {item.media_type === 'audio' && <Music className="w-4 h-4" />}
                    {item.media_type === 'text' && <FileText className="w-4 h-4" />}
                    <span>{item.media_type}</span>
                    {item.duration && <span>• {Math.floor(item.duration / 60)}m</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{item.source_url}</p>
                </div>
                <div className="flex gap-2">
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(item.id, 'media')}
                    className="py-2 px-3 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transcripts */}
      {filteredTranscripts.length > 0 && (
        <div>
          <h3 className="text-xl font-medium mb-4">Transcripts ({filteredTranscripts.length})</h3>
          <div className="space-y-4">
            {filteredTranscripts.map((transcript) => (
              <div
                key={transcript.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                      <FileText className="w-4 h-4" />
                      <span>{transcript.transcription_method || 'transcript'}</span>
                      {transcript.language && <span>• {transcript.language}</span>}
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {transcript.content.substring(0, 200)}...
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(transcript.id, 'transcript')}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {transcript.docx_file_url && (
                  <a
                    href={transcript.docx_file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-2 px-3 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download DOCX
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 && filteredTranscripts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium mb-2">No items found</h3>
          <p className="text-gray-400">
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'Start downloading media to build your knowledge base'}
          </p>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

