/*
  # Auto-create user profile trigger

  ## Overview
  Creates a trigger that automatically creates a user profile in the users table when a new user signs up through Supabase Auth.

  ## Changes
  1. Create trigger function `handle_new_user()`
     - Automatically inserts a new row in users table when auth.users gets a new entry
     - Sets default values: plan='free', api_generation_count=0
     - Uses user's email from auth metadata
  
  2. Create trigger on auth.users
     - Fires after insert on auth.users table
     - Calls handle_new_user() function
  
  ## Security
  - Trigger runs with security definer privileges
  - Ensures every authenticated user has a corresponding profile
*/

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan, api_generation_count)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();