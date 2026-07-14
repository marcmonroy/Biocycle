-- Add channel column to whatsapp_verification_codes so email-path rows are
-- distinguishable from WhatsApp-path rows. Existing rows default to 'whatsapp'.
ALTER TABLE whatsapp_verification_codes
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'whatsapp';
