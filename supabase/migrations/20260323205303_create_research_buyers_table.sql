/*
  # Create Research Buyers Table

  1. New Tables
    - `research_buyers`
      - `id` (uuid, primary key, auto-generated)
      - `company_name` (text) - Name of the research organization
      - `contact_name` (text) - Name of the contact person
      - `email` (text) - Contact email address
      - `research_category` (text) - Category: Pharmaceutical, Nutrition, Academic, etc.
      - `research_interest` (text) - Description of research objectives
      - `status` (text, default 'pending') - Registration status
      - `created_at` (timestamptz, default now()) - Registration timestamp

  2. Security
    - Enable RLS on `research_buyers` table
    - Add policy allowing anonymous inserts for public registration form
    - No select/update/delete policies for public access (admin only via service role)

  3. Notes
    - This table stores research interest registrations from institutional buyers
    - Public can only insert, cannot read back their submissions
*/

CREATE TABLE IF NOT EXISTS research_buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  research_category text NOT NULL,
  research_interest text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE research_buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can register research interest"
  ON research_buyers
  FOR INSERT
  TO anon
  WITH CHECK (true);