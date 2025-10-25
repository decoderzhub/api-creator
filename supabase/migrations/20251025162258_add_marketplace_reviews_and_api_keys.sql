/*
  # Add Marketplace Reviews, User API Keys, and Feedback System

  1. New Tables
    - `api_reviews`
      - `id` (uuid, primary key)
      - `api_id` (uuid, foreign key to apis)
      - `user_id` (uuid, foreign key to users)
      - `rating` (integer, 1-5 stars)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `user_api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `key_name` (text, e.g., "OpenAI API Key")
      - `key_value` (text, encrypted)
      - `service_name` (text, e.g., "openai", "stripe")
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `platform_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `category` (text, e.g., "bug", "feature", "improvement")
      - `title` (text)
      - `description` (text)
      - `rating` (integer, 1-5 stars)
      - `status` (text, default "pending")
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `api_views`
      - `id` (uuid, primary key)
      - `api_id` (uuid, foreign key to apis)
      - `user_id` (uuid, foreign key to users, nullable)
      - `viewed_at` (timestamptz)

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users
    - Protect sensitive data like API keys

  3. Indexes
    - Add indexes for foreign keys and frequently queried columns
*/

-- Create api_reviews table
CREATE TABLE IF NOT EXISTS api_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(api_id, user_id)
);

-- Create user_api_keys table
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_name text NOT NULL,
  key_value text NOT NULL,
  service_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create platform_feedback table
CREATE TABLE IF NOT EXISTS platform_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'general')),
  title text NOT NULL,
  description text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create api_views table
CREATE TABLE IF NOT EXISTS api_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE api_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_reviews
CREATE POLICY "Users can view all reviews"
  ON api_reviews FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews for published APIs"
  ON api_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM apis WHERE id = api_id AND is_published = true)
  );

CREATE POLICY "Users can update their own reviews"
  ON api_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
  ON api_reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_api_keys
CREATE POLICY "Users can view their own API keys"
  ON user_api_keys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys"
  ON user_api_keys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON user_api_keys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON user_api_keys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for platform_feedback
CREATE POLICY "Users can view their own feedback"
  ON platform_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
  ON platform_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending feedback"
  ON platform_feedback FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pending feedback"
  ON platform_feedback FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- RLS Policies for api_views
CREATE POLICY "Users can view their own API views"
  ON api_views FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create API views"
  ON api_views FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_reviews_api_id ON api_reviews(api_id);
CREATE INDEX IF NOT EXISTS idx_api_reviews_user_id ON api_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_api_reviews_rating ON api_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_api_keys_service_name ON user_api_keys(service_name);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_user_id ON platform_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_category ON platform_feedback(category);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status ON platform_feedback(status);
CREATE INDEX IF NOT EXISTS idx_api_views_api_id ON api_views(api_id);
CREATE INDEX IF NOT EXISTS idx_api_views_user_id ON api_views(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_api_reviews_updated_at
  BEFORE UPDATE ON api_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_api_keys_updated_at
  BEFORE UPDATE ON user_api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_feedback_updated_at
  BEFORE UPDATE ON platform_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();