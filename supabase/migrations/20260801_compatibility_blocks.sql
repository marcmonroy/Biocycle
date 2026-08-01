-- compatibility_blocks: one-way block for compatibility invites.
-- A blocks B → B cannot send A a new compatibility invite.
-- Phone (E.164 whatsapp_phone) is the identity key throughout.
-- Block scope = compatibility invites only. Does not affect Circle,
-- search visibility, or existing accepted connections.

CREATE TABLE IF NOT EXISTS compatibility_blocks (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_phone text NOT NULL,   -- E.164, the user who blocked
  blocked_phone text NOT NULL,   -- E.164, the user who can no longer send invites
  created_at    timestamptz DEFAULT now(),
  UNIQUE (blocker_phone, blocked_phone)
);

ALTER TABLE compatibility_blocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'compatibility_blocks'
      AND policyname = 'Users manage own blocks'
  ) THEN
    -- Users may SELECT, INSERT, DELETE only rows where blocker_phone = their own
    -- verified whatsapp_phone. Service-role key bypasses this for webhook writes.
    CREATE POLICY "Users manage own blocks"
      ON compatibility_blocks
      FOR ALL
      USING (
        blocker_phone = (
          SELECT whatsapp_phone FROM profiles WHERE id = auth.uid()
        )
      )
      WITH CHECK (
        blocker_phone = (
          SELECT whatsapp_phone FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;
