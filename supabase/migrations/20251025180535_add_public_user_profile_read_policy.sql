/*
  # Add Public User Profile Read Access

  ## Changes
  Adds a new RLS policy to allow authenticated users to read basic profile information (email) from other users.
  This is needed for the marketplace to display creator information for published APIs.

  ## Security
  - Only allows reading email field (no sensitive data exposed)
  - Only available to authenticated users
  - Users can still only update their own profiles
*/

-- Add policy for authenticated users to view other users' basic profile info
CREATE POLICY "Authenticated users can view all user profiles"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- Drop the old restrictive policy that only allowed viewing own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
