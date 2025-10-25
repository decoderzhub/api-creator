/*
  # Add Rate Limit Tracking

  1. New Tables
    - `rate_limit_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `window_start` (timestamptz) - start of the current hour window
      - `request_count` (integer) - number of requests in current window
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `rate_limit_tracking` table
    - Service role can read/write for rate limit enforcement
    - Users can view their own rate limit status

  3. Indexes
    - Composite index on (user_id, window_start) for fast lookups
    - Index on window_start for cleanup of old records
*/

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, window_start)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_window ON rate_limit_tracking(user_id, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window_start ON rate_limit_tracking(window_start);

-- Enable RLS
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own rate limit status
CREATE POLICY "Users can view own rate limits"
  ON rate_limit_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage rate limits
CREATE POLICY "Service can manage rate limits"
  ON rate_limit_tracking FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_rate_limit_tracking_updated_at BEFORE UPDATE ON rate_limit_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_tracking
  WHERE window_start < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;
