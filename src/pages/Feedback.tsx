import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Plus, Star, AlertCircle, Lightbulb, TrendingUp, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface Feedback {
  id: string;
  title: string;
  description: string;
  category: 'bug' | 'feature' | 'improvement' | 'general';
  rating: number;
  status: string;
  created_at: string;
}

const categories = [
  { value: 'bug', label: 'Bug Report', icon: AlertCircle, color: 'red' },
  { value: 'feature', label: 'Feature Request', icon: Lightbulb, color: 'blue' },
  { value: 'improvement', label: 'Improvement', icon: TrendingUp, color: 'green' },
  { value: 'general', label: 'General Feedback', icon: MessageCircle, color: 'purple' }
];

export const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general' as 'bug' | 'feature' | 'improvement' | 'general',
    rating: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    if (profile) {
      loadFeedback();
    }
  }, [profile]);

  const loadFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_feedback')
        .select('*')
        .eq('user_id', profile!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbackList(data || []);
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || formData.rating === 0) {
      addToast('Please fill in all fields and provide a rating', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('platform_feedback')
        .insert({
          user_id: profile!.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          rating: formData.rating
        });

      if (error) throw error;
      addToast('Feedback submitted successfully!', 'success');
      setShowModal(false);
      setFormData({ title: '', description: '', category: 'general', rating: 0 });
      loadFeedback();
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return cat ? cat.icon : MessageCircle;
  };

  const getCategoryColor = (category: string) => {
    const cat = categories.find(c => c.value === category);
    switch (cat?.color) {
      case 'red':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'blue':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'green':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'purple':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'reviewed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'resolved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'dismissed':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredFeedback = selectedCategory
    ? feedbackList.filter(f => f.category === selectedCategory)
    : feedbackList;

  const getCategoryStats = () => {
    return categories.map(cat => ({
      ...cat,
      count: feedbackList.filter(f => f.category === cat.value).length
    }));
  };

  return (
    <>
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Submit Feedback"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.value}
                    onClick={() => setFormData({ ...formData, category: cat.value as any })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.category === cat.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${formData.category === cat.value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {cat.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Title"
            placeholder="Brief summary of your feedback"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <Textarea
            label="Description"
            placeholder="Provide detailed feedback..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={5}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= formData.rating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
              className="flex-1"
            >
              Submit Feedback
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <div className="p-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3">
                <MessageSquare className="w-9 h-9 text-blue-600 dark:text-blue-500" />
                Feedback
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Help us improve API-Creator by sharing your feedback
              </p>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-5 h-5" />
              Submit Feedback
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {getCategoryStats().map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(selectedCategory === cat.value ? '' : cat.value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCategory === cat.value
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${selectedCategory === cat.value ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {cat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {cat.count}
                </p>
              </button>
            );
          })}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
            </CardContent>
          </Card>
        ) : filteredFeedback.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No Feedback Yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Be the first to share your thoughts and help us improve!
              </p>
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5" />
                Submit Feedback
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredFeedback.map(feedback => {
              const Icon = getCategoryIcon(feedback.category);
              return (
                <motion.div
                  key={feedback.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Icon className="w-5 h-5 text-gray-400" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {feedback.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {feedback.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(feedback.category)}`}>
                              {categories.find(c => c.value === feedback.category)?.label}
                            </span>
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(feedback.status)}`}>
                              {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                            </span>
                            <div className="flex gap-1">
                              {Array.from({ length: feedback.rating }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
