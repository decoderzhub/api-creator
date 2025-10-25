/*
  # Rename consumer API keys table
  
  1. Changes
    - Drop the conflicting user_api_keys table (consumer keys)
    - Create new consumer_api_keys table with proper schema
    - This table stores the single API key each user uses to consume marketplace APIs
    
  2. Security
    - Enable RLS
    - Users can only access their own consumer API key
*/

-- Drop the conflicting table if it exists
DROP TABLE IF EXISTS user_api_keys CASCADE;

-- Create the consumer API keys table
CREATE TABLE IF NOT EXISTS consumer_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  api_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE consumer_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consumer API key"
  ON consumer_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consumer API key"
  ON consumer_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consumer API key"
  ON consumer_api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own consumer API key"
  ON consumer_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Recreate the service API keys table for third-party services
CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_name text NOT NULL,
  key_value text NOT NULL,
  service_name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own service API keys"
  ON user_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own service API keys"
  ON user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own service API keys"
  ON user_api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own service API keys"
  ON user_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);