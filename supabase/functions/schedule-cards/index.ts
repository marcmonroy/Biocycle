import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN  = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM        = Deno.env.get('TWILIO_WHATSAPP_FROM') || 'whatsapp:+16625688859';
const TEMPLATE_EN        = 'HX49846a0b7b3de8862ed8d0da25543a7b';
const TEMPLATE_ES        = 'HXba3e40ba97a1c1ba71e56ff255d5fae0';
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

// Arc teaser data (standard mode only — mirrors cardSystem.ts ARC_TEASERS_*)
const ARC_STANDARD_FEMALE: Record<number, { en: string; es: string }> = {
  1:  { en: 'Jules just met you. She does not forget a thing.', es: 'Jules acaba de conocerte. No olvida nada.' },
  2:  { en: 'Jules is learning the difference between your good mornings and your bad ones.', es: 'Jules aprende a distinguir tus buenas mañanas de las malas.' },
  3:  { en: 'Jules is building a map of your energy. She does not know where it goes yet. She will.', es: 'Jules construye un mapa de tu energía. Aún no sabe a dónde va. Lo sabrá.' },
  4:  { en: 'Jules is learning when your body does its best work — and when it is barely holding on.', es: 'Jules aprende cuándo tu cuerpo rinde mejor — y cuándo apenas aguanta.' },
  5:  { en: 'Five days in. Jules is starting to see your pattern. You do not see it yet.', es: 'Cinco días adentro. Jules empieza a ver tu patrón. Tú aún no lo ves.' },
  6:  { en: 'Jules noticed a pattern in your mornings. She is checking if it holds.', es: 'Jules notó un patrón en tus mañanas. Está verificando si se mantiene.' },
  7:  { en: "Jules is learning your body's daily story. More predictable than you think.", es: 'Jules aprende la historia diaria de tu cuerpo. Más predecible de lo que crees.' },
  8:  { en: 'Jules is starting to map the days you are magnetic and the days you are radioactive.', es: 'Jules empieza a mapear los días en que eres magnética y los días en que eres radiactiva.' },
  9:  { en: 'Jules is learning your stress signature. Every body handles pressure differently. Yours has a tell.', es: 'Jules aprende tu firma de estrés. El tuyo tiene una señal.' },
  10: { en: 'Jules is building a picture of who you are on a good day — and on a hard one.', es: 'Jules construye una imagen de quién eres en un buen día — y en uno difícil.' },
  11: { en: 'Jules is learning which version of you needs the most space — and when she tends to show up.', es: 'Jules aprende qué versión de ti necesita más espacio — y cuándo suele aparecer.' },
  12: { en: 'Jules has noticed certain days make you sharper. Certain days make you sensitive. The pattern is forming.', es: 'Jules notó que ciertos días te vuelven más aguda. Ciertos días te vuelven sensible. El patrón toma forma.' },
  13: { en: 'Jules is beginning to recognize you — not the average version of you. You specifically.', es: 'Jules empieza a reconocerte — no la versión promedio de ti. Tú específicamente.' },
  14: { en: 'Jules has identified your personal energy peak. She is double-checking it before she tells you.', es: 'Jules identificó tu pico personal de energía. Lo verifica antes de contarte.' },
  15: { en: 'Jules is cross-referencing your sleep against your mood. The results are not surprising. They are just yours.', es: 'Jules cruza tu sueño con tu estado de ánimo. Los resultados son los tuyos.' },
  16: { en: 'Jules has a picture of your high days. Now she is filling in the low ones.', es: 'Jules tiene imagen de tus días altos. Ahora está completando los bajos.' },
  17: { en: 'Seventeen days of signals. Jules is learning that your body speaks before your mood does.', es: 'Diecisiete días de señales. Jules aprende que tu cuerpo habla antes que tu estado de ánimo.' },
  18: { en: 'Jules can now anticipate your energy windows before they arrive. She is getting ahead of you.', es: 'Jules ya puede anticipar tus ventanas de energía antes de que lleguen.' },
  19: { en: 'Jules has identified your most productive window of the month. She is preparing to show you when to use it.', es: 'Jules identificó tu ventana más productiva del mes. Se prepara para mostrarte cuándo usarla.' },
  20: { en: 'Jules has seen your body respond to stress differently across different weeks. She knows which week to watch.', es: 'Jules ha visto a tu cuerpo responder al estrés diferente en distintas semanas. Sabe qué semana vigilar.' },
  21: { en: 'Three weeks of you. Jules is no longer guessing what kind of day it is. She is starting to know.', es: 'Tres semanas de ti. Jules ya no adivina qué tipo de día es. Empieza a saberlo.' },
  22: { en: 'Jules is now separating your baseline from your cycles. What is always you and what is just this week of you.', es: 'Jules separa tu línea base de tus ciclos. Lo que siempre eres tú y lo que solo es esta semana de ti.' },
  23: { en: 'Twenty-three days in. Jules has your rhythm. She is building your personal forecast now.', es: 'Veintitrés días adentro. Jules tiene tu ritmo. Construye tu pronóstico personal.' },
  24: { en: 'Jules is now comparing this week to the same window last cycle. The patterns are holding.', es: 'Jules compara esta semana con la misma ventana del ciclo anterior. Los patrones se mantienen.' },
  25: { en: 'The data is almost complete. Jules is running your first personal forecast model tonight.', es: 'Los datos están casi completos. Jules ejecuta tu primer modelo de pronóstico personal esta noche.' },
  26: { en: 'Four days to your first forecast. Jules is finalizing your personal pattern map.', es: 'Cuatro días para tu primer pronóstico. Jules finaliza tu mapa de patrones.' },
  27: { en: 'Jules has enough data to know the kind of day you are having before you tell her.', es: 'Jules tiene suficientes datos para saber qué tipo de día tienes antes de que se lo cuentes.' },
  28: { en: 'Two days from your first forecast. Jules has seen your pattern repeat. She is ready.', es: 'Dos días para tu primer pronóstico. Jules vio tu patrón repetirse. Está lista.' },
  29: { en: 'Tomorrow Jules stops learning and starts predicting. Get ready to meet yourself.', es: 'Mañana Jules deja de aprender y empieza a predecir. Prepárate para conocerte.' },
};

const ARC_STANDARD_MALE: Record<number, { en: string; es: string }> = {
  ...ARC_STANDARD_FEMALE,
  8:  { en: 'Jules is starting to map the days your confidence runs the room and the days your cortisol does.', es: 'Jules empieza a mapear los días en que tu confianza dirige la sala y los días en que lo hace tu cortisol.' },
  10: { en: 'Jules is building a picture of who you are on a peak day — and on a depleted one.', es: 'Jules construye una imagen de quién eres en un día pico — y en uno agotado.' },
  11: { en: 'Jules is learning which version of you has the most patience — and when she tends to disappear.', es: 'Jules aprende qué versión de ti tiene más paciencia — y cuándo suele desaparecer.' },
  14: { en: 'Jules has identified your daily performance window. She is mapping it against your week.', es: 'Jules identificó tu ventana de rendimiento diario. La mapea contra tu semana.' },
  17: { en: 'Seventeen days of signals. Jules is learning that your body gives notice before your mood changes.', es: 'Diecisiete días de señales. Jules aprende que tu cuerpo avisa antes de que cambie tu estado de ánimo.' },
  21: { en: 'Three weeks of your daily rhythm. Jules is beginning to know you better than your schedule does.', es: 'Tres semanas de tu ritmo diario. Jules empieza a conocerte mejor que tu agenda.' },
  25: { en: 'The data is almost complete. Jules is running your first personal performance forecast tonight.', es: 'Los datos están casi completos. Jules ejecuta tu primer pronóstico de rendimiento personal esta noche.' },
  29: { en: 'Tomorrow Jules tells you something specific about your patterns that no one has ever put into words for you.', es: 'Mañana Jules te dice algo específico sobre tus patrones que nadie ha sabido ponerte en palabras.' },
};

function getArcTeaser(daysOfData: number, gender: string, lang: string): string | null {
  if (daysOfData >= 30 || daysOfData < 1) return null;
  const day = daysOfData + 1;
  const g = normalizeGender(gender);
  const map = g === 'male' ? ARC_STANDARD_MALE : ARC_STANDARD_FEMALE;
  const entry = map[day];
  if (!entry) return null;
  return lang === 'ES' ? entry.es : entry.en;
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

const HEADLINES: Record<string, { en: string[]; es: string[] }> = {
  female_morning: {
    en: [
      'Your brain just hit airplane mode — first class only.',
      'Coffee is optional. Your hormones already showed up.',
      'Today your follicular phase says yes to everything.',
      'Estrogen is in the building. Try not to start a project.',
      'Your morning cortisol just clocked in early.',
    ],
    es: [
      'Tu cerebro acaba de pasar a modo avión — solo primera clase.',
      'El café es opcional. Tus hormonas ya llegaron.',
      'Hoy tu fase folicular le dice que sí a todo.',
      'El estrógeno entró al edificio. Intenta no empezar un proyecto.',
      'Tu cortisol matutino acaba de entrar antes de tiempo.',
    ],
  },
  female_afternoon: {
    en: [
      'The 2pm wall just hit. Your hormones did this.',
      'Your body is in a mood and frankly it has a point.',
      'Ovulation says: be magnetic, do nothing.',
      'Cortisol dipped. Energy dipped. Standards: still high.',
      'Your afternoon called. It wants attention.',
    ],
    es: [
      'El muro de las 2pm acaba de llegar. Tus hormonas lo hicieron.',
      'Tu cuerpo está de humor y francamente tiene razón.',
      'La ovulación dice: sé magnética, no hagas nada.',
      'El cortisol bajó. La energía bajó. Los estándares: siguen altos.',
      'Tu tarde llamó. Quiere atención.',
    ],
  },
  female_night: {
    en: [
      'Sleep is where tomorrow gets made. Or unmade.',
      'Your body is filing today\'s data. Be still.',
      'Late luteal energy: protect your evening.',
      'Biologically speaking, you are dangerous right now.',
      'Tomorrow morning depends on tonight.',
    ],
    es: [
      'El sueño es donde se hace el mañana. O se deshace.',
      'Tu cuerpo está archivando los datos de hoy. Quédate quieta.',
      'Energía de luteal tardío: protege tu noche.',
      'Biológicamente hablando, eres peligrosa ahora mismo.',
      'La mañana de mañana depende de esta noche.',
    ],
  },
  male_morning: {
    en: [
      'Testosterone just clocked in. Your boss has no idea.',
      'Your shadow is bigger than you are right now.',
      'Eight arms, one mind, before 9am.',
      'Morning peak. Use the window.',
      'First thirty minutes after waking is yours. Take it.',
    ],
    es: [
      'La testosterona acaba de entrar. Tu jefe no tiene idea.',
      'Tu sombra es más grande que tú ahora mismo.',
      'Ocho brazos, una mente, antes de las 9am.',
      'Pico matutino. Usa la ventana.',
      'Los primeros treinta minutos al despertar son tuyos. Tómalos.',
    ],
  },
  male_afternoon: {
    en: [
      'Your data is making more money than you today.',
      'The 2pm crash is gravity. Don\'t fight it.',
      'Your laptop has more battery than you do.',
      'Workplace cortisol is real. Jules sees it.',
      'Casual conversation > 2-hour meeting. Always.',
    ],
    es: [
      'Tus datos están ganando más dinero que tú hoy.',
      'El crash de las 2pm es gravedad. No lo pelees.',
      'Tu laptop tiene más batería que tú.',
      'El cortisol laboral es real. Jules lo ve.',
      'Conversación casual > reunión de 2 horas. Siempre.',
    ],
  },
  male_night: {
    en: [
      'Sleep is where testosterone is made. Or lost.',
      'Every hour past midnight costs tomorrow.',
      'Tonight\'s data: very specific.',
      'The grind is optional. Recovery is not.',
      'Your second wind betrayed you. Sleep anyway.',
    ],
    es: [
      'El sueño es donde se hace la testosterona. O se pierde.',
      'Cada hora pasada de la medianoche cuesta el mañana.',
      'Datos de esta noche: muy específicos.',
      'El grind es opcional. La recuperación no.',
      'Tu segundo aire te traicionó. Duerme igual.',
    ],
  },
};

function pickHeadline(gender: string, slot: string, lang: string, daysOfData: number): string {
  const g = gender === 'male' ? 'male' : 'female';
  const key = `${g}_${slot}`;
  const pool = HEADLINES[key];
  if (!pool) return getTeaser(slot, gender, lang);
  const list = lang === 'ES' ? pool.es : pool.en;
  const today = new Date();
  const dayKey = today.getUTCFullYear() * 1000 + today.getUTCMonth() * 50 + today.getUTCDate() + daysOfData;
  return list[dayKey % list.length];
}

async function sendWhatsApp(to: string, bodyText: string, lang: string): Promise<boolean> {
  const templateSid = lang === 'ES' ? TEMPLATE_ES : TEMPLATE_EN;
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const payload = new URLSearchParams({
    From:             TWILIO_FROM,
    To:               toNumber,
    ContentSid:       templateSid,
    ContentVariables: JSON.stringify({ '1': bodyText }),
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
  console.log('[schedule-cards] Twilio:', res.status, data.sid || data.code, data.message || '');
  return res.status === 201;
}

async function insertPending(supabase: any, userId: string, phone: string, slot: string, teaser: string): Promise<string | null> {
  const { data, error } = await supabase.from('whatsapp_sends').insert({
    user_id:     userId,
    phone,
    slot,
    teaser_text: teaser,
    status:      'pending',
    sent_at:     new Date().toISOString(),
  }).select('id').single();
  if (error) { console.error('[schedule-cards] insertPending error:', error.message); return null; }
  return data?.id ?? null;
}

async function updateSendStatus(supabase: any, id: string, status: 'sent' | 'failed') {
  await supabase.from('whatsapp_sends').update({ status }).eq('id', id).catch(() => {/* non-blocking */});
}

async function logSend(supabase: any, userId: string, _phone: string, slot: string, teaserText: string) {
  try {
    const { error } = await supabase.from('whatsapp_sends').insert({
      user_id:     userId,
      slot:        slot,
      time_slot:   slot,
      teaser_text: teaserText,
      status:      'sent',
      sent_at:     new Date().toISOString(),
    });
    if (error) console.error('[schedule-cards] logSend error:', error.message);
  } catch (err) {
    console.error('[schedule-cards] logSend exception:', err);
  }
}

serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const nowUTC   = new Date();
    const hour     = nowUTC.getUTCHours();
    const today    = nowUTC.toISOString().split('T')[0];

    console.log(`[schedule-cards] hour=${hour} date=${today}`);

    const { data: traders, error } = await supabase
      .from('profiles')
      .select('id, whatsapp_phone, genero, idioma, checkin_times, days_of_data, fecha_nacimiento')
      .eq('whatsapp_verified', true)
      .not('whatsapp_phone', 'is', null);

    if (error) {
      console.error('[schedule-cards] fetch error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    console.log(`[schedule-cards] found ${traders?.length ?? 0} traders`);

    let sent = 0;
    let skipped = 0;

    for (const trader of (traders || [])) {
      try {
        let slot: 'morning' | 'afternoon' | 'night' | null = null;
        if      (trader.checkin_times?.morning?.hour   === hour) slot = 'morning';
        else if (trader.checkin_times?.afternoon?.hour === hour) slot = 'afternoon';
        else if (trader.checkin_times?.night?.hour     === hour) slot = 'night';

        if (!slot) { skipped++; continue; }

        const { data: alreadySent } = await supabase
          .from('whatsapp_sends')
          .select('id')
          .eq('user_id', trader.id)
          .eq('slot', slot)
          .gte('sent_at', `${today}T00:00:00Z`)
          .limit(1);

        if (alreadySent && alreadySent.length > 0) { skipped++; continue; }

        const digits = (trader.whatsapp_phone || '').replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) { skipped++; continue; }

        const gender     = trader.genero || 'female';
        const lang       = trader.idioma === 'ES' ? 'ES' : 'EN';
        const daysOfData = trader.days_of_data ?? 0;

        const greeting = lang === 'ES'
          ? (slot === 'morning' ? 'Buenos días.' : slot === 'afternoon' ? 'Pausa rápida.' : 'Antes de dormir —')
          : (slot === 'morning' ? 'Good morning.' : slot === 'afternoon' ? 'Quick check-in.' : 'Before bed —');

        const headline  = pickHeadline(gender, slot, lang, daysOfData);
        const arcTeaser = getArcTeaser(daysOfData, gender, lang);

        const teaser = arcTeaser
          ? `${greeting} ${headline} ${arcTeaser}`
          : `${greeting} ${headline}`;

        console.log(`[schedule-cards] sending to ${trader.id} slot=${slot}`);
        const ok = await sendWhatsApp(trader.whatsapp_phone, teaser, lang);
        if (ok) {
          await logSend(supabase, trader.id, trader.whatsapp_phone, slot, teaser);
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
    return new Response(JSON.stringify({ sent, skipped, hour }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[schedule-cards] fatal error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
