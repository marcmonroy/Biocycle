/*
  # Create nutrition_logs table for daily nutrition tracking

  1. New Tables
    - `nutrition_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `log_date` (date, the date of the nutrition log)
      - `meals` (integer 1-5, number of meals)
      - `hydration` (integer 0-12, glasses of water)
      - `caffeine` (integer 0-6, cups of caffeine)
      - `alcohol` (integer 0-6, alcoholic drinks)
      - `sugar_intake` (text, one of: low, medium, high)
      - `cycle_aligned` (boolean, ate according to cycle)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `nutrition_logs` table
    - Add policies for authenticated users to manage their own data

  3. Constraints
    - Unique constraint on user_id + log_date to prevent duplicate daily entries
*/

CREATE TABLE IF NOT EXISTS nutrition_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meals integer CHECK (meals >= 1 AND meals <= 5) DEFAULT 3,
  hydration integer CHECK (hydration >= 0 AND hydration <= 12) DEFAULT 0,
  caffeine integer CHECK (caffeine >= 0 AND caffeine <= 6) DEFAULT 0,
  alcohol integer CHECK (alcohol >= 0 AND alcohol <= 6) DEFAULT 0,
  sugar_intake text CHECK (sugar_intake IN ('low', 'medium', 'high')) DEFAULT 'medium',
  cycle_aligned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition logs"
  ON nutrition_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nutrition logs"
  ON nutrition_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nutrition logs"
  ON nutrition_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own nutrition logs"
  ON nutrition_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
