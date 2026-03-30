import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────

interface CheckinTime {
  label: "morning" | "midday" | "evening" | "night";
  time: string; // "HH:MM" 24h
  enabled: boolean;
}

interface Profile {
  id: string;
  genero: string | null;
  idioma: string;
  cycle_length: number;
  last_period_date: string | null;
  picardia_mode: boolean;
  whatsapp_phone: string;
  whatsapp_enabled: boolean;
  checkin_times: CheckinTime[] | null;
}

// ── Phase calculation (inlined from phaseEngine) ───────────────────────────

function getFemalePhase(cycleDay: number): string {
  if (cycleDay >= 1 && cycleDay <= 5) return "menstrual";
  if (cycleDay >= 6 && cycleDay <= 13) return "follicular";
  if (cycleDay >= 14 && cycleDay <= 17) return "ovulatory";
  if (cycleDay >= 18 && cycleDay <= 24) return "luteal";
  return "luteal"; // late luteal
}

function getMalePhase(now: Date): string {
  const hour = now.getHours();
  const dayOfWeek = now.getDay();
  if (dayOfWeek === 2) return "tuesday_peak";
  if (hour >= 6 && hour < 11) return "morning_peak";
  if (hour >= 11 && hour < 16) return "afternoon_dip";
  if (hour >= 16 && hour < 21) return "evening_balanced";
  return "night_rest";
}

function getCircadianPhase(now: Date): string {
  const hour = now.getHours();
  if (hour >= 6 && hour < 11) return "morning_peak";
  if (hour >= 11 && hour < 16) return "afternoon_dip";
  if (hour >= 16 && hour < 21) return "evening_balanced";
  return "night_rest";
}

function calculatePhase(profile: Profile, now: Date): string {
  const isFemale = profile.genero === "femenino";
  const isMale = profile.genero === "masculino";

  if (isFemale && profile.last_period_date) {
    const lastPeriod = new Date(profile.last_period_date);
    const diffDays = Math.floor(
      (now.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24),
    );
    const cycleLength = profile.cycle_length || 28;
    const cycleDay = (diffDays % cycleLength) + 1;
    return getFemalePhase(cycleDay);
  }

  if (isFemale) return getFemalePhase(14);
  if (isMale) return getMalePhase(now);
  return getCircadianPhase(now);
}

// ── Time slot matching ─────────────────────────────────────────────────────

type TimeSlot = "morning" | "midday" | "evening" | "night";

function getTimeSlot(now: Date): TimeSlot {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "midday";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/** Returns true if the slot's scheduled HH:MM falls within the current hour */
function slotMatchesCurrentHour(slot: CheckinTime, now: Date): boolean {
  if (!slot.enabled) return false;
  const [hh] = slot.time.split(":").map(Number);
  return hh === now.getHours();
}

// ── Card selection (simplified — selects from CARD_LIBRARY by phase/gender) ─

// Base Supabase Storage URL for library images
const LIB_BASE =
  "https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library";

// Phase→card mapping (representative cards from CARD_LIBRARY)
const PHASE_CARD_MAP: Record<
  string,
  { id: string; image: string; teaser_EN: string; teaser_ES: string }
> = {
  ovulatory: {
    id: "f_ovulatory_morning_v1",
    image: `${LIB_BASE}/f_ovulatory_morning_v1.png`,
    teaser_EN: "⚡ PEAK POWER\n\n\"She has entered the room.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "⚡ PODER MÁXIMO\n\n\"Ella ha entrado a la sala.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  follicular: {
    id: "f_follicular_morning_v1",
    image: `${LIB_BASE}/f_follicular_morning_v1.png`,
    teaser_EN: "🌱 ENERGY RISING\n\n\"New cycle. Clean slate. Rising energy.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "🌱 ENERGÍA EN AUMENTO\n\n\"Nuevo ciclo. Pizarrón en blanco. Energía en aumento.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  luteal: {
    id: "f_luteal_morning_v1",
    image: `${LIB_BASE}/f_luteal_morning_v1.png`,
    teaser_EN: "🧠 INNER CRITIC ALERT\n\n\"The critic is loud this week.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "🧠 ALERTA: CRÍTICO INTERIOR\n\n\"El crítico interior está fuerte esta semana.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  menstrual: {
    id: "f_menstrual_morning_v1",
    image: `${LIB_BASE}/f_menstrual_morning_v1.png`,
    teaser_EN: "🔴 REST PROTOCOL\n\n\"Rest is the strategy today.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "🔴 PROTOCOLO DE DESCANSO\n\n\"El descanso es la estrategia hoy.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  morning_peak: {
    id: "m_morning_peak_morning_v1",
    image: `${LIB_BASE}/m_morning_peak_morning_v1.png`,
    teaser_EN: "⚡ T PEAK WINDOW\n\n\"Testosterone peaks 30 minutes after waking.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "⚡ VENTANA PICO DE T\n\n\"La testosterona llega al pico 30 minutos después de despertar.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  tuesday_peak: {
    id: "m_tuesday_peak_morning_v1",
    image: `${LIB_BASE}/m_tuesday_peak_morning_v1.png`,
    teaser_EN: "📈 WEEKLY PEAK\n\n\"Tuesday is your biological peak day.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "📈 PICO SEMANAL\n\n\"El martes es tu día pico biológico.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  afternoon_dip: {
    id: "both_afternoon_dip_midday_v1",
    image: `${LIB_BASE}/both_afternoon_dip_midday_v1.png`,
    teaser_EN: "😴 CIRCADIAN DIP\n\n\"The 2 PM crash is not your fault.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "😴 DIP CIRCADIANO\n\n\"El bajón de las 2 PM no es tu culpa.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  evening_balanced: {
    id: "both_evening_balanced_evening_v1",
    image: `${LIB_BASE}/both_evening_balanced_evening_v1.png`,
    teaser_EN: "🤝 CONNECTION WINDOW\n\n\"The evening window is for connection.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "🤝 VENTANA DE CONEXIÓN\n\n\"La ventana de la tarde es para la conexión.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  night_rest: {
    id: "both_night_rest_night_v1",
    image: `${LIB_BASE}/both_night_rest_night_v1.png`,
    teaser_EN: "💤 DATA BUILDING\n\n\"Sleep is when the data becomes intelligence.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "💤 CONSTRUYENDO DATOS\n\n\"El sueño es cuando los datos se convierten en inteligencia.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
  weekly_peak: {
    id: "m_tuesday_peak_morning_v1",
    image: `${LIB_BASE}/m_tuesday_peak_morning_v1.png`,
    teaser_EN: "📈 WEEKLY PEAK\n\n\"Tuesday is your biological peak day.\"\n\nDiscover your biological pattern at biocycle.app",
    teaser_ES: "📈 PICO SEMANAL\n\n\"El martes es tu día pico biológico.\"\n\nDescubre tu patrón biológico en biocycle.app",
  },
};

const FALLBACK_CARD = {
  id: "both_evening_balanced_evening_v1",
  image: `${LIB_BASE}/both_evening_balanced_evening_v1.png`,
  teaser_EN: "🤝 CONNECTION WINDOW\n\n\"The evening window is for connection.\"\n\nDiscover your biological pattern at biocycle.app",
  teaser_ES: "🤝 VENTANA DE CONEXIÓN\n\n\"La ventana de la tarde es para la conexión.\"\n\nDescubre tu patrón biológico en biocycle.app",
};

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST (from pg_cron or manual trigger)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sendCardUrl = `${supabaseUrl}/functions/v1/send-whatsapp-card`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const currentHour = now.getHours();
  const currentTimeSlot = getTimeSlot(now);

  console.log(`[schedule-cards] Running at hour=${currentHour}, slot=${currentTimeSlot}`);

  // 1. Fetch all WhatsApp-enabled profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, genero, idioma, cycle_length, last_period_date, picardia_mode, whatsapp_phone, whatsapp_enabled, checkin_times",
    )
    .eq("whatsapp_enabled", true)
    .not("whatsapp_phone", "is", null);

  if (profilesError) {
    console.error("[schedule-cards] Failed to fetch profiles:", profilesError);
    return new Response(
      JSON.stringify({ error: "Failed to fetch profiles", detail: profilesError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const eligible: Profile[] = profiles ?? [];
  console.log(`[schedule-cards] Found ${eligible.length} WhatsApp-enabled profiles`);

  const results: { userId: string; status: string; detail?: string }[] = [];

  for (const profile of eligible) {
    try {
      // 2. Check if any enabled slot matches the current hour
      const times: CheckinTime[] = Array.isArray(profile.checkin_times)
        ? profile.checkin_times
        : [
            { label: "morning", time: "07:30", enabled: true },
            { label: "midday", time: "12:30", enabled: true },
            { label: "evening", time: "19:00", enabled: true },
            { label: "night", time: "21:30", enabled: true },
          ];

      const enabledSlots = times.filter((s) => s.enabled).map((s) => s.time).join(", ");
      console.log(`[schedule-cards] User ${profile.id} enabled slots: [${enabledSlots}] — checking hour ${currentHour}`);

      const matchingSlot = times.find((slot) => slotMatchesCurrentHour(slot, now));
      if (!matchingSlot) {
        console.log(`[schedule-cards] User ${profile.id} — no slot matches hour ${currentHour}, skipping`);
        continue;
      }
      console.log(`[schedule-cards] User ${profile.id} matched slot ${matchingSlot.label} (${matchingSlot.time})`);


      // 3. Determine phase
      const phase = calculatePhase(profile, now);
      const card = PHASE_CARD_MAP[phase] ?? FALLBACK_CARD;
      const isSpanish = profile.idioma === "ES";
      const teaserText = isSpanish ? card.teaser_ES : card.teaser_EN;
      const language = isSpanish ? "ES" : "EN";

      console.log(
        `[schedule-cards] Sending to user=${profile.id} phase=${phase} slot=${matchingSlot.label}`,
      );

      // 4. Call send-whatsapp-card edge function
      let twilio_sid: string | null = null;
      let success = false;
      let error_message: string | null = null;

      try {
        const sendRes = await fetch(sendCardUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: profile.id,
            cardId: card.id,
            teaserText,
            phoneNumber: profile.whatsapp_phone,
            language,
          }),
        });

        const sendData = await sendRes.json();
        if (sendData.success && sendData.sid) {
          twilio_sid = sendData.sid;
          success = true;
        } else {
          error_message =
            sendData.error?.message ?? JSON.stringify(sendData.error) ?? "Unknown error";
        }
      } catch (sendErr) {
        error_message =
          sendErr instanceof Error ? sendErr.message : "Fetch failed";
      }

      // 5. Log to whatsapp_sends
      await supabase.from("whatsapp_sends").insert({
        user_id: profile.id,
        card_id: card.id,
        phone_number: profile.whatsapp_phone,
        teaser_text: teaserText,
        image_url: card.image,
        twilio_sid,
        success,
        error_message,
      });

      results.push({
        userId: profile.id,
        status: success ? "sent" : "failed",
        detail: success ? twilio_sid ?? undefined : error_message ?? undefined,
      });
    } catch (userErr) {
      // Gracefully handle per-user errors without stopping others
      const msg = userErr instanceof Error ? userErr.message : "Unknown error";
      console.error(`[schedule-cards] Error for user=${profile.id}:`, msg);
      results.push({ userId: profile.id, status: "error", detail: msg });
    }
  }

  console.log(
    `[schedule-cards] Done. sent=${results.filter((r) => r.status === "sent").length} failed=${results.filter((r) => r.status !== "sent").length}`,
  );

  return new Response(
    JSON.stringify({ ok: true, hour: currentHour, slot: currentTimeSlot, results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
