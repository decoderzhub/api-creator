/*
  # Add About Field to APIs Table

  ## Changes
  1. Tables Modified
    - `apis` table
      - Add `about` (text, nullable) - User-friendly description of what the API does for community discovery

  ## Purpose
  Adds an about/description field to help users in the marketplace understand what each API does at a glance.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'about'
  ) THEN
    ALTER TABLE apis ADD COLUMN about text;
  END IF;
END $$;