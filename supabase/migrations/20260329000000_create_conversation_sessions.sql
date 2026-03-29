CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  session_date date default current_date,
  time_slot text, -- morning, midday, evening, night
  phase_at_session text,
  personality_mode text default 'jules', -- jules or sienna
  emotional_score integer,
  physical_score integer,
  cognitive_score integer,
  stress_score integer,
  social_score integer,
  anxiety_score integer,
  sexual_score integer,
  session_complete boolean default false,
  enrichment_notes text,
  card_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own conversation sessions"
ON conversation_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
