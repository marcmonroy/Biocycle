-- Add manual_entry flag to conversation_sessions
-- Manually entered data is tracked separately for research weighting
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS manual_entry boolean default false;
