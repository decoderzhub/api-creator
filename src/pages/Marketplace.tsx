import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Star, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/useToast';

interface MarketplaceAPI {
  id: string;
  title: string;
  description: string;
  price_per_call: number;
  category: string;
  rating: number;
  total_calls: number;
}

export const Marketplace = () => {
  const [apis, setApis] = useState<MarketplaceAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    loadMarketplaceAPIs();
  }, []);

  const loadMarketplaceAPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace')
        .select('*')
        .eq('is_public', true)
        .order('total_calls', { ascending: false });

      if (error) throw error;
      setApis(data || []);
    } catch (err: any) {
      addToast(err.message || 'Failed to load marketplace', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredAPIs = apis.filter(api =>
    api.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    api.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          API Marketplace
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and integrate APIs built by the community
        </p>
      </motion.div>

      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search APIs by name, description, or category..."
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
            <Store className="w-16 h-16 text-gray-400 mx-auto mb-4" />
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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        {api.title}
                      </h3>
                      {api.category && (
                        <Badge variant="info" className="mb-3">
                          {api.category}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {api.description}
                  </p>

                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {api.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>{api.total_calls.toLocaleString()} calls</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Price per call</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {api.price_per_call === 0 ? 'Free' : `$${api.price_per_call.toFixed(4)}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
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
  );
};

const Store = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
    />
  </svg>
);
