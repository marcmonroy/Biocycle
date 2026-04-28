-- BioCycle V1 launch baseline migration
-- Documents the schema additions made during V1 build that aren't in earlier migration files.
-- Safe to re-run; all statements use IF NOT EXISTS.

-- V2-ready fields on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pattern_delta_vector jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS compatibility_opt_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cycle_auto_detect_enabled boolean DEFAULT true;

-- WhatsApp uniqueness (V2 social compatibility key)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp_unique
  ON profiles(whatsapp_phone)
  WHERE whatsapp_phone IS NOT NULL;

-- Forecast accuracy tracking
CREATE TABLE IF NOT EXISTS forecast_accuracy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  forecast_date date NOT NULL,
  time_slot text NOT NULL,
  dimension text NOT NULL,
  predicted_value numeric NOT NULL,
  actual_value numeric,
  accuracy_pct numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_accuracy_user
  ON forecast_accuracy(user_id, forecast_date DESC);

-- Pattern insights for "Jules noticed" moments
CREATE TABLE IF NOT EXISTS pattern_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  dimension text,
  observation text NOT NULL,
  observation_es text NOT NULL,
  confidence numeric,
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pattern_insights_user
  ON pattern_insights(user_id, created_at DESC);

-- RLS on new tables
ALTER TABLE forecast_accuracy ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'forecast_accuracy' AND policyname = 'Users can read own forecast accuracy'
  ) THEN
    CREATE POLICY "Users can read own forecast accuracy"
      ON forecast_accuracy FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pattern_insights' AND policyname = 'Users can read own pattern insights'
  ) THEN
    CREATE POLICY "Users can read own pattern insights"
      ON pattern_insights FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pattern_insights' AND policyname = 'Users can update own pattern insights'
  ) THEN
    CREATE POLICY "Users can update own pattern insights"
      ON pattern_insights FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;
