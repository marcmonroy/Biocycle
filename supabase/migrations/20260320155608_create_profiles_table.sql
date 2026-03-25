/*
  # Create profiles table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `nombre` (text, user's name)
      - `genero` (text, gender)
      - `fecha_nacimiento` (date, birth date)
      - `idioma` (text, language preference, defaults to 'ES')
      - `cycle_length` (integer, menstrual cycle length, defaults to 28)
      - `last_period_date` (date, last period start date)
      - `picardia_mode` (boolean, fun mode toggle, defaults to false)
      - `trust_stage` (text, trust level, defaults to 'seed')
      - `created_at` (timestamptz, record creation time)
      - `updated_at` (timestamptz, record update time)

  2. Security
    - Enable RLS on `profiles` table
    - Add policy for users to read their own profile
    - Add policy for users to insert their own profile
    - Add policy for users to update their own profile
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nombre text,
  genero text,
  fecha_nacimiento date,
  idioma text DEFAULT 'ES' NOT NULL,
  cycle_length integer DEFAULT 28 NOT NULL,
  last_period_date date,
  picardia_mode boolean DEFAULT false NOT NULL,
  trust_stage text DEFAULT 'seed' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
