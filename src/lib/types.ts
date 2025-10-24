export interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  stripe_customer_id?: string;
  api_generation_count: number;
  created_at: string;
  updated_at: string;
}

export interface API {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  description?: string;
  about?: string;
  endpoint_url: string;
  api_key: string;
  status: 'active' | 'paused' | 'failed';
  usage_count: number;
  code_snapshot?: string;
  is_published?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_tier: 'free' | 'pro' | 'enterprise';
  stripe_subscription_id?: string;
  start_date: string;
  end_date?: string;
  status: 'active' | 'canceled' | 'expired';
  created_at: string;
}

export interface MarketplaceItem {
  id: string;
  api_id: string;
  title: string;
  description: string;
  price_per_call: number;
  category?: string;
  is_public: boolean;
  rating: number;
  total_calls: number;
  created_at: string;
}

export interface ApiUsageLog {
  id: string;
  api_id: string;
  user_id?: string;
  timestamp: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes: number;
}
