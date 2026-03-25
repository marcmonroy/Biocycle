-- Add checkin_times jsonb column to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS checkin_times jsonb DEFAULT '[
    {"label":"morning","time":"07:30","enabled":true},
    {"label":"midday","time":"12:30","enabled":true},
    {"label":"evening","time":"19:00","enabled":true},
    {"label":"night","time":"21:30","enabled":true}
  ]'::jsonb;
