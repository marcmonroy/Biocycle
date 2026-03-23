/*
  # Add adult content confirmation field

  1. Changes
    - Add `adult_content_confirmed` (boolean) to profiles table
    - This tracks whether user has explicitly confirmed they want adult content (Sexual dimension)

  2. Notes
    - Separate from is_adult_confirmed which just verifies age
    - Required for App Store compliance
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'adult_content_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN adult_content_confirmed boolean DEFAULT false NOT NULL;
  END IF;
END $$;
