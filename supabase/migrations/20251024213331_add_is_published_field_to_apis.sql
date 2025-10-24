/*
  # Add is_published Field to APIs Table

  ## Changes
  1. Tables Modified
    - `apis` table
      - Add `is_published` (boolean, default false) - Tracks if API is published to marketplace

  ## Purpose
  Adds a flag to track which APIs have been published to the marketplace for easier filtering and UI display.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE apis ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;