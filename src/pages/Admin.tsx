import { useState, useEffect } from 'react';
import { Users, Settings, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  plan: string;
  custom_rate_limit: number | null;
  created_at: string;
}

export const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [customLimit, setCustomLimit] = useState<string>('');
  const { addToast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, plan, custom_rate_limit, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      addToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateCustomRateLimit = async (userId: string, limit: number | null) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ custom_rate_limit: limit })
        .eq('id', userId);

      if (error) throw error;

      addToast('Custom rate limit updated successfully', 'success');
      setEditingUser(null);
      setCustomLimit('');
      loadUsers();
    } catch (error: any) {
      addToast('Failed to update rate limit', 'error');
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDefaultLimit = (plan: string) => {
    const limits = {
      free: 100,
      pro: 1000,
      enterprise: 10000,
    };
    return limits[plan as keyof typeof limits] || 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage users and custom rate limits</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Plan
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Default Limit
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Custom Limit
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {user.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.plan === 'enterprise'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                          : user.plan === 'pro'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.plan.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {getDefaultLimit(user.plan).toLocaleString()}/hour
                    </td>
                    <td className="py-3 px-4">
                      {editingUser === user.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={customLimit}
                            onChange={(e) => setCustomLimit(e.target.value)}
                            placeholder="Requests/hour"
                            className="w-32"
                          />
                          <Button
                            onClick={() => updateCustomRateLimit(
                              user.id,
                              customLimit ? parseInt(customLimit) : null
                            )}
                            size="sm"
                          >
                            Save
                          </Button>
                          <Button
                            onClick={() => {
                              setEditingUser(null);
                              setCustomLimit('');
                            }}
                            variant="outline"
                            size="sm"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-900 dark:text-white">
                          {user.custom_rate_limit
                            ? `${user.custom_rate_limit.toLocaleString()}/hour`
                            : 'Not set'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {editingUser !== user.id && (
                        <Button
                          onClick={() => {
                            setEditingUser(user.id);
                            setCustomLimit(user.custom_rate_limit?.toString() || '');
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No users found
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
