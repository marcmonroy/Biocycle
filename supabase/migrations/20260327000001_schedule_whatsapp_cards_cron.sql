-- Schedule BioCycle WhatsApp card sends every hour via pg_cron + pg_net.
-- Requires pg_cron and pg_net extensions to be enabled in Supabase dashboard.
-- Replace SERVICE_ROLE_KEY with the actual service role key from Supabase project settings.

SELECT cron.schedule(
  'send-biocycle-cards',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url    := 'https://hguqyuupwfpszsmdjrzz.supabase.co/functions/v1/schedule-cards',
    headers := '{"Authorization": "Bearer SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body   := '{}'::jsonb
  ) AS request_id;
  $$
);
