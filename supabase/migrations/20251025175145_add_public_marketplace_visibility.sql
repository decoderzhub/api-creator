/*
  # Add Public Marketplace Visibility
  
  ## Changes
  
  1. RLS Policy Updates for APIs Table
    - Add policy to allow all authenticated users to view published APIs
    - This enables the marketplace to show APIs from all users
  
  2. RLS Policy Updates for API Reviews Table
    - Ensure all users can view reviews for published APIs
  
  3. RLS Policy Updates for API Views Table
    - Ensure all users can view stats for published APIs
  
  ## Important Notes
  - Users can still only edit/delete their own APIs
  - Only published APIs (is_published = true) are visible in marketplace
  - Users maintain full control over their own API visibility
*/

-- Allow all authenticated users to view published APIs
CREATE POLICY "Anyone can view published APIs"
  ON apis FOR SELECT
  TO authenticated
  USING (is_published = true);

-- Allow all authenticated users to view reviews for any API (needed for marketplace)
DROP POLICY IF EXISTS "Users can view all reviews" ON api_reviews;
CREATE POLICY "Anyone can view reviews"
  ON api_reviews FOR SELECT
  TO authenticated
  USING (true);

-- Allow all authenticated users to view API views (for stats)
DROP POLICY IF EXISTS "Users can view their own API views" ON api_views;
CREATE POLICY "Anyone can view API stats"
  ON api_views FOR SELECT
  TO authenticated
  USING (true);
