import { motion } from 'framer-motion';
import { Zap, Code, Rocket, Shield, TrendingUp, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Generation',
    description: 'Describe your API in plain English and watch it come to life instantly',
  },
  {
    icon: Code,
    title: 'Production-Ready Code',
    description: 'Get clean, documented FastAPI code ready for deployment',
  },
  {
    icon: Rocket,
    title: 'Instant Deployment',
    description: 'APIs are automatically deployed and ready to use in seconds',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Built-in authentication, rate limiting, and security best practices',
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Monitoring',
    description: 'Track usage, performance, and manage your APIs from one dashboard',
  },
  {
    icon: Users,
    title: 'Marketplace',
    description: 'Publish your APIs and monetize them in our growing marketplace',
  },
];

export const Home = () => {
  return (
    <div className="p-8">
      <section className="max-w-6xl mx-auto text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center">
              <Zap className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Build APIs with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Natural Language
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Transform your ideas into production-ready APIs in seconds. No coding required.
            Just describe what you want, and our AI builds it for you.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => window.location.href = '/generate'}>
              <Zap className="w-5 h-5" />
              Generate Your First API
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/marketplace'}>
              Explore Marketplace
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto py-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Everything you need to build and monetize APIs
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Powerful features to turn your API ideas into reality
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="max-w-4xl mx-auto py-20">
        <Card glass>
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ready to get started?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Join thousands of developers building APIs with AI
            </p>
            <Button size="lg" onClick={() => window.location.href = '/generate'}>
              Start Building for Free
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};
