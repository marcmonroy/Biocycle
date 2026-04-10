import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+16625688859';
const TEMPLATE_EN        = 'HX2a761c6b6589f010cd416d1bf4f386d8';
const TEMPLATE_ES        = 'HXa511293ce070bfd02ac0d799b2aa6526';
const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY        = Deno.env.get('SERVICE_ROLE_KEY')!;

// Teaser texts per slot, gender, language — plain ASCII, max 160 chars, no emojis
const TEASERS: Record<string, Record<string, Record<string, string>>> = {
  morning: {
    male: {
      EN: 'Your testosterone is highest right now. BioCycle is tracking your peak. Check your morning card.',
      ES: 'Tu testosterona esta en su punto mas alto ahora. BioCycle registra tu pico. Ve tu tarjeta.',
    },
    female: {
      EN: 'Your biological patterns are building. Check your morning card from Jules.',
      ES: 'Tus patrones biologicos se estan formando. Ve tu tarjeta de la manana de Jules.',
    },
  },
  afternoon: {
    male: {
      EN: 'Afternoon check-in with Jules. Your data is building value. Tap to see your card.',
      ES: 'Check-in de la tarde con Jules. Tus datos acumulan valor. Toca para ver tu tarjeta.',
    },
    female: {
      EN: 'Jules has your afternoon card ready. Your biological data is growing. Check in now.',
      ES: 'Jules tiene tu tarjeta de la tarde lista. Tus datos biologicos crecen. Registrate ahora.',
    },
  },
  night: {
    male: {
      EN: 'Time for your night wrap with Jules. Rate your day and protect your streak.',
      ES: 'Es hora de tu cierre nocturno con Jules. Califica tu dia y protege tu racha.',
    },
    female: {
      EN: 'Jules is ready for your night check-in. One last session to close the day strong.',
      ES: 'Jules esta lista para tu check-in nocturno. Una ultima sesion para cerrar el dia.',
    },
  },
};

function getCurrentSlot(hour: number): 'morning' | 'afternoon' | 'night' | null {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 23) return 'night';
  return null;
}

function normalizeGender(g: string): 'male' | 'female' {
  const lower = (g || '').toLowerCase();
  if (lower === 'male' || lower === 'masculino' || lower === 'm') return 'male';
  return 'female';
}

function getTeaser(slot: string, gender: string, lang: string): string {
  const g = normalizeGender(gender);
  const l = lang === 'ES' ? 'ES' : 'EN';
  return TEASERS[slot]?.[g]?.[l] ?? TEASERS[slot]?.['female']?.['EN'] ?? 'BioCycle check-in time.';
}

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

  const data = await res.json();
  console.log('[schedule-cards] Twilio response:', res.status, data.sid || data.code);
  return res.status === 201;
}

async function logSend(supabase: any, userId: string, phone: string, slot: string, teaser: string) {
  await supabase.from('whatsapp_sends').insert({
    user_id:     userId,
    phone,
    slot,
    teaser_text: teaser,
    status:      'sent',
    sent_at:     new Date().toISOString(),
  }).catch(() => {/* non-blocking */});
}

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const nowUTC   = new Date();
    const hour     = nowUTC.getUTCHours();
    const slot     = getCurrentSlot(hour);
    const today    = nowUTC.toISOString().split('T')[0];

    console.log(`[schedule-cards] hour=${hour} slot=${slot} date=${today}`);

    if (!slot) {
      return new Response(JSON.stringify({ skipped: true, reason: 'outside slot hours' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch active traders with WhatsApp enabled
    const { data: traders, error } = await supabase
      .from('profiles')
      .select('id, whatsapp_phone, genero, idioma, checkin_times, days_of_data, fecha_nacimiento')
      .eq('whatsapp_verified', true)
      .not('whatsapp_phone', 'is', null);

    if (error) {
      console.error('[schedule-cards] fetch error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    console.log(`[schedule-cards] found ${traders?.length ?? 0} eligible traders`);

    let sent = 0;
    let skipped = 0;

    for (const trader of (traders || [])) {
      try {
        // Check if trader's checkin_time for this slot matches current hour
        const checkinHour = trader.checkin_times?.[slot]?.hour;
        if (checkinHour === undefined || checkinHour !== hour) {
          skipped++;
          continue;
        }

        // Check if already sent this slot today
        const { data: alreadySent } = await supabase
          .from('whatsapp_sends')
          .select('id')
          .eq('user_id', trader.id)
          .eq('slot', slot)
          .gte('sent_at', `${today}T00:00:00Z`)
          .limit(1);

        if (alreadySent && alreadySent.length > 0) {
          skipped++;
          continue;
        }

        // Validate phone
        const digits = (trader.whatsapp_phone || '').replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) {
          skipped++;
          continue;
        }

        const gender  = trader.genero || 'female';
        const lang    = trader.idioma === 'ES' ? 'ES' : 'EN';
        const teaser  = getTeaser(slot, gender, lang);

        const ok = await sendWhatsApp(trader.whatsapp_phone, teaser, lang);
        if (ok) {
          await logSend(supabase, trader.id, trader.whatsapp_phone, slot, teaser);

          // Update last_response_date in user_state
          await supabase.from('user_state')
            .update({ last_response_date: new Date().toISOString() })
            .eq('user_id', trader.id);

          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[schedule-cards] error for user ${trader.id}:`, err);
        skipped++;
      }
    }

    console.log(`[schedule-cards] done. sent=${sent} skipped=${skipped}`);
    return new Response(JSON.stringify({ sent, skipped, slot, hour }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[schedule-cards] fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
