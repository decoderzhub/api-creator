/*
  # API-Creator - Initial Database Schema

  ## Overview
  Creates the core database structure for the API-Creator SaaS platform that enables users to generate, deploy, and monetize APIs using AI.

  ## New Tables

  ### 1. users
  Extended user profile information linked to Supabase auth
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, unique, not null)
  - `plan` (text, default 'free') - subscription tier: free, pro, enterprise
  - `stripe_customer_id` (text, nullable) - Stripe customer reference
  - `api_generation_count` (integer, default 0) - monthly generation counter
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### 2. apis
  Stores generated API endpoints and metadata
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users, not null)
  - `name` (text, not null) - user-friendly API name
  - `prompt` (text, not null) - original prompt used to generate API
  - `description` (text, nullable) - optional description
  - `endpoint_url` (text, unique, not null) - deployed API endpoint
  - `api_key` (text, unique, not null) - authentication key
  - `status` (text, default 'active') - active, paused, failed
  - `usage_count` (integer, default 0) - total API calls
  - `code_snapshot` (text, nullable) - generated code
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

  ### 3. subscriptions
  Tracks user subscription plans and billing periods
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users, not null)
  - `plan_tier` (text, not null) - free, pro, enterprise
  - `stripe_subscription_id` (text, nullable)
  - `start_date` (timestamptz, not null)
  - `end_date` (timestamptz, nullable)
  - `status` (text, default 'active') - active, canceled, expired
  - `created_at` (timestamptz, default now())

  ### 4. marketplace
  Public marketplace for APIs users can share and monetize
  - `id` (uuid, primary key)
  - `api_id` (uuid, references apis, not null)
  - `title` (text, not null)
  - `description` (text, not null)
  - `price_per_call` (numeric(10,4), default 0) - cost per API call
  - `category` (text, nullable)
  - `is_public` (boolean, default true)
  - `rating` (numeric(3,2), default 0)
  - `total_calls` (integer, default 0)
  - `created_at` (timestamptz, default now())

  ### 5. api_usage_logs
  Detailed usage tracking for analytics and billing
  - `id` (uuid, primary key)
  - `api_id` (uuid, references apis, not null)
  - `user_id` (uuid, references users, nullable)
  - `timestamp` (timestamptz, default now())
  - `status_code` (integer)
  - `response_time_ms` (integer)
  - `request_size_bytes` (integer)

  ## Security
  - Enable RLS on all tables
  - Users can only read/write their own data
  - Marketplace is publicly readable
  - Admin-level operations require service role

  ## Indexes
  - Index on user_id for fast lookups
  - Index on api_id for usage logs
  - Index on created_at for time-series queries
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  plan text DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id text,
  api_generation_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- APIs table
CREATE TABLE IF NOT EXISTS apis (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  prompt text NOT NULL,
  description text,
  endpoint_url text UNIQUE NOT NULL,
  api_key text UNIQUE NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'failed')),
  usage_count integer DEFAULT 0,
  code_snapshot text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_tier text NOT NULL CHECK (plan_tier IN ('free', 'pro', 'enterprise')),
  stripe_subscription_id text,
  start_date timestamptz NOT NULL,
  end_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- Marketplace table
CREATE TABLE IF NOT EXISTS marketplace (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price_per_call numeric(10,4) DEFAULT 0,
  category text,
  is_public boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  total_calls integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- API usage logs table
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_id uuid REFERENCES apis(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  timestamp timestamptz DEFAULT now(),
  status_code integer,
  response_time_ms integer,
  request_size_bytes integer
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apis_user_id ON apis(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_api_id ON api_usage_logs(api_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_timestamp ON api_usage_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace(category);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for apis table
CREATE POLICY "Users can view own APIs"
  ON apis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own APIs"
  ON apis FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own APIs"
  ON apis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own APIs"
  ON apis FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for marketplace table (publicly readable)
CREATE POLICY "Anyone can view public marketplace listings"
  ON marketplace FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Users can create marketplace listings for own APIs"
  ON marketplace FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = marketplace.api_id
      AND apis.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own marketplace listings"
  ON marketplace FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = marketplace.api_id
      AND apis.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = marketplace.api_id
      AND apis.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own marketplace listings"
  ON marketplace FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = marketplace.api_id
      AND apis.user_id = auth.uid()
    )
  );

-- RLS Policies for api_usage_logs table
CREATE POLICY "Users can view logs for own APIs"
  ON api_usage_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = api_usage_logs.api_id
      AND apis.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert usage logs"
  ON api_usage_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apis_updated_at BEFORE UPDATE ON apis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
