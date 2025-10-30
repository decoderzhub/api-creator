/*
  # Add Requirements Column to APIs Table

  1. Changes
    - Add `requirements` column to `apis` table to store per-API Python dependencies
    - This enables each API to have its own isolated dependency list
    - Stored as TEXT with newline-separated pip requirements format

  2. Usage
    - Example value: "pillow==10.0.0\npandas==2.0.0\nrequests==2.31.0"
    - Can be null for APIs that only use standard library
    - Will be used by Docker deployment system to build custom containers

  3. Notes
    - This is a critical step toward dependency isolation
    - Enables true multi-tenancy where APIs don't conflict over package versions
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apis' AND column_name = 'requirements'
  ) THEN
    ALTER TABLE apis ADD COLUMN requirements TEXT;
  END IF;
END $$;
