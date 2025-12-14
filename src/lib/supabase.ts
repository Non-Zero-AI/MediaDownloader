import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
// For local development, these will be provided by Supabase CLI
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Types for our database
export interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string;
  created_at: string;
  updated_at: string;
}

export interface UserApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  api_key_encrypted: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MediaItem {
  id: string;
  user_id: string;
  title: string;
  source_url: string;
  media_type: 'video' | 'audio' | 'text';
  file_url: string | null;
  file_path: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Transcript {
  id: string;
  user_id: string;
  media_item_id: string | null;
  content: string;
  vtt_content: string | null;
  docx_file_url: string | null;
  language: string;
  transcription_method: 'whisper' | 'subtitles' | 'manual' | null;
  created_at: string;
  updated_at: string;
}

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string | null;
  context_media_ids: string[] | null;
  context_transcript_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

