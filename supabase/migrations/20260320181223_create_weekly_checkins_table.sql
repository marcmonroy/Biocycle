/*
  # Create weekly_checkins table for rotating weekly studies

  1. New Tables
    - `weekly_checkins`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `week_number` (integer, ISO week number)
      - `year` (integer, year of the check-in)
      - `study_type` (text, type of study e.g. 'sleep')
      - `bedtime` (time, when user went to bed)
      - `wake_time` (time, when user woke up)
      - `sleep_quality` (integer 1-10)
      - `interruptions` (integer 0-10)
      - `wake_feeling` (text, one of: exhausted, tired, rested, energized)
      - `dream_recall` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `weekly_checkins` table
    - Add policies for authenticated users to manage their own data

  3. Constraints
    - Unique constraint on user_id + year + week_number to prevent duplicate weekly entries
*/

CREATE TABLE IF NOT EXISTS weekly_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_number integer NOT NULL,
  year integer NOT NULL,
  study_type text NOT NULL DEFAULT 'sleep',
  bedtime time,
  wake_time time,
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  interruptions integer CHECK (interruptions >= 0 AND interruptions <= 10),
  wake_feeling text CHECK (wake_feeling IN ('exhausted', 'tired', 'rested', 'energized')),
  dream_recall boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, year, week_number)
);

ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own weekly checkins"
  ON weekly_checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly checkins"
  ON weekly_checkins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly checkins"
  ON weekly_checkins
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly checkins"
  ON weekly_checkins
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
