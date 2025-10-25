/*
  # Add Admin Feedback Management
  
  ## Changes
  
  1. User Table Updates
    - Add `is_admin` boolean field to users table (default: false)
    - Allows specific users to be designated as administrators
  
  2. Feedback Table Updates
    - Add `admin_response` text field to platform_feedback table
    - Add `admin_responder_id` uuid field to track which admin responded
    - Add `responded_at` timestamp field
  
  3. Security Updates
    - Add RLS policy for admins to view all feedback
    - Add RLS policy for admins to update all feedback (for responses)
    - Add RLS policy for admins to delete any feedback
  
  ## Important Notes
  - Admins can view, respond to, and delete any feedback
  - Regular users can still only view their own feedback
  - Admin responses are tracked with responder ID and timestamp
*/

-- Add is_admin field to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

-- Add admin response fields to platform_feedback table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_feedback' AND column_name = 'admin_response'
  ) THEN
    ALTER TABLE platform_feedback ADD COLUMN admin_response text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_feedback' AND column_name = 'admin_responder_id'
  ) THEN
    ALTER TABLE platform_feedback ADD COLUMN admin_responder_id uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'platform_feedback' AND column_name = 'responded_at'
  ) THEN
    ALTER TABLE platform_feedback ADD COLUMN responded_at timestamptz;
  END IF;
END $$;

-- Add RLS policies for admin access to feedback

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON platform_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can update any feedback (for adding responses)
CREATE POLICY "Admins can update any feedback"
  ON platform_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Admins can delete any feedback
CREATE POLICY "Admins can delete any feedback"
  ON platform_feedback FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_admin = true
    )
  );

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;
CREATE INDEX IF NOT EXISTS idx_platform_feedback_admin_responder ON platform_feedback(admin_responder_id);
