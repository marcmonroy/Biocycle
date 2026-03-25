-- Add premium health and medical profile fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS height_cm integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weight_kg float;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bmi float;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exercise_frequency text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS exercise_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS diet_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sleep_hours float;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS caffeine_per_day integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alcohol_per_week integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS known_conditions jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_medications jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blood_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS family_history jsonb;
