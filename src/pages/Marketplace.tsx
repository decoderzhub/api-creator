import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, TrendingUp, Eye, MessageSquare, User, Calendar, Code, ExternalLink, X, Plus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';

interface MarketplaceAPI {
  id: string;
  name: string;
  about: string;
  endpoint_url: string;
  user_id: string;
  created_at: string;
  code_snapshot: string;
  users?: {
    email: string;
  };
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  users?: {
    email: string;
  };
}

export const Marketplace = () => {
  const [apis, setApis] = useState<MarketplaceAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAPI, setSelectedAPI] = useState<MarketplaceAPI | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [viewCount, setViewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingAPI, setSavingAPI] = useState(false);
  const { profile } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    loadMarketplaceAPIs();
  }, []);

  useEffect(() => {
    if (selectedAPI) {
      loadAPIDetails(selectedAPI.id);
      checkIfSaved(selectedAPI.id);
    }
  }, [selectedAPI]);

  const loadMarketplaceAPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('apis')
        .select('*, users(email)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApis(data || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load marketplace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAPIDetails = async (apiId: string) => {
    try {
      const [reviewsRes, viewsRes] = await Promise.all([
        supabase
          .from('api_reviews')
          .select('*, users(email)')
          .eq('api_id', apiId)
          .order('created_at', { ascending: false }),
        supabase
          .from('api_views')
          .select('id')
          .eq('api_id', apiId)
      ]);

      if (reviewsRes.error) throw reviewsRes.error;
      if (viewsRes.error) throw viewsRes.error;

      const reviewData = reviewsRes.data || [];
      setReviews(reviewData);
      setViewCount(viewsRes.data?.length || 0);

      if (reviewData.length > 0) {
        const avg = reviewData.reduce((sum, r) => sum + r.rating, 0) / reviewData.length;
        setAvgRating(avg);
      } else {
        setAvgRating(0);
      }

      const userReview = reviewData.find(r => r.user_id === profile?.id);
      if (userReview) {
        setUserRating(userReview.rating);
        setUserComment(userReview.comment);
      } else {
        setUserRating(0);
        setUserComment('');
      }

      if (profile) {
        await supabase.from('api_views').insert({
          api_id: apiId,
          user_id: profile.id
        });
      }
    } catch (err: any) {
      console.error('Failed to load API details:', err);
    }
  };

  const handleSubmitReview = async () => {
    if (!profile) {
      addToast('Please sign in to leave a review', 'error');
      return;
    }

    if (userRating === 0) {
      addToast('Please select a rating', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const existingReview = reviews.find(r => r.user_id === profile.id);

      if (existingReview) {
        const { error } = await supabase
          .from('api_reviews')
          .update({
            rating: userRating,
            comment: userComment
          })
          .eq('id', existingReview.id);

        if (error) throw error;
        addToast('Review updated successfully', 'success');
      } else {
        const { error } = await supabase
          .from('api_reviews')
          .insert({
            api_id: selectedAPI!.id,
            user_id: profile.id,
            rating: userRating,
            comment: userComment
          });

        if (error) throw error;
        addToast('Review submitted successfully', 'success');
      }

      loadAPIDetails(selectedAPI!.id);
    } catch (err: any) {
      addToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const checkIfSaved = async (apiId: string) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('saved_apis')
        .select('id')
        .eq('user_id', profile.id)
        .eq('api_id', apiId)
        .maybeSingle();

      if (error) throw error;
      setIsSaved(!!data);
    } catch (err: any) {
      console.error('Failed to check if API is saved:', err);
    }
  };

  const handleSaveAPI = async () => {
    if (!profile || !selectedAPI) return;

    setSavingAPI(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_apis')
          .delete()
          .eq('user_id', profile.id)
          .eq('api_id', selectedAPI.id);

        if (error) throw error;
        setIsSaved(false);
        addToast('Removed from My APIs', 'success');
      } else {
        const { error } = await supabase
          .from('saved_apis')
          .insert({
            user_id: profile.id,
            api_id: selectedAPI.id
          });

        if (error) throw error;
        setIsSaved(true);
        addToast('Added to My APIs', 'success');
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to save API', 'error');
    } finally {
      setSavingAPI(false);
    }
  };

  const filteredAPIs = apis.filter(api =>
    api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.about?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAPIRating = (apiId: string) => {
    return 0;
  };

  return (
    <>
      <Modal
        isOpen={!!selectedAPI}
        onClose={() => setSelectedAPI(null)}
        title="API Details"
        maxWidth="xl"
      >
        {selectedAPI && (
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedAPI.name}
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{selectedAPI.users?.email || 'Unknown'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(selectedAPI.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{viewCount} views</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {avgRating > 0 ? avgRating.toFixed(1) : 'N/A'}
                  </span>
                </div>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {selectedAPI.about}
              </p>

              {profile && selectedAPI.user_id !== profile.id && (
                <div className="mb-4">
                  <Button
                    onClick={handleSaveAPI}
                    isLoading={savingAPI}
                    variant={isSaved ? 'outline' : 'primary'}
                    className="w-full"
                  >
                    {isSaved ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Saved to My APIs
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to My APIs
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Endpoint URL</span>
                </div>
                <code className="text-sm text-gray-900 dark:text-gray-100 break-all block">
                  {selectedAPI.endpoint_url}
                </code>
              </div>

              {selectedAPI.code_snapshot && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">API Code</span>
                  </div>
                  {(profile?.is_admin || profile?.plan === 'pro' || profile?.plan === 'enterprise' || selectedAPI.user_id === profile?.id) ? (
                    <pre className="text-sm text-gray-900 dark:text-gray-100 overflow-x-auto">
                      <code>{selectedAPI.code_snapshot}</code>
                    </pre>
                  ) : (
                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        Upgrade to a paid plan to view API source code
                      </p>
                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/billing'}
                      >
                        Upgrade Plan
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Reviews ({reviews.length})
              </h3>

              {profile && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Leave a Review
                  </h4>
                  <div className="flex gap-2 mb-3">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setUserRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= userRating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="Share your experience with this API..."
                    value={userComment}
                    onChange={(e) => setUserComment(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <Button
                    onClick={handleSubmitReview}
                    isLoading={submittingReview}
                    size="sm"
                  >
                    {reviews.find(r => r.user_id === profile.id) ? 'Update' : 'Submit'} Review
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No reviews yet. Be the first to review this API!
                  </p>
                ) : (
                  reviews.map(review => (
                    <div
                      key={review.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {review.users?.email || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {Array.from({ length: review.rating }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <div className="p-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            API Marketplace
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Discover and integrate APIs built by the community
          </p>
        </motion.div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search APIs by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading marketplace...</p>
          </div>
        ) : filteredAPIs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {searchTerm ? 'No APIs found' : 'No APIs in marketplace yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Be the first to publish an API to the marketplace!'}
              </p>
              {!searchTerm && (
                <Button onClick={() => window.location.href = '/generate'}>
                  Generate & Publish API
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAPIs.map((api) => (
              <motion.div
                key={api.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {api.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <User className="w-4 h-4" />
                        <span>{api.users?.email || 'Unknown'}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {api.about || 'No description available'}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {getAPIRating(api.id).toFixed(1)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAPI(api)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
