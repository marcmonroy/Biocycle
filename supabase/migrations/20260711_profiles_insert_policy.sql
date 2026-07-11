-- Fix: add missing INSERT policy on profiles so newly-authenticated users
-- can create their own profile row during registration.
-- Root cause: RLS was enabled on profiles but no INSERT policy existed,
-- blocking every client-side INSERT regardless of auth state.
--
-- profiles.id is the PK and equals auth.uid() for the owning user
-- (it is set to data.user.id from the signUp response in RegisterScreen).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
