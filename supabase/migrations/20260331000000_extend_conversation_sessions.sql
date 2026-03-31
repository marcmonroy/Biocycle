-- Extend conversation_sessions for three-session model (morning / afternoon / night)
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS session_summary    text,
  ADD COLUMN IF NOT EXISTS sleep_score        integer,
  ADD COLUMN IF NOT EXISTS caffeine_count     integer,
  ADD COLUMN IF NOT EXISTS hydration_text     text,
  ADD COLUMN IF NOT EXISTS day_rating         integer,
  ADD COLUMN IF NOT EXISTS day_memory         text,
  ADD COLUMN IF NOT EXISTS alcohol            boolean;

-- Rename time_slot value mapping: old 'midday'/'evening' → 'afternoon', 'night' stays
-- (No data migration needed — new records use 'morning'/'afternoon'/'night')
