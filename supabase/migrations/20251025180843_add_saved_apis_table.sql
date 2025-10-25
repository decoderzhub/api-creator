/*
  # Add Saved APIs Feature

  ## Overview
  Allows users to save/subscribe to marketplace APIs for easy access in their dashboard.

  ## New Tables
  
  ### saved_apis
  Tracks which marketplace APIs users have saved to their collection
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users, not null) - user who saved the API
  - `api_id` (uuid, references apis, not null) - the marketplace API being saved
  - `created_at` (timestamptz, default now()) - when the API was saved
  
  ## Indexes
  - Composite unique index on (user_id, api_id) to prevent duplicate saves
  - Index on user_id for fast lookups of a user's saved APIs
  
  ## Security
  - Enable RLS on saved_apis table
  - Users can only view their own saved APIs
  - Users can only insert/delete their own saved API records
  - Users cannot modify existing saved API records (only add/remove)
*/

-- Create saved_apis table
CREATE TABLE IF NOT EXISTS saved_apis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_id uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS saved_apis_user_api_unique 
  ON saved_apis(user_id, api_id);

CREATE INDEX IF NOT EXISTS saved_apis_user_id_idx 
  ON saved_apis(user_id);

-- Enable RLS
ALTER TABLE saved_apis ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved APIs
CREATE POLICY "Users can view own saved APIs"
  ON saved_apis
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save APIs to their collection
CREATE POLICY "Users can save APIs"
  ON saved_apis
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove saved APIs from their collection
CREATE POLICY "Users can remove saved APIs"
  ON saved_apis
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
