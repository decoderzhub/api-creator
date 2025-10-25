/*
  # Integration Assistant Tables

  ## Overview
  This migration adds support for the Integration Assistant feature, which allows users
  to generate production-ready integration code for their APIs using AI.

  ## New Tables

  ### integration_templates
  Stores both user-generated integration code and system-wide pre-built templates.

  **Columns:**
  - `id` (uuid, primary key) - Unique identifier for the template
  - `user_id` (uuid, foreign key) - References user_profiles table
  - `api_id` (uuid, foreign key) - References apis table
  - `template_name` (text) - Human-readable name for the template
  - `integration_type` (text) - Type: custom, salesforce, slack, github_actions, etc.
  - `target_language` (text) - Programming language: python, javascript, ruby, go, php, curl
  - `code` (text) - The generated integration code
  - `description` (text, nullable) - What the integration does
  - `dependencies` (jsonb) - Array of required packages/libraries
  - `setup_instructions` (text, nullable) - Step-by-step setup guide
  - `is_template` (boolean) - True for system templates available to all users
  - `created_at` (timestamptz) - When the template was created
  - `updated_at` (timestamptz) - Last modification time

  ## Schema Changes

  ### apis table
  - Add `integration_count` column to track how many integrations have been generated

  ## Security
  - Enable RLS on integration_templates table
  - Users can only view, create, update, and delete their own templates
  - Everyone can view system templates (is_template = true)

  ## Performance
  - Indexes on user_id, api_id, integration_type for fast queries
  - Index on is_template for system template lookups
*/

-- Create integration_templates table
CREATE TABLE IF NOT EXISTS integration_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  api_id UUID NOT NULL REFERENCES apis(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  target_language TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  dependencies JSONB DEFAULT '[]'::jsonb,
  setup_instructions TEXT,
  is_template BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_integration_templates_user_id ON integration_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_templates_api_id ON integration_templates(api_id);
CREATE INDEX IF NOT EXISTS idx_integration_templates_type ON integration_templates(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_templates_is_template ON integration_templates(is_template);

-- Enable Row Level Security
ALTER TABLE integration_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own integrations
CREATE POLICY "Users can view own integrations"
  ON integration_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own integrations
CREATE POLICY "Users can create integrations"
  ON integration_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
CREATE POLICY "Users can update own integrations"
  ON integration_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own integrations
CREATE POLICY "Users can delete own integrations"
  ON integration_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Everyone can view system templates
CREATE POLICY "Anyone can view system templates"
  ON integration_templates FOR SELECT
  TO authenticated
  USING (is_template = true);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_integration_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER integration_templates_updated_at
  BEFORE UPDATE ON integration_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_templates_updated_at();

-- Add integration_count column to apis table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'integration_count'
  ) THEN
    ALTER TABLE apis ADD COLUMN integration_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE integration_templates IS 'Stores user-generated and system integration code templates';
COMMENT ON COLUMN integration_templates.is_template IS 'System templates are pre-built and available to all users';
COMMENT ON COLUMN integration_templates.dependencies IS 'JSON array of required packages/libraries';
COMMENT ON COLUMN apis.integration_count IS 'Number of integrations generated for this API';
