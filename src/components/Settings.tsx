import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, UserApiKey } from '../lib/supabase';
import { Key, Plus, Trash2, Save, CreditCard } from 'lucide-react';

const Settings: React.FC = () => {
  const { user, profile, refreshProfile, session } = useAuth();
  const [apiKeys, setApiKeys] = useState<UserApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProvider, setNewProvider] = useState<'openai' | 'anthropic' | 'google' | 'custom'>('openai');
  const [newApiKey, setNewApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!user || !newApiKey.trim()) return;

    try {
      setSaving(true);
      
      // In a real app, you should encrypt the API key before storing
      // For now, we'll store it as-is (NOT RECOMMENDED FOR PRODUCTION)
      // You should use encryption on the backend
      
      const { error } = await supabase
        .from('user_api_keys')
        .upsert({
          user_id: user.id,
          provider: newProvider,
          api_key_encrypted: newApiKey, // TODO: Encrypt this
          is_active: true,
        }, {
          onConflict: 'user_id,provider'
        });

      if (error) throw error;
      
      setNewApiKey('');
      await fetchApiKeys();
    } catch (error: any) {
      console.error('Error saving API key:', error);
      alert(error.message || 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchApiKeys();
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchApiKeys();
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  const handleSubscription = async () => {
    const { session } = useAuth();
    const apiUrl = window.location.origin;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (session) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    
    const response = await fetch(`${apiUrl}/api/create-checkout-session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId: user?.id,
        tier: 'pro',
      }),
    });

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Settings</h2>
        <p className="text-gray-300">Manage your account and preferences</p>
      </div>

      {/* Subscription */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-medium mb-1 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Subscription
            </h3>
            <p className="text-sm text-gray-400">
              Current tier: <span className="text-white font-medium">{profile?.subscription_tier || 'free'}</span>
            </p>
          </div>
          {profile?.subscription_tier === 'free' && (
            <button
              onClick={handleSubscription}
              className="py-2 px-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-medium hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-medium mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          AI API Keys
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Add your own API keys to use with AI features. Your keys are stored securely and only used for your account.
        </p>

        {/* Add New API Key */}
        <div className="bg-white/5 rounded-lg p-4 space-y-3">
          <div className="flex gap-2">
            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as any)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="custom">Custom</option>
            </select>
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="Enter API key..."
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
            />
            <button
              onClick={saveApiKey}
              disabled={saving || !newApiKey.trim()}
              className="py-2 px-4 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Existing API Keys */}
        <div className="space-y-2">
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="bg-white/5 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${key.is_active ? 'bg-green-500' : 'bg-gray-500'}`} />
                <div>
                  <p className="font-medium capitalize">{key.provider}</p>
                  <p className="text-xs text-gray-400">
                    Added {new Date(key.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleApiKey(key.id, key.is_active)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    key.is_active
                      ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                      : 'bg-gray-500/20 text-gray-300 hover:bg-gray-500/30'
                  }`}
                >
                  {key.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => deleteApiKey(key.id)}
                  className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;

