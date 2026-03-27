-- Add WhatsApp fields to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS whatsapp_phone text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Create whatsapp_sends log table
CREATE TABLE IF NOT EXISTS whatsapp_sends (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  card_id text NOT NULL,
  phone_number text NOT NULL,
  teaser_text text,
  image_url text,
  twilio_sid text,
  sent_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text
);

ALTER TABLE whatsapp_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own whatsapp_sends"
  ON whatsapp_sends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp_sends"
  ON whatsapp_sends FOR INSERT
  WITH CHECK (auth.uid() = user_id);
