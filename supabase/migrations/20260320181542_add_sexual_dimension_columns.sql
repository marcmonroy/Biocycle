/*
  # Add Sexual Dimension Columns

  1. Modified Tables
    - `checkins`: Add factor_sexual integer column (1-10)
    - `weekly_checkins`: Add sexual_energy integer column (1-10)
    - `nutrition_logs`: Add sexual_nutrition_impact text column (decreased, neutral, increased)

  2. Notes
    - These columns are nullable to support users under 18 who won't have sexual data
    - Constraints ensure valid ranges for integer fields
    - Text field uses check constraint for valid options
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'checkins' AND column_name = 'factor_sexual'
  ) THEN
    ALTER TABLE checkins ADD COLUMN factor_sexual integer CHECK (factor_sexual >= 1 AND factor_sexual <= 10);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weekly_checkins' AND column_name = 'sexual_energy'
  ) THEN
    ALTER TABLE weekly_checkins ADD COLUMN sexual_energy integer CHECK (sexual_energy >= 1 AND sexual_energy <= 10);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nutrition_logs' AND column_name = 'sexual_nutrition_impact'
  ) THEN
    ALTER TABLE nutrition_logs ADD COLUMN sexual_nutrition_impact text CHECK (sexual_nutrition_impact IN ('decreased', 'neutral', 'increased'));
  END IF;
END $$;
