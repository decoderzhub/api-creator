import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Trash2, Eye, EyeOff, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface APIKey {
  id: string;
  key_name: string;
  key_value: string;
  service_name: string;
  description: string;
  created_at: string;
}

const serviceOptions = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'github', label: 'GitHub' },
  { value: 'openweathermap', label: 'OpenWeatherMap' },
  { value: 'freesound', label: 'Freesound' },
  { value: 'cloudinary', label: 'Cloudinary' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'twilio', label: 'Twilio' },
  { value: 'custom', label: 'Custom Service' }
];

export const APIKeys = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [consumerApiKey, setConsumerApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingConsumerKey, setGeneratingConsumerKey] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState<APIKey | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [showConsumerKey, setShowConsumerKey] = useState(false);
  const [formData, setFormData] = useState({
    key_name: '',
    key_value: '',
    service_name: '',
    description: ''
  });
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchAPIKeys();
      fetchConsumerApiKey();
    }
  }, [profile]);

  const fetchAPIKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumerApiKey = async () => {
    try {
      const { data, error } = await supabase
        .from('consumer_api_keys')
        .select('api_key')
        .eq('user_id', profile!.id)
        .maybeSingle();

      if (error) throw error;
      setConsumerApiKey(data?.api_key || null);
    } catch (error: any) {
      console.error('Failed to fetch consumer API key:', error);
    }
  };

  const generateConsumerApiKey = async () => {
    setGeneratingConsumerKey(true);
    try {
      const apiKey = `ck_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

      const { data: existing } = await supabase
        .from('consumer_api_keys')
        .select('id')
        .eq('user_id', profile!.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('consumer_api_keys')
          .update({ api_key: apiKey })
          .eq('user_id', profile!.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('consumer_api_keys')
          .insert({ user_id: profile!.id, api_key: apiKey });

        if (error) throw error;
      }

      setConsumerApiKey(apiKey);
      addToast('Consumer API key generated successfully', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setGeneratingConsumerKey(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.key_name || !formData.key_value || !formData.service_name) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      if (editingKey) {
        const { error } = await supabase
          .from('user_api_keys')
          .update(formData)
          .eq('id', editingKey.id);

        if (error) throw error;
        addToast('API key updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('user_api_keys')
          .insert({
            ...formData,
            user_id: profile!.id
          });

        if (error) throw error;
        addToast('API key added successfully', 'success');
      }

      setShowModal(false);
      setEditingKey(null);
      setFormData({ key_name: '', key_value: '', service_name: '', description: '' });
      fetchAPIKeys();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      addToast('API key deleted successfully', 'success');
      fetchAPIKeys();
    } catch (error: any) {
      addToast(error.message, 'error');
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const openEditModal = (key: APIKey) => {
    setEditingKey(key);
    setFormData({
      key_name: key.key_name,
      key_value: key.key_value,
      service_name: key.service_name,
      description: key.description
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingKey(null);
    setFormData({ key_name: '', key_value: '', service_name: '', description: '' });
    setShowModal(true);
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingKey(null);
        }}
        title={editingKey ? 'Edit API Key' : 'Add New API Key'}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g., My OpenAI Key"
            value={formData.key_name}
            onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service
            </label>
            <select
              value={formData.service_name}
              onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a service</option>
              {serviceOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="API Key Value"
            type="password"
            placeholder="sk-..."
            value={formData.key_value}
            onChange={(e) => setFormData({ ...formData, key_value: e.target.value })}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="What will you use this key for?"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
          />

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              💡 How to use this key in your API
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              When generating an API, reference this key by name. For example: "Create an API that uses my {formData.key_name || '[Key Name]'} to generate text completions."
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSubmit} className="flex-1">
              <Save className="w-4 h-4" />
              {editingKey ? 'Update' : 'Add'} Key
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowModal(false);
                setEditingKey(null);
              }}
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3">
              <Key className="w-9 h-9 text-blue-600 dark:text-blue-500" />
              API Keys Management
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Store API keys to use in your generated APIs
            </p>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-5 h-5" />
            Add API Key
          </Button>
        </div>
      </motion.div>

      <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Consumer API Key</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Use this key to access marketplace APIs you've saved</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {consumerApiKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-800">
                <code className="flex-1 font-mono text-sm text-gray-900 dark:text-gray-100">
                  {showConsumerKey ? consumerApiKey : maskKey(consumerApiKey)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowConsumerKey(!showConsumerKey)}
                >
                  {showConsumerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(consumerApiKey);
                    addToast('Copied to clipboard!', 'success');
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={generateConsumerApiKey}
                disabled={generatingConsumerKey}
              >
                {generatingConsumerKey ? (
                  <>
                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Regenerate Key
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You don't have a consumer API key yet. Generate one to start using marketplace APIs.
              </p>
              <Button onClick={generateConsumerApiKey} disabled={generatingConsumerKey}>
                {generatingConsumerKey ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 mr-2" />
                    Generate Consumer API Key
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Third-Party Service Keys</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Store API keys from external services to use when generating your own APIs
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading API keys...</p>
          </CardContent>
        </Card>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              No API Keys Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Add your first API key to start using third-party services in your generated APIs
            </p>
            <Button onClick={openAddModal}>
              <Plus className="w-5 h-5" />
              Add Your First Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {apiKeys.map((key) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {key.key_name}
                        </h3>
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          {serviceOptions.find(s => s.value === key.service_name)?.label || key.service_name}
                        </span>
                      </div>
                      {key.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {key.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 font-mono text-sm bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                        <span className="text-gray-900 dark:text-gray-100">
                          {visibleKeys.has(key.id) ? key.key_value : maskKey(key.key_value)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Added {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(key.id)}
                      >
                        {visibleKeys.has(key.id) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(key)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(key.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
