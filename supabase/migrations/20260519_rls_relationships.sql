-- Add missing RLS policies for relationships and relationship_interactions tables

ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationship_interactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationships' AND policyname = 'Users can select own relationships'
  ) THEN
    CREATE POLICY "Users can select own relationships"
      ON relationships FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationships' AND policyname = 'Users can insert own relationships'
  ) THEN
    CREATE POLICY "Users can insert own relationships"
      ON relationships FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationships' AND policyname = 'Users can update own relationships'
  ) THEN
    CREATE POLICY "Users can update own relationships"
      ON relationships FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationships' AND policyname = 'Users can delete own relationships'
  ) THEN
    CREATE POLICY "Users can delete own relationships"
      ON relationships FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_interactions' AND policyname = 'Users can select own interactions'
  ) THEN
    CREATE POLICY "Users can select own interactions"
      ON relationship_interactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_interactions' AND policyname = 'Users can insert own interactions'
  ) THEN
    CREATE POLICY "Users can insert own interactions"
      ON relationship_interactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'relationship_interactions' AND policyname = 'Users can delete own interactions'
  ) THEN
    CREATE POLICY "Users can delete own interactions"
      ON relationship_interactions FOR DELETE
      USING (auth.uid() = user_id);
  END IF;

END $$;
