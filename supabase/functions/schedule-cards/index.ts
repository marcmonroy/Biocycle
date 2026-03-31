import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Types ──────────────────────────────────────────────────────────────────

interface CheckinTime {
  label: "morning" | "afternoon" | "night";
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

type TimeSlot = "morning" | "afternoon" | "night";

// Dominican Republic is UTC-4 (fixed offset, no DST)
const DR_UTC_OFFSET = -4;

function getLocalHour(now: Date): number {
  return (now.getUTCHours() + DR_UTC_OFFSET + 24) % 24;
}

function getTimeSlot(now: Date): TimeSlot {
  const hour = getLocalHour(now);
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 19) return "afternoon";
  return "night";
}

/** Returns true if the slot's scheduled HH:MM matches the current local hour */
function slotMatchesCurrentHour(slot: CheckinTime, now: Date): boolean {
  if (!slot.enabled) return false;
  const [hh] = slot.time.split(":").map(Number);
  return hh === getLocalHour(now);
}

// ── Card library with version rotation support ─────────────────────────────

// Base Supabase Storage URL for library images
const LIB_BASE =
  "https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library";

// Card versions available per phase+slot. Versions are tried in order; first
// one not found in recent sends wins.
const CARD_VERSIONS = ["v1", "v2", "v3"] as const;

// Base card ID patterns: {prefix}_{slot}  (version appended at selection time)
// slot values: morning | afternoon | night
const PHASE_SLOT_BASES: Record<string, Record<string, string>> = {
  ovulatory: {
    morning:   "f_ovulatory_morning",
    afternoon: "f_ovulatory_midday",
    night:     "f_ovulatory_night",
  },
  follicular: {
    morning:   "f_follicular_morning",
    afternoon: "f_follicular_midday",
    night:     "f_follicular_night",
  },
  luteal: {
    morning:   "f_luteal_morning",
    afternoon: "f_luteal_midday",
    night:     "f_luteal_night",
  },
  menstrual: {
    morning:   "f_menstrual_morning",
    afternoon: "f_menstrual_midday",
    night:     "f_menstrual_night",
  },
  morning_peak: {
    morning:   "m_morning_peak_morning",
    afternoon: "m_morning_peak_midday",
    night:     "m_morning_peak_night",
  },
  tuesday_peak: {
    morning:   "m_tuesday_peak_morning",
    afternoon: "m_tuesday_peak_midday",
    night:     "m_tuesday_peak_night",
  },
  weekly_peak: {
    morning:   "m_tuesday_peak_morning",
    afternoon: "m_tuesday_peak_midday",
    night:     "m_tuesday_peak_night",
  },
  afternoon_dip: {
    morning:   "both_afternoon_dip_morning",
    afternoon: "both_afternoon_dip_midday",
    night:     "both_afternoon_dip_night",
  },
  evening_balanced: {
    morning:   "both_evening_balanced_morning",
    afternoon: "both_evening_balanced_midday",
    night:     "both_evening_balanced_evening",
  },
  night_rest: {
    morning:   "both_night_rest_morning",
    afternoon: "both_night_rest_midday",
    night:     "both_night_rest_night",
  },
};

// Teaser text by phase (language-independent from slot)
const PHASE_TEASERS: Record<string, { EN: string; ES: string }> = {
  ovulatory:       { EN: "PEAK POWER — \"She has entered the room.\" Discover your biological pattern at biocycle.app", ES: "PODER MAXIMO — \"Ella ha entrado a la sala.\" Descubre tu patron biologico en biocycle.app" },
  follicular:      { EN: "ENERGY RISING — \"New cycle. Clean slate. Rising energy.\" Discover your biological pattern at biocycle.app", ES: "ENERGIA EN AUMENTO — \"Nuevo ciclo. Pizarron en blanco. Energia en aumento.\" Descubre tu patron biologico en biocycle.app" },
  luteal:          { EN: "INNER CRITIC ALERT — \"The critic is loud this week.\" Discover your biological pattern at biocycle.app", ES: "ALERTA CRITICO INTERIOR — \"El critico interior esta fuerte esta semana.\" Descubre tu patron biologico en biocycle.app" },
  menstrual:       { EN: "REST PROTOCOL — \"Rest is the strategy today.\" Discover your biological pattern at biocycle.app", ES: "PROTOCOLO DE DESCANSO — \"El descanso es la estrategia hoy.\" Descubre tu patron biologico en biocycle.app" },
  morning_peak:    { EN: "T PEAK WINDOW — \"Testosterone peaks 30 minutes after waking.\" Discover your biological pattern at biocycle.app", ES: "VENTANA PICO DE T — \"La testosterona llega al pico 30 minutos despues de despertar.\" Descubre tu patron biologico en biocycle.app" },
  tuesday_peak:    { EN: "WEEKLY PEAK — \"Tuesday is your biological peak day.\" Discover your biological pattern at biocycle.app", ES: "PICO SEMANAL — \"El martes es tu dia pico biologico.\" Descubre tu patron biologico en biocycle.app" },
  weekly_peak:     { EN: "WEEKLY PEAK — \"Tuesday is your biological peak day.\" Discover your biological pattern at biocycle.app", ES: "PICO SEMANAL — \"El martes es tu dia pico biologico.\" Descubre tu patron biologico en biocycle.app" },
  afternoon_dip:   { EN: "CIRCADIAN DIP — \"The 2 PM crash is not your fault.\" Discover your biological pattern at biocycle.app", ES: "DIP CIRCADIANO — \"El bajon de las 2 PM no es tu culpa.\" Descubre tu patron biologico en biocycle.app" },
  evening_balanced:{ EN: "CONNECTION WINDOW — \"The evening window is for connection.\" Discover your biological pattern at biocycle.app", ES: "VENTANA DE CONEXION — \"La ventana de la tarde es para la conexion.\" Descubre tu patron biologico en biocycle.app" },
  night_rest:      { EN: "DATA BUILDING — \"Sleep is when the data becomes intelligence.\" Discover your biological pattern at biocycle.app", ES: "CONSTRUYENDO DATOS — \"El sueno es cuando los datos se convierten en inteligencia.\" Descubre tu patron biologico en biocycle.app" },
};

const FALLBACK_CARD_BASE = "both_evening_balanced_evening";
const FALLBACK_TEASER_EN = "CONNECTION WINDOW — \"The evening window is for connection.\" Discover your biological pattern at biocycle.app";
const FALLBACK_TEASER_ES = "VENTANA DE CONEXION — \"La ventana de la tarde es para la conexion.\" Descubre tu patron biologico en biocycle.app";

/** Select the best card version for a user, rotating away from recently sent ones */
async function selectCard(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  phase: string,
  slot: TimeSlot,
): Promise<{ id: string; image: string; teaser_EN: string; teaser_ES: string }> {
  // Look up the base card ID for this phase+slot
  const slotBases = PHASE_SLOT_BASES[phase] ?? PHASE_SLOT_BASES["evening_balanced"];
  const base = slotBases?.[slot] ?? FALLBACK_CARD_BASE;
  const teasers = PHASE_TEASERS[phase] ?? { EN: FALLBACK_TEASER_EN, ES: FALLBACK_TEASER_ES };

  // Query recently sent card IDs (last 14 days) to avoid repeats
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSends } = await supabaseClient
    .from("whatsapp_sends")
    .select("card_id")
    .eq("user_id", userId)
    .eq("success", true)
    .gte("sent_at", since)
    .order("sent_at", { ascending: false });

  const recentCardIds = new Set((recentSends ?? []).map((s: { card_id: string }) => s.card_id));

  // Pick first version not in recent sends, fall back to v1
  let selectedVersion = CARD_VERSIONS[0];
  for (const v of CARD_VERSIONS) {
    const candidate = `${base}_${v}`;
    if (!recentCardIds.has(candidate)) {
      selectedVersion = v;
      break;
    }
  }

  const cardId = `${base}_${selectedVersion}`;
  return {
    id: cardId,
    image: `${LIB_BASE}/${cardId}.png`,
    teaser_EN: teasers.EN,
    teaser_ES: teasers.ES,
  };
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only accept POST (from pg_cron or manual trigger)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY")!;
  const sendCardUrl = `${supabaseUrl}/functions/v1/send-whatsapp-card`;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const utcHour = now.getUTCHours();
  const localHour = getLocalHour(now);
  const currentTimeSlot = getTimeSlot(now);

  console.log(`[schedule-cards] Running at utcHour=${utcHour}, localHour=${localHour} (DR UTC-4), slot=${currentTimeSlot}`);

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
      // 2. Parse checkin_times — handles both pre-parsed object and raw JSON string
      const rawTimes = profile.checkin_times;
      const checkinTimes: CheckinTime[] = (() => {
        try {
          const parsed = typeof rawTimes === "string" ? JSON.parse(rawTimes) : rawTimes;
          return Array.isArray(parsed) && parsed.length > 0
            ? parsed
            : [
                { label: "morning",   time: "07:30", enabled: true },
                { label: "afternoon", time: "14:00", enabled: true },
                { label: "night",     time: "21:30", enabled: true },
              ];
        } catch {
          console.warn(`[schedule-cards] User ${profile.id} — failed to parse checkin_times, using defaults`);
          return [
            { label: "morning",   time: "07:30", enabled: true },
            { label: "afternoon", time: "14:00", enabled: true },
            { label: "night",     time: "21:30", enabled: true },
          ];
        }
      })();

      console.log(
        `[schedule-cards] User ${profile.id} checkinTimes=${JSON.stringify(checkinTimes)} localHour=${localHour}`,
      );

      const matchingSlot = checkinTimes.find((slot) => {
        if (!slot.enabled) return false;
        const slotHour = parseInt(slot.time.split(":")[0], 10);
        return slotHour === localHour;
      });

      if (!matchingSlot) {
        console.log(`[schedule-cards] User ${profile.id} — no slot matches localHour=${localHour}, skipping`);
        continue;
      }
      console.log(`[schedule-cards] User ${profile.id} — matched slot label=${matchingSlot.label} time=${matchingSlot.time}`);


      // 3. Determine phase and card (with version rotation)
      const phase = calculatePhase(profile, now);
      const card = await selectCard(supabase, profile.id, phase, matchingSlot.label as TimeSlot);
      const isSpanish = profile.idioma === "ES";

      const FALLBACK_TEASER = "Tu biologia tiene algo importante que decirte hoy.";
      const rawTeaser = (isSpanish ? card.teaser_ES : card.teaser_EN) || "";
      const teaserText = (() => {
        let t = rawTeaser
          // Strip emoji (Unicode ranges for emoji/symbols)
          .replace(/[\u{1F000}-\u{1FFFF}|\u{2600}-\u{27FF}|\u{2300}-\u{23FF}|\u{1F300}-\u{1F9FF}|\u{FE00}-\u{FEFF}]/gu, "")
          // Remove newlines and carriage returns
          .replace(/[\n\r]/g, " ")
          // Remove characters that could break JSON (control chars)
          .replace(/[\x00-\x1F\x7F]/g, "")
          // Collapse multiple spaces
          .replace(/  +/g, " ")
          .trim();
        if (!t) t = FALLBACK_TEASER;
        // Hard cap at 160 characters
        if (t.length > 160) t = t.slice(0, 157) + "...";
        return t;
      })();
      const language = isSpanish ? "ES" : "EN";

      // Phone number passed exactly as stored — no modification
      const phoneNumber = profile.whatsapp_phone;

      if (!phoneNumber) {
        console.warn(`[schedule-cards] User ${profile.id} — whatsapp_phone is empty, skipping`);
        results.push({ userId: profile.id, status: "skipped", detail: "no phone number" });
        continue;
      }

      console.log(
        `[schedule-cards] Sending to user=${profile.id} phone=${phoneNumber} phase=${phase} slot=${matchingSlot.label}`,
      );
      console.log(`[schedule-cards] teaserText (${teaserText.length} chars): "${teaserText}"`);

      // 4. Call send-whatsapp-card edge function
      console.log(`[schedule-cards] Calling send-whatsapp-card url=${sendCardUrl} authKey=SERVICE_ROLE key_prefix=${serviceRoleKey.slice(0, 8)}...`);
      let twilio_sid: string | null = null;
      let success = false;
      let error_message: string | null = null;
      let httpStatus: number | null = null;

      try {
        const sendRes = await fetch(sendCardUrl, {
          method: "POST",
          headers: {
            Authorization: "Bearer " + serviceRoleKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: profile.id,
            cardId: card.id,
            teaserText,
            phoneNumber,
            language,
            timeSlot: matchingSlot.label,
          }),
        });

        httpStatus = sendRes.status;
        let sendData: Record<string, unknown>;

        try {
          sendData = await sendRes.json();
        } catch {
          throw new Error(`Non-JSON response from send-whatsapp-card (HTTP ${httpStatus})`);
        }

        console.log(`[schedule-cards] send-whatsapp-card response HTTP=${httpStatus}:`, JSON.stringify(sendData));

        if (sendData.success && sendData.sid) {
          twilio_sid = sendData.sid as string;
          success = true;
          console.log(`[schedule-cards] ✓ Sent to user=${profile.id} sid=${twilio_sid}`);
        } else {
          const errDetail = sendData.error
            ? (typeof sendData.error === "object"
                ? JSON.stringify(sendData.error)
                : String(sendData.error))
            : sendData.message
            ? String(sendData.message)
            : `HTTP ${httpStatus} — no sid returned`;
          error_message = errDetail;
          console.error(`[schedule-cards] ✗ Failed for user=${profile.id}: ${error_message}`);
        }
      } catch (sendErr) {
        error_message = sendErr instanceof Error ? sendErr.message : "Fetch failed";
        console.error(`[schedule-cards] ✗ Fetch error for user=${profile.id}: ${error_message}`);
      }

      // 5. Log to whatsapp_sends
      const { error: insertErr } = await supabase.from("whatsapp_sends").insert({
        user_id: profile.id,
        card_id: card.id,
        phone_number: phoneNumber,
        teaser_text: teaserText,
        image_url: card.image,
        twilio_sid,
        success,
        error_message,
      });
      if (insertErr) {
        console.warn(`[schedule-cards] Failed to insert whatsapp_sends for user=${profile.id}: ${insertErr.message}`);
      }

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
    JSON.stringify({ ok: true, utcHour, localHour, slot: currentTimeSlot, results }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
