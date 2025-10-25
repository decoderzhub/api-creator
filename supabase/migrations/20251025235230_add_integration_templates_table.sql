-- Create Integration Templates Table
-- 1. New Tables: integration_templates
-- 2. Security: Enable RLS with policies for users to manage their own templates
-- 3. Indexes: user_id, api_id, integration_type

CREATE TABLE IF NOT EXISTS integration_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_id uuid NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  integration_type text NOT NULL DEFAULT 'custom',
  target_language text NOT NULL,
  code text NOT NULL,
  description text,
  dependencies text[],
  setup_instructions text,
  is_template boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE integration_templates ENABLE ROW LEVEL SECURITY;

-- Users can read their own templates
CREATE POLICY "Users can read own templates"
  ON integration_templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- All users can read system templates
CREATE POLICY "All users can read system templates"
  ON integration_templates
  FOR SELECT
  TO authenticated
  USING (is_template = true);

-- Users can create their own templates
CREATE POLICY "Users can create own templates"
  ON integration_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update own templates"
  ON integration_templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete own templates"
  ON integration_templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_templates_user_id ON integration_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_templates_api_id ON integration_templates(api_id);
CREATE INDEX IF NOT EXISTS idx_integration_templates_integration_type ON integration_templates(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_templates_is_template ON integration_templates(is_template) WHERE is_template = true;