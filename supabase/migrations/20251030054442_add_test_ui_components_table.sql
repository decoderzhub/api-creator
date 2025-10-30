/*
  # Create test UI components table

  1. New Tables
    - `test_ui_components`
      - `id` (uuid, primary key)
      - `api_id` (uuid, foreign key to apis table)
      - `user_id` (uuid, foreign key to auth.users)
      - `component_code` (text, the generated React component code)
      - `code_snapshot` (text, the API code when this UI was generated)
      - `is_active` (boolean, whether this is the currently active component for the API)
      - `generation_count` (integer, how many times this was regenerated)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `test_ui_components` table
    - Add policy for users to manage their own test UI components
    - Add policy for users to read test UIs for APIs they own

  3. Indexes
    - Index on api_id and user_id for fast lookups
    - Index on api_id and is_active for finding active components
*/

CREATE TABLE IF NOT EXISTS test_ui_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_id uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_code text NOT NULL,
  code_snapshot text,
  is_active boolean DEFAULT true,
  generation_count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE test_ui_components ENABLE ROW LEVEL SECURITY;

-- Users can insert test UI components for their APIs
CREATE POLICY "Users can insert test UI components for their APIs"
  ON test_ui_components FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = test_ui_components.api_id
      AND apis.user_id = auth.uid()
    )
  );

-- Users can view test UI components for their APIs
CREATE POLICY "Users can view test UI components for their APIs"
  ON test_ui_components FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM apis
      WHERE apis.id = test_ui_components.api_id
      AND apis.user_id = auth.uid()
    )
  );

-- Users can update their test UI components
CREATE POLICY "Users can update their test UI components"
  ON test_ui_components FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their test UI components
CREATE POLICY "Users can delete their test UI components"
  ON test_ui_components FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_test_ui_components_api_user 
  ON test_ui_components(api_id, user_id);

CREATE INDEX IF NOT EXISTS idx_test_ui_components_active 
  ON test_ui_components(api_id, is_active) 
  WHERE is_active = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_test_ui_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_test_ui_components_updated_at_trigger ON test_ui_components;
CREATE TRIGGER update_test_ui_components_updated_at_trigger
  BEFORE UPDATE ON test_ui_components
  FOR EACH ROW
  EXECUTE FUNCTION update_test_ui_components_updated_at();