/*
  # Add Subscription Active Column

  1. Changes
    - Add `subscription_active` boolean column to profiles table
    - Defaults to false for all users
    - Used for revenue tracking in admin dashboard

  2. Notes
    - This is a placeholder column for future subscription implementation
    - No data migration needed as default is false
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'subscription_active'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_active boolean DEFAULT false;
  END IF;
END $$;