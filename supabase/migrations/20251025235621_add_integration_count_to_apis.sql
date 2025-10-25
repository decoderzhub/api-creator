-- Add integration_count column to apis table
-- Tracks how many integrations have been generated for each API

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'integration_count'
  ) THEN
    ALTER TABLE apis ADD COLUMN integration_count integer DEFAULT 0;
  END IF;
END $$;