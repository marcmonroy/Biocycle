-- Add blood_type text column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS blood_type text DEFAULT NULL;
