/*
  # Add adult confirmation and sexual factor

  1. Changes
    - Add `is_adult_confirmed` (boolean) to profiles table for age verification when birth date not provided
    - Add `factor_sexual` (integer) to checkins table for sexual dimension tracking

  2. Notes
    - is_adult_confirmed allows users who don't provide birth date to confirm they are 18+
    - factor_sexual tracks the sexual dimension in daily check-ins (only shown to 18+ users)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_adult_confirmed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_adult_confirmed boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkins' AND column_name = 'factor_sexual'
  ) THEN
    ALTER TABLE checkins ADD COLUMN factor_sexual integer;
  END IF;
END $$;
