import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, ChatConversation, ChatMessage } from '../lib/supabase';
import { Send, Loader2, Trash2, Plus, MessageSquare } from 'lucide-react';

const AIChat: React.FC = () => {
  const { user, session } = useAuth();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const createConversation = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation',
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentConversation(data);
      setMessages([]);
      await fetchConversations();
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentConversation || !user) return;

    const userMessage = input.trim();
    setInput('');
    setSending(true);

    try {
      // Save user message
      const { data: userMsg, error: userMsgError } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: currentConversation.id,
          role: 'user',
          content: userMessage,
        })
        .select()
        .single();

      if (userMsgError) throw userMsgError;
      setMessages([...messages, userMsg]);

      // Get user's API key (for now, we'll use a placeholder - you'll need to implement API key retrieval)
      // For now, we'll make a request to the backend which will handle the AI call
      const apiUrl = window.location.origin;
      const { session } = useAuth();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (session) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
      
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conversationId: currentConversation.id,
          message: userMessage,
          contextMediaIds: currentConversation.context_media_ids || [],
          contextTranscriptIds: currentConversation.context_transcript_ids || [],
        }),
      });

      const data = await response.json();

      if (data.success && data.message) {
        // Save assistant message
        const { data: assistantMsg, error: assistantMsgError } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: currentConversation.id,
            role: 'assistant',
            content: data.message,
            metadata: data.metadata || null,
          })
          .select()
          .single();

        if (assistantMsgError) throw assistantMsgError;
        setMessages([...messages, userMsg, assistantMsg]);

        // Update conversation
        await supabase
          .from('chat_conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentConversation.id);
      } else {
        throw new Error(data.message || 'Failed to get response');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }

      await fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-200px)] gap-4">
      {/* Sidebar */}
      <div className="w-64 bg-white/10 backdrop-blur-lg rounded-xl p-4 space-y-4">
        <button
          onClick={createConversation}
          className="w-full py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setCurrentConversation(conv)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                currentConversation?.id === conv.id
                  ? 'bg-purple-500/30'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {conv.title || 'Untitled Conversation'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white/10 backdrop-blur-lg rounded-xl p-4 flex flex-col">
        {currentConversation ? (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400">Start a conversation with your AI assistant</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-purple-500/30'
                          : 'bg-white/5'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/5 rounded-lg p-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 py-2 px-4 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                disabled={sending}
              />
              <button
                onClick={sendMessage}
                disabled={sending || !input.trim()}
                className="py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium flex items-center justify-center gap-2 hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-400">Select a conversation or create a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChat;

