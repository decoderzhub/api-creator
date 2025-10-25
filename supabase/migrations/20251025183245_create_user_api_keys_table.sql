/*
  # Create user API keys table
  
  1. New Tables
    - `user_api_keys`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `api_key` (text, unique) - The API key for consuming marketplace APIs
      - `created_at` (timestamptz)
      - `last_used_at` (timestamptz)
      
  2. Security
    - Enable RLS on `user_api_keys` table
    - Users can read and manage their own API keys
    
  3. Notes
    - Each user has one API key for consuming all marketplace APIs
    - This key is different from the API keys for their own created APIs
*/

CREATE TABLE IF NOT EXISTS user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  api_key text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API key"
  ON user_api_keys
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API key"
  ON user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API key"
  ON user_api_keys
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API key"
  ON user_api_keys
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);