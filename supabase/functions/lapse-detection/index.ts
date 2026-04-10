import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY        = Deno.env.get('SERVICE_ROLE_KEY')!;
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+16625688859';
const TEMPLATE_EN        = 'HX2a761c6b6589f010cd416d1bf4f386d8';
const TEMPLATE_ES        = 'HXa511293ce070bfd02ac0d799b2aa6526';

async function sendWhatsApp(to: string, teaserText: string, lang: string): Promise<boolean> {
  const templateSid = lang === 'ES' ? TEMPLATE_ES : TEMPLATE_EN;
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const payload = new URLSearchParams({
    From:             TWILIO_FROM,
    To:               toNumber,
    ContentSid:       templateSid,
    ContentVariables: JSON.stringify({ '1': teaserText }),
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      },
      body: payload,
    }
  );
  return res.status === 201;
}

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Fetch all active traders
    const { data: traders } = await supabase
      .from('user_state')
      .select('user_id, state, last_response_date, streak_at_lapse')
      .eq('state', 'active_trader');

    let day6Count = 0;
    let day7Count = 0;

    for (const trader of (traders || [])) {
      if (!trader.last_response_date) continue;

      const lastResponse = new Date(trader.last_response_date);
      lastResponse.setUTCHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - lastResponse.getTime()) / 86_400_000);

      if (daysSince === 6) {
        // Day 6 — send warm personal WhatsApp message
        const { data: profile } = await supabase
          .from('profiles')
          .select('nombre, genero, idioma, whatsapp_phone, whatsapp_verified, days_of_data')
          .eq('id', trader.user_id)
          .single();

        if (!profile?.whatsapp_verified || !profile?.whatsapp_phone) continue;

        const lang = profile.idioma === 'ES' ? 'ES' : 'EN';
        const name = profile.nombre || '';
        const teaser = lang === 'ES'
          ? `${name}, han pasado 6 dias. Jules te esta esperando. Tu racha y portafolio siguen activos.`
          : `${name}, it has been 6 days. Jules is waiting for you. Your streak and portfolio are still active.`;

        await sendWhatsApp(profile.whatsapp_phone, teaser, lang);
        day6Count++;
        console.log(`[lapse-detection] day-6 message sent to user ${trader.user_id}`);

      } else if (daysSince >= 7) {
        // Day 7+ — pause the trader
        const { data: profile } = await supabase
          .from('profiles')
          .select('days_of_data')
          .eq('id', trader.user_id)
          .single();

        const streakAtLapse = profile?.days_of_data ?? 0;

        // Update user_state to paused
        await supabase.from('user_state')
          .update({
            state: 'paused_trader',
            streak_at_lapse: streakAtLapse,
          })
          .eq('user_id', trader.user_id);

        // Log lapse event
        await supabase.from('lapse_events').insert({
          user_id:        trader.user_id,
          lapsed_at:      new Date().toISOString(),
          streak_at_lapse: streakAtLapse,
        });

        day7Count++;
        console.log(`[lapse-detection] paused user ${trader.user_id} after ${daysSince} days`);
      }
    }

    console.log(`[lapse-detection] day6=${day6Count} day7=${day7Count}`);
    return new Response(JSON.stringify({ day6: day6Count, paused: day7Count }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[lapse-detection] error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
