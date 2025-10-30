import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Loader2, ExternalLink } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { supabase } from '../lib/supabase';

interface API {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export default function PlaygroundList() {
  const navigate = useNavigate();
  const [apis, setApis] = useState<API[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPIs();
  }, []);

  const fetchAPIs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('apis')
        .select('id, name, description, status, created_at')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApis(data || []);
    } catch (err) {
      console.error('Failed to fetch APIs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Playground</h1>
        <p className="text-muted-foreground">Select an API to test with interactive AI-generated interface</p>
      </div>

      {apis.length === 0 ? (
        <Card className="p-12 text-center">
          <FlaskConical className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">No APIs Available</h2>
          <p className="text-muted-foreground mb-6">Create your first API to start testing</p>
          <button
            onClick={() => navigate('/generate')}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Generate API
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apis.map((api) => (
            <Card
              key={api.id}
              className="p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
              onClick={() => navigate(`/playground/${api.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FlaskConical className="w-6 h-6 text-white" />
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h3 className="text-lg font-semibold mb-2 group-hover:text-pink-600 transition-colors">
                {api.name}
              </h3>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {api.description || 'No description'}
              </p>

              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-1 rounded ${
                  api.status === 'active'
                    ? 'bg-green-500/10 text-green-600'
                    : 'bg-gray-500/10 text-gray-600'
                }`}>
                  {api.status}
                </span>
                <span className="text-muted-foreground">
                  {new Date(api.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
