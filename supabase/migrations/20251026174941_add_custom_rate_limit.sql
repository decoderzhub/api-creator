/*
  # Add Custom Rate Limiting Support

  1. Changes
    - Add `custom_rate_limit` column to users table
      - Nullable integer field
      - When set, overrides plan-based rate limits
      - When null, uses default plan limits
    
  2. Notes
    - This allows admins to set per-user custom rate limits
    - Primarily for Pro and Enterprise plans
    - Value represents requests per hour
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'custom_rate_limit'
  ) THEN
    ALTER TABLE users ADD COLUMN custom_rate_limit integer;
  END IF;
END $$;