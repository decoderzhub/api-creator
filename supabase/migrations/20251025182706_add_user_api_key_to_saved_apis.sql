/*
  # Add user API key to saved APIs
  
  1. Changes
    - Add `user_api_key` column to `saved_apis` table to store the API key that users generate for accessing saved marketplace APIs
    
  2. Notes
    - This allows users who save marketplace APIs to generate their own API keys for authentication
    - The API key is specific to each user-API pair
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_apis' AND column_name = 'user_api_key'
  ) THEN
    ALTER TABLE saved_apis ADD COLUMN user_api_key TEXT;
  END IF;
END $$;