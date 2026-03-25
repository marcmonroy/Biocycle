/*
  # Add Anxiety Dimension Columns

  1. Modified Tables
    - `checkins`: Add factor_ansiedad integer column (1-10 scale for anxiety level)
    - `weekly_checkins`: Add anxiety_affected_sleep boolean column

  2. Notes
    - Anxiety data has no age restriction and applies to all users
    - factor_ansiedad uses 1-10 scale where 1 is calm and 10 is very anxious
    - anxiety_affected_sleep tracks whether anxiety affected sleep quality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkins' AND column_name = 'factor_ansiedad'
  ) THEN
    ALTER TABLE checkins ADD COLUMN factor_ansiedad integer CHECK (factor_ansiedad >= 1 AND factor_ansiedad <= 10);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_checkins' AND column_name = 'anxiety_affected_sleep'
  ) THEN
    ALTER TABLE weekly_checkins ADD COLUMN anxiety_affected_sleep boolean;
  END IF;
END $$;
