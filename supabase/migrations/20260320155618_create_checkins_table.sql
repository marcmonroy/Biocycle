/*
  # Create checkins table

  1. New Tables
    - `checkins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `checkin_date` (date, the date of the check-in)
      - `factor_emocional` (integer, emotional factor score)
      - `factor_fisico` (integer, physical factor score)
      - `factor_cognitivo` (integer, cognitive factor score)
      - `factor_estres` (integer, stress factor score)
      - `factor_social` (integer, social factor score)
      - `calidad_score` (float, overall quality score)
      - `phase_at_checkin` (text, menstrual phase at time of check-in)
      - `notas` (text, user notes)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `checkins` table
    - Add policy for users to read their own check-ins
    - Add policy for users to insert their own check-ins
    - Add policy for users to update their own check-ins
    - Add policy for users to delete their own check-ins
*/

CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_date date NOT NULL,
  factor_emocional integer,
  factor_fisico integer,
  factor_cognitivo integer,
  factor_estres integer,
  factor_social integer,
  calidad_score float,
  phase_at_checkin text,
  notas text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own checkins"
  ON checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkins"
  ON checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checkins"
  ON checkins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own checkins"
  ON checkins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS checkins_user_id_idx ON checkins(user_id);
CREATE INDEX IF NOT EXISTS checkins_date_idx ON checkins(checkin_date);
