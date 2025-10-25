import { motion } from 'framer-motion';
import {
  Zap,
  Code,
  Rocket,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  Check,
  Terminal,
  Sparkles,
  Globe,
  Lock,
  BarChart3,
  Moon,
  Sun,
  Code2,
  Workflow,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { useTheme } from '../contexts/ThemeContext';

const features = [
  {
    icon: Sparkles,
    title: 'AI-Powered Generation',
    description: 'Describe your API in plain English and watch it come to life instantly with cutting-edge AI technology',
  },
  {
    icon: Code2,
    title: 'AI Integration Assistant',
    description: 'Generate production-ready integration code for Salesforce, Slack, Discord, GitHub Actions, and more in any language',
  },
  {
    icon: Code,
    title: 'Production-Ready Code',
    description: 'Get clean, documented FastAPI code that follows best practices and is ready for deployment',
  },
  {
    icon: Rocket,
    title: 'Instant Deployment',
    description: 'APIs are automatically containerized, deployed, and ready to use in seconds',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    description: 'Built-in authentication, rate limiting, HTTPS, and industry-standard security best practices',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Monitoring',
    description: 'Real-time analytics, performance metrics, and usage tracking from a unified dashboard',
  },
  {
    icon: Globe,
    title: 'Global Marketplace',
    description: 'Publish your APIs and monetize them in our growing marketplace with millions of developers',
  },
  {
    icon: Workflow,
    title: 'Multi-Language SDKs',
    description: 'Automatically generate client libraries in Python, JavaScript, TypeScript, Ruby, Go, and PHP',
  },
];

const stats = [
  { value: '10K+', label: 'APIs Generated' },
  { value: '5K+', label: 'Active Developers' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '1M+', label: 'API Calls/Day' },
];

const useCases = [
  {
    title: 'Salesforce Integration',
    description: 'Sync your API data with Salesforce CRM - create leads, update opportunities, and manage contacts automatically',
    icon: '☁️',
  },
  {
    title: 'Slack Notifications',
    description: 'Send real-time alerts and reports to Slack channels when your API events occur',
    icon: '💬',
  },
  {
    title: 'GitHub Actions Workflows',
    description: 'Integrate your API into CI/CD pipelines with automated GitHub Actions workflows',
    icon: '🔄',
  },
  {
    title: 'Google Sheets Export',
    description: 'Export API data to Google Sheets for easy analysis, reporting, and dashboard creation',
    icon: '📊',
  },
  {
    title: 'Discord Bots & Webhooks',
    description: 'Create Discord integrations that respond to your API events with rich embedded messages',
    icon: '🎮',
  },
  {
    title: 'Custom Webhook Handlers',
    description: 'Process incoming webhooks from any service and trigger your API with validated data',
    icon: '🔗',
  },
];

const pricingPlans = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: [
      '3 API generations/month',
      '1,000 API calls/month',
      'Community support',
      'Basic documentation',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For professional developers',
    features: [
      '20 API generations/month',
      '100,000 API calls/month',
      'Priority support',
      'Advanced analytics',
      'Custom domains',
      'Webhook support',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams and organizations',
    features: [
      'Unlimited API generations',
      'Unlimited API calls',
      'Dedicated support',
      'Private deployment',
      'SSO & audit logs',
      'Custom SLA',
    ],
  },
];

export const Landing = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/20 via-transparent to-transparent dark:from-blue-900/20 -z-10" />

      <nav className="border-b border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-gray-950/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              API Builder
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            <Button variant="ghost" onClick={() => window.location.href = '/login'} className="text-gray-700 dark:text-gray-300">
              Sign In
            </Button>
            <Button onClick={() => window.location.href = '/signup'} className="shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      <section className="max-w-7xl mx-auto px-6 py-24 md:py-40">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center relative"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <Badge variant="info" className="text-sm px-5 py-2.5 shadow-lg shadow-blue-500/20 border border-blue-200 dark:border-blue-800">
              <Sparkles className="w-4 h-4 inline mr-2" />
              Powered by Advanced AI
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold text-gray-900 dark:text-white mb-8 leading-[1.1] tracking-tight"
          >
            Build APIs with
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Natural Language
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-4xl mx-auto leading-relaxed font-light"
          >
            Transform your ideas into production-ready APIs in seconds. No coding required.
            <br className="hidden md:block" />
            Our AI builds, deploys, and generates integration code for Salesforce, Slack, GitHub, and more.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              size="lg"
              className="text-lg px-10 py-7 shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/40 transition-all duration-300"
              onClick={() => window.location.href = '/signup'}
            >
              <Zap className="w-5 h-5" />
              Start Building Free
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-10 py-7 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-gray-900/80 transition-all duration-300"
              onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Terminal className="w-5 h-5" />
              See How It Works
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400"
          >
            <div className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-900/60 px-4 py-2 rounded-full backdrop-blur-sm">
              <Check className="w-5 h-5 text-green-600 dark:text-green-500" />
              <span className="font-medium">No credit card required</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-900/60 px-4 py-2 rounded-full backdrop-blur-sm">
              <Check className="w-5 h-5 text-green-600 dark:text-green-500" />
              <span className="font-medium">Free tier forever</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-900/60 px-4 py-2 rounded-full backdrop-blur-sm">
              <Check className="w-5 h-5 text-green-600 dark:text-green-500" />
              <span className="font-medium">Deploy in seconds</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="text-center"
          >
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              {stat.value}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </section>

      <section id="demo" className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl"
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge variant="success" className="mb-4">
                Live Demo
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                From Idea to API in 30 Seconds
              </h2>
              <p className="text-gray-300 mb-6 text-lg">
                Watch how a simple prompt transforms into a fully functional, deployed API with documentation and API keys.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Describe Your API</h3>
                    <p className="text-gray-400 text-sm">Use natural language to explain what your API should do</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">AI Generates Code</h3>
                    <p className="text-gray-400 text-sm">Our AI creates production-ready FastAPI code</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Instant Deployment</h3>
                    <p className="text-gray-400 text-sm">Your API is deployed and ready to use immediately</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-black rounded-2xl p-6 font-mono text-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="text-green-400">
                <div className="mb-2">$ <span className="text-gray-400">Describe your API:</span></div>
                <div className="mb-4 text-white">"Send SMS alerts when inventory is low"</div>
                <div className="mb-2 text-blue-400">✓ Generating API code...</div>
                <div className="mb-2 text-blue-400">✓ Creating endpoint routes...</div>
                <div className="mb-2 text-blue-400">✓ Deploying to container...</div>
                <div className="mb-4 text-green-400">✓ API deployed successfully!</div>
                <div className="text-gray-400 mb-1">Endpoint:</div>
                <div className="text-cyan-400 mb-3">https://api.aibuilder.dev/xyz123</div>
                <div className="text-gray-400 mb-1">API Key:</div>
                <div className="text-yellow-400">ak_prod_x7k9m2n4p8q1</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Everything you need to build, deploy, and monetize APIs
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="h-full">
                  <CardContent className="p-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-gray-900 dark:to-blue-950 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="info" className="mb-4">
              <Code2 className="w-4 h-4 inline mr-2" />
              AI Integration Assistant
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Connect Anywhere in Seconds
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Our AI generates production-ready integration code for your APIs. No more wrestling with documentation or SDK limitations.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-8 mb-12 shadow-xl"
          >
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <Layers className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  7+ Integration Types
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Salesforce, Slack, Discord, GitHub, Google Sheets, and more
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <Code className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  6 Programming Languages
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Python, JavaScript, TypeScript, Ruby, Go, PHP
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <Workflow className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Complete with Examples
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dependencies, setup instructions, and usage examples included
                </p>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-6 font-mono text-sm overflow-x-auto">
              <div className="text-gray-400 mb-2"># Example: Send Slack notification when API event occurs</div>
              <div className="text-blue-400">import</div> <div className="text-white inline">requests</div>
              <div className="mt-2 text-green-400">"Generate a Slack integration that sends formatted messages</div>
              <div className="text-green-400">when my inventory API detects low stock levels"</div>
              <div className="mt-4 text-cyan-400">→ Complete Python code with error handling</div>
              <div className="text-cyan-400">→ Slack webhook setup instructions</div>
              <div className="text-cyan-400">→ Message formatting examples</div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <motion.div
                key={useCase.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card hover className="h-full bg-white dark:bg-gray-900">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">{useCase.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {useCase.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {useCase.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Start free, scale as you grow
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full relative ${plan.popular ? 'border-2 border-blue-500 shadow-xl' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge variant="info" className="px-4 py-1">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                      {plan.price}
                    </span>
                    {plan.price !== 'Custom' && <span className="text-gray-600 dark:text-gray-400">/month</span>}
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'primary' : 'outline'}
                    onClick={() => window.location.href = '/signup'}
                  >
                    {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Card glass>
            <CardContent className="p-12 text-center">
              <Sparkles className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Ready to Build Your First API?
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
                Join thousands of developers building the future with AI-powered APIs
              </p>
              <Button size="lg" className="text-lg px-8 py-6" onClick={() => window.location.href = '/signup'}>
                Start Building for Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  API Builder
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Build production-ready APIs with natural language
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600">Features</a></li>
                <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600">API Reference</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600">About</a></li>
                <li><a href="#" className="hover:text-blue-600">Blog</a></li>
                <li><a href="#" className="hover:text-blue-600">Careers</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600">Privacy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms</a></li>
                <li><a href="#" className="hover:text-blue-600">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-800 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 API Builder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
