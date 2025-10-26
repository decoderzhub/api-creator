import { motion } from 'framer-motion';
import { Check, Zap, Crown, Rocket } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useState } from 'react';
import { API_BASE_URL } from '../lib/endpoints';

const plans = [
  {
    name: 'Free',
    price: 0,
    period: 'forever',
    icon: Zap,
    features: [
      '3 API generations per month',
      'Basic API documentation',
      'Community support',
      '1,000 API calls per month',
      'Standard rate limiting',
    ],
    tier: 'free' as const,
    cta: 'Current Plan',
    variant: 'neutral' as const,
  },
  {
    name: 'Pro',
    price: 29,
    period: 'month',
    icon: Rocket,
    features: [
      '20 API generations per month',
      'Advanced API documentation',
      'Priority email support',
      '100,000 API calls per month',
      'Custom rate limiting',
      'Analytics dashboard',
      'Webhook support',
    ],
    tier: 'pro' as const,
    cta: 'Upgrade to Pro',
    variant: 'info' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 299,
    period: 'month',
    icon: Crown,
    features: [
      'Unlimited API generations',
      'White-label documentation',
      'Dedicated support + SLA',
      'Unlimited API calls',
      'Custom infrastructure',
      'Advanced analytics',
      'Custom integrations',
      'SSO & audit logs',
      'Private deployment options',
    ],
    tier: 'enterprise' as const,
    cta: 'Contact Sales',
    variant: 'success' as const,
  },
];

export const Billing = () => {
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (tier: string) => {
    if (tier === 'enterprise') {
      addToast('Please contact sales@apibuilder.dev for enterprise plans', 'info');
      return;
    }

    if (tier === 'free') {
      return;
    }

    if (!session) {
      addToast('Please log in to upgrade', 'error');
      return;
    }

    setLoading(true);

    try {
      const priceId = tier === 'pro'
        ? import.meta.env.VITE_STRIPE_PRO_PRICE_ID
        : import.meta.env.VITE_STRIPE_ENTERPRISE_PRICE_ID;

      if (!priceId || priceId.includes('your_stripe') || priceId === 'undefined') {
        addToast('Stripe is not configured. Please contact support.', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/billing/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_id: priceId,
          success_url: `${window.location.origin}/billing?success=true`,
          cancel_url: `${window.location.origin}/billing?canceled=true`,
          mode: 'subscription',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Upgrade error:', error);
      addToast(error.message || 'Failed to initiate upgrade', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Choose Your Plan
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Scale your API development with flexible pricing
        </p>
        {profile && (
          <div className="mt-4 inline-flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current plan:</span>
            <Badge variant={profile.plan === 'free' ? 'neutral' : profile.plan === 'pro' ? 'info' : 'success'}>
              {profile.plan.toUpperCase()}
            </Badge>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          const isCurrentPlan = profile?.plan === plan.tier;

          return (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full relative ${plan.popular ? 'border-2 border-blue-500' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="info" className="px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrentPlan ? 'outline' : 'primary'}
                    disabled={isCurrentPlan || loading}
                    onClick={() => handleUpgrade(plan.tier)}
                  >
                    {loading ? 'Loading...' : isCurrentPlan ? 'Current Plan' : plan.cta}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <Card>
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Need a custom solution?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Contact our sales team for custom pricing and features tailored to your needs
            </p>
            <Button variant="outline">Contact Sales</Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
