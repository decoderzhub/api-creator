import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Calendar, Crown, Activity, Code, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface UserStats {
  total_apis: number;
  published_apis: number;
  total_views: number;
  avg_rating: number;
  total_reviews: number;
}

export const Profile = () => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState<UserStats>({
    total_apis: 0,
    published_apis: 0,
    total_views: 0,
    avg_rating: 0,
    total_reviews: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadUserStats();
    }
  }, [profile]);

  const loadUserStats = async () => {
    try {
      const [apisRes, viewsRes, reviewsRes] = await Promise.all([
        supabase
          .from('apis')
          .select('id, is_published')
          .eq('user_id', profile!.id),
        supabase
          .from('api_views')
          .select('id')
          .in('api_id', await getUserAPIIds()),
        supabase
          .from('api_reviews')
          .select('rating')
          .in('api_id', await getUserAPIIds())
      ]);

      const apis = apisRes.data || [];
      const views = viewsRes.data || [];
      const reviews = reviewsRes.data || [];

      const avgRating = reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

      setStats({
        total_apis: apis.length,
        published_apis: apis.filter(a => a.is_published).length,
        total_views: views.length,
        avg_rating: avgRating,
        total_reviews: reviews.length
      });
    } catch (error: any) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserAPIIds = async () => {
    const { data } = await supabase
      .from('apis')
      .select('id')
      .eq('user_id', profile!.id);
    return data?.map(a => a.id) || [];
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      case 'pro':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'enterprise':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3">
          <User className="w-9 h-9 text-blue-600 dark:text-blue-500" />
          My Profile
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Manage your account and view your statistics
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <User className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {profile?.email?.split('@')[0] || 'User'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <Mail className="w-4 h-4" />
                  <span>{profile?.email}</span>
                </div>
                <div className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2 ${getPlanColor(profile?.plan || 'free')}`}>
                  <Crown className="w-4 h-4" />
                  {profile?.plan?.toUpperCase() || 'FREE'} PLAN
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-4">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {new Date(profile?.created_at || '').toLocaleDateString()}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Account Details
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">API Generations</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {profile?.api_generation_count || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Monthly Limit</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {profile?.plan === 'free' ? '3' : profile?.plan === 'pro' ? '20' : 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => window.location.href = '/billing'}
              >
                Manage Subscription
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Statistics
                </h2>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Code className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.total_apis}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total APIs</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-6 border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.published_apis}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Published</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.total_views}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Views</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rating</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 rounded-xl p-6 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                          {stats.total_reviews}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Reviews</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Quick Actions
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/generate'}
                    className="w-full"
                  >
                    <Code className="w-5 h-5" />
                    Generate New API
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard'}
                    className="w-full"
                  >
                    <Activity className="w-5 h-5" />
                    View Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/marketplace'}
                    className="w-full"
                  >
                    <TrendingUp className="w-5 h-5" />
                    Browse Marketplace
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/api-keys'}
                    className="w-full"
                  >
                    <Code className="w-5 h-5" />
                    Manage API Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
