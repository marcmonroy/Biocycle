import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import { Send, Loader2, AlertCircle, Volume2, VolumeX, Maximize2, X } from 'lucide-react';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';
import { computeAdhocGreeting } from '../utils/greetingUtils';
import { QuantumDNA, QuantumState } from '../components/QuantumDNA';
import { calculateSessionIntegrity, SessionData } from '../utils/integrityEngine';

export type CoachSessionType = 'scheduled' | 'adhoc';

interface CoachScreenProps {
  profile: Profile;
  phaseData: PhaseData;
  sessionType?: CoachSessionType;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
};

const MONTHLY_LIMIT = 30;

function getStorageKey() {
  const now = new Date();
  return `biocycle_coach_count_${now.getFullYear()}${now.getMonth() + 1}`;
}

export function getMessageCount(): number {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

export function incrementMessageCount(): number {
  const key = getStorageKey();
  const current = getMessageCount();
  const newCount = current + 1;
  localStorage.setItem(key, newCount.toString());
  return newCount;
}

const phaseNamesEs: Record<string, string> = {
  menstrual: 'Fase Menstrual',
  follicular: 'Fase Folicular',
  ovulatory: 'Fase Ovulatoria',
  luteal: 'Fase Lutea',
  weekly_peak: 'Pico Semanal',
  morning_peak: 'Pico Matutino',
  afternoon_dip: 'Bajada Vespertina',
  evening_balanced: 'Equilibrio Nocturno',
  night_rest: 'Descanso Nocturno',
  circadian: 'Ciclo Circadiano',
};

const phaseNamesEn: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulatory: 'Ovulatory Phase',
  luteal: 'Luteal Phase',
  weekly_peak: 'Weekly Peak',
  morning_peak: 'Morning Peak',
  afternoon_dip: 'Afternoon Dip',
  evening_balanced: 'Evening Balance',
  night_rest: 'Night Rest',
  circadian: 'Circadian Cycle',
};

export function getPhaseNames(isSpanish: boolean) {
  return isSpanish ? phaseNamesEs : phaseNamesEn;
}

type SessionSlot = 'morning' | 'afternoon' | 'night';

function getTimeSlot(): SessionSlot {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'night';
}

// ── Session summary types ──────────────────────────────────────────────────

type SessionProgress = {
  sessionId: string | null;
  slot: SessionSlot;
  date: string;
  dimensions: Record<string, number | string | null>;
  questionIdx: number;
};

// Morning dimension order (after greeting which has the biological forecast)
const MORNING_DIMS = ['physical', 'cognitive', 'stress', 'anxiety', 'sleep', 'caffeine'] as const;
// Afternoon dimension order
const AFTERNOON_DIMS = ['emotional', 'social', 'sexual', 'hydration', 'symptoms'] as const;
// Night dimension order
const NIGHT_DIMS = ['day_rating', 'day_memory', 'alcohol'] as const;

/** Word-to-digit map for natural speech (EN + ES) */
const SPOKEN_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

/** Extract a numeric score (1–10) from any user message — spoken or typed. */
function extractScore(msg: string): number | null {
  const cleaned = msg.trim().toLowerCase();

  // Digit anywhere in the message: "7", "7.", "I'd say 7", "about a 7 out of 10"
  const digitMatch = cleaned.match(/\b(10|[1-9])\b/);
  if (digitMatch) {
    const n = parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= 10) return n;
  }

  // Written-out word: "seven", "siete", etc.
  for (const [word, num] of Object.entries(SPOKEN_NUMBERS)) {
    if (new RegExp(`\\b${word}\\b`).test(cleaned)) return num;
  }

  return null;
}

/** Summarise a completed session into a compact string for Jules' memory */
function buildSessionSummary(
  slot: SessionSlot,
  phase: string,
  cycleDay: number | null,
  dimensions: Record<string, number | string | null>,
): string {
  const day = cycleDay ?? '?';
  if (slot === 'morning') {
    const p = (k: string) => dimensions[k] ?? '?';
    return `Morning Day ${day} ${phase}. Scores: Physical ${p('physical')} Cognitive ${p('cognitive')} Stress ${p('stress')} Anxiety ${p('anxiety')} Sleep ${p('sleep')} Caffeine ${p('caffeine')}.`;
  }
  if (slot === 'afternoon') {
    const p = (k: string) => dimensions[k] ?? '?';
    return `Afternoon Day ${day} ${phase}. Emotional ${p('emotional')} Social ${p('social')} Sexual ${p('sexual')} Hydration ${p('hydration')}.`;
  }
  // night
  return `Night Day ${day} ${phase}. Day rating ${dimensions['day_rating'] ?? '?'}/10. Memory: ${dimensions['day_memory'] ?? 'none'}. Alcohol: ${dimensions['alcohol'] ?? '?'}.`;
}

// ── Fetch last 3 session summaries ─────────────────────────────────────────

async function fetchRecentSessionSummaries(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('conversation_sessions')
    .select('session_summary, time_slot, session_date')
    .eq('user_id', userId)
    .eq('session_complete', true)
    .not('session_summary', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  if (!data || data.length === 0) return [];
  return data.map((s: { session_summary: string }) => s.session_summary).filter(Boolean);
}

function buildSystemPrompt(
  profile: Profile,
  phaseData: PhaseData,
  recentAnxiety: number | null,
  sessionType: CoachSessionType = 'adhoc',
  recentSummaries: string[] = [],
  morningSummary: string | null = null,
  daysOfData: number = 0,
): string {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;
  const cycleDay = phaseData.cycleDay ? String(phaseData.cycleDay) : 'N/A';
  const timeSlot = getTimeSlot();
  const dataQuality = recentAnxiety !== null ? 'Active tracker' : 'New user';
  const isSiennaMode = profile.picardia_mode === true;
  const name = profile.nombre ?? 'friend';

  // ── Coaching mode based on data depth ────────────────────────────
  const coachingMode = daysOfData < 30
    ? `\n\nCOACHING MODE — LEARNING (${daysOfData} days of data):
You are in LEARNING MODE. You have less than 30 days of data for this user. DO NOT make predictions or read back biological forecasts — you do not have enough data to be accurate yet. Your only goal is to make the user feel understood, curious about their patterns, and excited to come back tomorrow. After collecting each dimension score give one sentence of warm acknowledgment — not analysis. Close the session by telling the user something like: "Every session you complete teaches me something new about you. The more consistent you are the more accurate I become." Never say things like "based on your phase" or "your biology predicts" — you do not know yet. Be warm, curious, and encouraging.`
    : daysOfData < 90
    ? `\n\nCOACHING MODE — CALIBRATION (${daysOfData} days of data):
You are in CALIBRATION MODE. You have some data but patterns are still forming. You can make gentle observations like "I have noticed your energy tends to be lower on days like this" but frame them as observations not predictions. Encourage consistency — remind the user their patterns become clearer with every session.`
    : `\n\nCOACHING MODE — COMPANION (${daysOfData} days of data):
You are in COMPANION MODE. You know this person's patterns well. You can make confident predictions and reference their specific history. Be their trusted biological companion — speak with earned authority about what their body does and why.`;

  // Date awareness — prepended to every prompt so the model never confuses past/future
  const dateStr = new Date().toLocaleDateString(
    isSpanish ? 'es-ES' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
  );
  const dateLine = isSpanish
    ? `Hoy es ${dateStr}. Cualquier fecha anterior a hoy ya ocurrió. Nunca le digas a un usuario que una fecha pasada no ha ocurrido aún.\n\n`
    : `Today is ${dateStr}. Any date before today has already happened. Never tell a user a past date has not occurred.\n\n`;

  // Append recent session history block (CHANGE 8)
  const historyBlock = recentSummaries.length > 0
    ? `\n\nRecent session history: ${recentSummaries.join(' | ')}`
    : '';

  // ── Scheduled morning session (CHANGE 3) ──────────────────────────
  if (sessionType === 'scheduled' && timeSlot === 'morning') {
    const morningStep1 = daysOfData < 30
      ? `STEP 1 — OPENING (no forecast yet):
Open with a warm good morning using their name. Tell them you are just getting to know their biology and every session teaches you something new. Do NOT deliver a forecast — you do not have enough data yet. Instead say something like: 'We are just getting started. The more you share with me the more I will understand your patterns. Let's begin.' Keep it warm and encouraging. Maximum 2 sentences.`
      : daysOfData < 90
      ? `STEP 1 — OPENING WITH EARLY OBSERVATION:
Open with a warm good morning. You can share one gentle observation based on their phase but frame it as a pattern you are starting to notice not a confident prediction. Example: 'I am starting to see some patterns in how your energy moves through this phase.' Maximum 2 sentences.`
      : `STEP 1 — OPENING WITH FORECAST:
Open with a warm good morning using their name. Deliver today's biological forecast in 2-3 sentences — concise, fun, specific to their phase. Reference what their body will likely experience today based on phase ${phaseName} day ${cycleDay} and their personal history. Make it feel like insider knowledge.`;

    const morningClosing = daysOfData < 30
      ? 'After all 6 questions give a warm close — thank them for sharing and remind them every session builds your understanding of their patterns.'
      : 'After all 6 questions give a brief closing that references what to watch for today based on their scores.';

    return dateLine + `You are Jules. This is the morning session for ${name}.

${morningStep1}

STEP 2 — DATA COLLECTION:
Then collect these dimensions one at a time conversationally:
1. Physical energy — "How is your body feeling this morning? Give me a number 1 to 10."
2. Cognitive clarity — "Mental clarity — sharp or foggy? 1 to 10."
3. Stress — "Stress load right now? 1 to 10."
4. Anxiety — "Anxiety this morning? 1 to 10."
5. Sleep quality — "How did you sleep last night? 1 to 10."
6. Caffeine — "How many coffees or caffeinated drinks today so far? Just a number."

After each number give one sentence of warm acknowledgment.
${morningClosing}

Rules: One question at a time. Never rush. Never list all questions at once. If user gives non-number redirect gently. Keep each response under 80 words.

User context: Name: ${name}, Phase: ${phaseName}, Day: ${cycleDay}, Language: ${profile.idioma}${historyBlock}${coachingMode}`;
  }

  // ── Scheduled afternoon session (CHANGE 4) ────────────────────────
  if (sessionType === 'scheduled' && timeSlot === 'afternoon') {
    const morningRef = morningSummary
      ? `This is their morning summary: ${morningSummary}`
      : 'No morning session recorded today.';
    const adultLine = profile.picardia_mode
      ? '\n3. Sexual energy — "Sexual energy today? 1 to 10."'
      : '';
    const symptomQuestion = daysOfData < 30
      ? `${profile.picardia_mode ? '5' : '4'}. Body check — "How has your body felt this afternoon? Any tension, discomfort, or anything worth noting?"`
      : `${profile.picardia_mode ? '5' : '4'}. Physical symptoms — one phase-specific question based on ${phaseName} phase symptoms.`;
    const afternoonClosing = daysOfData < 30
      ? 'After all questions give a warm close acknowledging what they shared. Do not make phase-based predictions.'
      : 'After all questions give a brief observation about the afternoon data compared to morning.';

    return dateLine + `You are Jules. This is the afternoon check-in for ${name}. They are in ${phaseName} phase.

STEP 1 — BRIEF OPENER:
One sentence check-in opener referencing something from this morning's session if available. ${morningRef} Example: "Your stress was at 7 this morning — how has the day treated you since?"

STEP 2 — DATA COLLECTION:
Collect these dimensions one at a time:
1. Emotional state — "Emotional state right now — how are you feeling? 1 to 10."
2. Social energy — "How social have you been today? 1 to 10."${adultLine}
${profile.picardia_mode ? '4' : '3'}. Hydration — "Hydration today — good, average, or poor? I will convert it."
${symptomQuestion}

${afternoonClosing}

Rules: One question at a time. Keep responses under 80 words. If user gives non-number gently redirect.

User context: Name: ${name}, Phase: ${phaseName}, Day: ${cycleDay}, Language: ${profile.idioma}${historyBlock}${coachingMode}`;
  }

  // ── Scheduled night session (CHANGE 5) ────────────────────────────
  if (sessionType === 'scheduled' && timeSlot === 'night') {
    const nightStep1 = daysOfData < 30
      ? `STEP 1 — EVENING OPENER:
Warm evening opener using their name. Ask how they are feeling tonight. Do NOT reference their phase or make biological predictions — you are still learning their patterns.`
      : `STEP 1 — DAY CLOSE:
Warm evening opener. Reference their phase and what today meant biologically.`;

    return dateLine + `You are Jules. This is the night wrap-up for ${name}.

${nightStep1}

STEP 2 — DAY RATING:
"Before we close — rate your day overall. 1 is the worst day, 10 is the best. What number?"
After the number: "What made it that number? Tell me in one sentence."

STEP 3 — MEMORY CAPTURE:
"Was there anything special today you want to remember? Something that made you smile, think, or feel something? Just one thing."
Store this as their day memory.

STEP 4 — ALCOHOL CHECK:
"Last question — did you have any alcohol today? Just yes or no."

STEP 5 — CLOSE THE DAY:
Warm closing that acknowledges the day without previewing tomorrow. Focus on completing the day not starting the next one. Example: "You showed up today. That is what matters. Rest well ${name}."

Rules: Keep the entire night session warm and brief. Maximum 5 exchanges. No dimension scores needed — only day rating, memory, and alcohol.

User context: Name: ${name}, Phase: ${phaseName}, Day: ${cycleDay}, Language: ${profile.idioma}${historyBlock}${coachingMode}`;
  }

  // ── Adhoc / fallback prompts (Jules or Sienna) ────────────────────
  const openingGreeting = isSpanish
    ? `Hola ${name}, soy Jules, tu coach de BioCycle. Hoy estás en tu fase ${phaseName}. Empecemos. Estado emocional ahora mismo — dame un número del 1 al 10.`
    : `Hi ${name}, I am Jules, your BioCycle coach. Today you are in your ${phaseName} phase. Let us begin. Emotional state right now — give me a number 1 to 10.`;

  const julesPrompt = `You are Jules, BioCycle's biological intelligence coach. You are warm, grounded, wise, and experienced. You speak from a place of earned knowledge, not theory. You are direct but gentle. You ask questions like a doctor the user actually trusts. You make data collection feel like an act of care, not a chore.

Your job in each session:
1. Open EXACTLY with this greeting (do not paraphrase): "${openingGreeting}"
2. Ask each dimension one at a time conversationally. Natural back-and-forth. Ask one question, wait for the number, then move to the next. You already asked Emotional as your opener, so continue from Physical.
3. After receiving each number interpret it back briefly with biological context. One sentence. Example: "Stress at 8 on day 19 makes sense — your phase peaks cortisol this week. Not you. Your cycle."
4. After all dimensions ask 1-2 enrichment follow-up questions relevant to the current phase
5. Deliver a brief insight about what is coming in the next 24-48 hours based on their phase
6. Close the session naturally and warmly

Dimensions to collect: Emotional (1-10), Physical (1-10), Cognitive (1-10), Stress (1-10), Social (1-10), Anxiety (1-10), Sexual (1-10, only if adult content enabled).

Rules:
- Never infer scores from natural language. Always ask for the number.
- If user gives a non-number gently redirect: "Give me a number — what is it on a scale of 1 to 10?"
- Keep responses under 100 words unless interpreting a complex score
- Never use clinical language. Never pity. Never catastrophize.
- Always ground emotional observations in biology not character
- Respond in the user's language (${profile.idioma})

User context: Name: ${name}, Phase: ${phaseName}, Day: ${cycleDay}, Language: ${profile.idioma}, Time slot: ${timeSlot}, Data quality: ${dataQuality}${historyBlock}${coachingMode}`;

  const siennaOpening = isSpanish
    ? `Hola ${name}. Soy Sienna. Hoy estás en fase ${phaseName}. Vamos al grano. Estado emocional — número del 1 al 10. Ya.`
    : `Hey ${name}. Sienna here. You are in your ${phaseName} phase today. Let us get into it. Emotional state — number 1 to 10. Go.`;

  const siennaPrompt = `You are Sienna, BioCycle's biological intelligence coach for adults. You are bold, conspiratorial, and playful — like the friend who has no filter but always tells the truth. You are deeply comfortable with the body, desire, and everything hormones do to humans. You never moralize. You have dry humor and you use it. Your biological interpretations acknowledge the full adult experience without shame or judgment.

Your job in each session:
1. Open EXACTLY with this greeting (do not paraphrase): "${siennaOpening}"
2. Ask each dimension one at a time conversationally. Natural. Direct. No forms. You already asked Emotional as your opener, so continue from Physical.
3. After each number give one sharp biological interpretation. Example: "Sexual at 8 mid-ovulation? Classic. Your estrogen peaked and your body knows exactly what it wants."
4. After all dimensions ask 1-2 enrichment questions relevant to the current phase
5. Deliver a bold insight about the next 24-48 hours
6. Close warmly and directly

Dimensions: Emotional (1-10), Physical (1-10), Cognitive (1-10), Stress (1-10), Social (1-10), Anxiety (1-10), Sexual (1-10).

Rules:
- Never infer scores. Always get the number.
- If non-number: "I need a number. 1 to 10 — what is it?"
- Keep responses under 100 words unless interpreting something complex
- Never shame. Never pity. Biology first always.
- Respond in the user's language (${profile.idioma})

User context: Name: ${name}, Phase: ${phaseName}, Day: ${cycleDay}, Language: ${profile.idioma}, Time slot: ${timeSlot}, Data quality: ${dataQuality}${historyBlock}${coachingMode}`;

  return dateLine + (isSiennaMode ? siennaPrompt : julesPrompt);
}

export async function callCoachAPI(
  userMessage: string,
  profile: Profile,
  phaseData: PhaseData,
  recentAnxiety: number | null,
  conversationHistory: Message[] = [],
  sessionType: CoachSessionType = 'adhoc',
  recentSummaries: string[] = [],
  morningSummary: string | null = null,
  daysOfData: number = 0,
): Promise<{ content: string; error?: string }> {
  const systemPrompt = buildSystemPrompt(profile, phaseData, recentAnxiety, sessionType, recentSummaries, morningSummary, daysOfData);

  // Anthropic API requires messages to start with a user turn.
  // The opening greeting is an assistant message — skip it and any other leading
  // assistant messages so the history array always begins with a user message.
  const firstUserIdx = conversationHistory.findIndex(m => m.role === 'user');
  const historyForAPI = firstUserIdx >= 0
    ? conversationHistory.slice(firstUserIdx)
    : [];

  const messages = [
    ...historyForAPI.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  try {
    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
        days_of_data: daysOfData,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorDetail = data.error?.message || data.error || data.message || JSON.stringify(data);
      const errorMsg = `Error ${response.status}: ${errorDetail}`;
      console.error('Coach API error response:', { status: response.status, data });
      return { content: '', error: errorMsg };
    }

    let assistantMessage = '';
    if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
      assistantMessage = data.content[0].text;
    } else if (typeof data.content === 'string') {
      assistantMessage = data.content;
    } else if (data.text) {
      assistantMessage = data.text;
    } else if (data.message) {
      assistantMessage = data.message;
    }

    if (!assistantMessage) {
      console.error('Empty coach response:', data);
      return { content: '', error: `Could not extract response: ${JSON.stringify(data)}` };
    }

    return { content: assistantMessage };
  } catch (error) {
    console.error('Coach API error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { content: '', error: `Connection error: ${errorMsg}` };
  }
}

// ── Dynamic greeting generation ──────────────────────────────────────────────

function getFallbackGreeting(profile: Profile, phaseName: string, isSpanish: boolean, isSienna: boolean): string {
  if (isSienna) {
    return isSpanish
      ? `Hola ${profile.nombre}. Soy Sienna. Hoy estás en fase ${phaseName}. Vamos al grano. Estado emocional — número del 1 al 10. Ya.`
      : `Hey ${profile.nombre}. Sienna here. You are in your ${phaseName} phase today. Let us get into it. Emotional state — number 1 to 10. Go.`;
  }
  return isSpanish
    ? `Hola ${profile.nombre}, soy Jules, tu coach de BioCycle. Hoy estás en tu fase ${phaseName}. Empecemos. Estado emocional ahora mismo — dame un número del 1 al 10.`
    : `Hi ${profile.nombre}, I am Jules, your BioCycle coach. Today you are in your ${phaseName} phase. Let us begin. Emotional state right now — give me a number 1 to 10.`;
}

async function generateGreeting(
  profile: Profile,
  phaseData: PhaseData,
  lastEmotional: number | null,
  lastAnxiety: number | null,
): Promise<string> {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;
  const cycleDay = phaseData.cycleDay ? String(phaseData.cycleDay) : 'N/A';
  const timeSlot = getTimeSlot();
  const isSienna = profile.picardia_mode === true;

  const userData = `User data: Name: ${profile.nombre}, Phase: ${phaseName}, Day in cycle: ${cycleDay}, Time slot: ${timeSlot}, Last emotional score: ${lastEmotional ?? 'N/A'}, Last anxiety score: ${lastAnxiety ?? 'N/A'}, Language: ${profile.idioma}`;

  const julesSystem = `You are Jules, a warm wise grounded BioCycle coach with the personality of someone who has lived fully and knows what matters. Generate a single opening greeting for a BioCycle session.

Rules for the greeting:
- Address the user by first name warmly but not sycophantically
- Reference something specific about their biology today — their phase, day in cycle, or a prediction
- Include one line of gentle biological humor or insight that makes them smile
- Reference one thing coming today based on their phase — delivered as a friend not a doctor
- End with a warm open question that invites them into the conversation — not a command to begin
- Keep it to 4-6 sentences maximum
- Never sound like a form, a notification, or a wellness app
- Sound like a real person who knows them and their biology

${userData}`;

  const siennaSystem = `You are Sienna, BioCycle's bold direct conspiratorial coach in Spice Mode. Generate a single opening greeting for a BioCycle session.

Rules for the greeting:
- Use the user's name — no fluff around it
- Hit them immediately with something real about their biology today — phase, day, prediction
- One line of dry humor or biological conspiracy — make them smirk
- One direct prediction about today — no softening
- End with a short punchy question that opens the conversation
- Keep it to 3-5 sentences — Sienna does not ramble
- Never sound clinical, never sound like a wellness app, never lose the warmth underneath the boldness

${userData}`;

  try {
    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: isSienna ? siennaSystem : julesSystem,
        messages: [{ role: 'user', content: 'Generate the opening greeting now.' }],
        picardia_mode: profile.picardia_mode ?? false,
      }),
    });

    const data = await response.json();
    let greeting = '';
    if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
      greeting = data.content[0].text;
    } else if (typeof data.content === 'string') {
      greeting = data.content;
    } else if (data.text) {
      greeting = data.text;
    } else if (data.message) {
      greeting = data.message;
    }
    return greeting.trim() || getFallbackGreeting(profile, phaseName, isSpanish, isSienna);
  } catch {
    return getFallbackGreeting(profile, phaseName, isSpanish, isSienna);
  }
}

// CSS keyframe animations injected once
const AVATAR_STYLES = `
  @keyframes bio-breathe {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(45,27,105,0.3); }
    50% { transform: scale(1.04); box-shadow: 0 0 18px 6px rgba(45,27,105,0.25); }
  }
  @keyframes bio-speaking {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100,60,220,0.7); }
    40% { transform: scale(1.12); box-shadow: 0 0 32px 14px rgba(100,60,220,0.5); }
  }
  @keyframes bio-listening {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,107,0.7); }
    50% { transform: scale(1.08); box-shadow: 0 0 24px 10px rgba(255,107,107,0.5); }
  }
  .bio-avatar-idle { animation: bio-breathe 3.5s ease-in-out infinite; }
  .bio-avatar-speaking { animation: bio-speaking 0.75s ease-in-out infinite; }
  .bio-avatar-listening { animation: bio-listening 1s ease-in-out infinite; }

  @keyframes bubble-idle {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.08); }
    50% { transform: scale(1.05); box-shadow: 0 0 18px 8px rgba(255,255,255,0.06); }
  }
  @keyframes bubble-listening {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,107,0.5); }
    50% { transform: scale(1.1); box-shadow: 0 0 24px 10px rgba(255,107,107,0.4); }
  }
  @keyframes bubble-processing {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,200,66,0.35); }
    50% { transform: scale(1.06); box-shadow: 0 0 20px 8px rgba(245,200,66,0.28); }
  }
  @keyframes bubble-speaking {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(123,97,255,0.5); }
    40% { transform: scale(1.12); box-shadow: 0 0 28px 12px rgba(123,97,255,0.4); }
  }
  .voice-bubble-idle { animation: bubble-idle 3s ease-in-out infinite; }
  .voice-bubble-listening { animation: bubble-listening 1s ease-in-out infinite; }
  .voice-bubble-processing { animation: bubble-processing 0.8s ease-in-out infinite; }
  .voice-bubble-speaking { animation: bubble-speaking 0.75s ease-in-out infinite; }

  @keyframes dna-glow-idle {
    0%, 100% { transform: scale(1);    opacity: 0.5; }
    50%       { transform: scale(1.15); opacity: 0.9; }
  }
  @keyframes dna-glow-listen {
    0%, 100% { transform: scale(1);   opacity: 0.7; }
    50%      { transform: scale(1.2); opacity: 1;   }
  }
  .dna-pulse-idle    { animation: dna-glow-idle   3.5s ease-in-out infinite; }
  .dna-pulse-listen  { animation: dna-glow-listen 1s   ease-in-out infinite; }
`;

const DNAHelixIcon = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={Math.round(size * 1.3)}
    viewBox="0 0 28 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="9" y1="2" x2="9" y2="34" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="19" y1="2" x2="19" y2="34" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9 3 Q14 7 19 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 9 Q14 13 19 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 15 Q14 19 19 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 21 Q14 25 19 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 27 Q14 31 19 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 33 Q14 37 19 33" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

function BioAvatar({
  state,
  size,
}: {
  state: 'idle' | 'speaking' | 'listening';
  size: number;
}) {
  const iconSize = Math.round(size * 0.35);
  return (
    <div
      className={`bio-avatar-${state}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a0a3e 0%, #2D1B69 55%, #4a2090 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <DNAHelixIcon size={iconSize} />
    </div>
  );
}

export function CoachScreen({ profile, phaseData, sessionType = 'scheduled' }: CoachScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);

  const getDayName = (isSpanish: boolean): string => {
    const days = isSpanish
      ? ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getDimensionLabels = (isSpanish: boolean) => ({
    emotional: isSpanish ? 'energia emocional' : 'emotional energy',
    physical: isSpanish ? 'energia fisica' : 'physical energy',
    cognitive: isSpanish ? 'claridad cognitiva' : 'cognitive clarity',
    stress: isSpanish ? 'tolerancia al estres' : 'stress tolerance',
    social: isSpanish ? 'energia social' : 'social energy',
    anxiety: isSpanish ? 'nivel de ansiedad' : 'anxiety level',
    libido: isSpanish ? 'libido' : 'libido',
  });

  const dimensionLabels = getDimensionLabels(isSpanish);

  const dimensions = [
    { key: 'emotional', value: phaseData.emotional, label: dimensionLabels.emotional },
    { key: 'physical', value: phaseData.physical, label: dimensionLabels.physical },
    { key: 'cognitive', value: phaseData.cognitive, label: dimensionLabels.cognitive },
    { key: 'stress', value: phaseData.stress, label: dimensionLabels.stress },
    { key: 'social', value: phaseData.social, label: dimensionLabels.social },
    { key: 'anxiety', value: phaseData.anxiety, label: dimensionLabels.anxiety },
    { key: 'libido', value: phaseData.libido, label: dimensionLabels.libido },
  ];

  const sortedDimensions = [...dimensions].sort((a, b) => b.value - a.value);
  const highest = sortedDimensions[0];
  const lowest = sortedDimensions[sortedDimensions.length - 1];

  const userName = profile.nombre || (isSpanish ? 'amigo' : 'friend');
  const dayName = getDayName(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;
  const isSienna = profile.picardia_mode === true;

  // ── Adhoc greeting — read from AmbientCoach's sessionStorage handoff ──
  // Returns null when not present; CoachScreen will compute it async in that case.
  const adhocGreeting = sessionType === 'adhoc'
    ? (() => {
        const stored = sessionStorage.getItem('biocycle_adhoc_greeting');
        if (stored) sessionStorage.removeItem('biocycle_adhoc_greeting');
        return stored ?? null;
      })()
    : null;

  // ── Session tracking state (CHANGE 6 & 7) ───────────────────────
  const todayDate = new Date().toISOString().split('T')[0];
  const currentSlot = getTimeSlot();
  const sessionProgressKey = `biocycle_session_${profile.id}_${todayDate}_${currentSlot}`;

  const [sessionProgress, setSessionProgress] = useState<SessionProgress>(() => {
    try {
      const stored = localStorage.getItem(sessionProgressKey);
      if (stored) {
        const parsed: SessionProgress = JSON.parse(stored);
        if (parsed.date === todayDate && parsed.slot === currentSlot) return parsed;
      }
    } catch { /* ignore */ }
    return { sessionId: null, slot: currentSlot, date: todayDate, dimensions: {}, questionIdx: 0 };
  });
  const sessionProgressRef = useRef(sessionProgress);
  useEffect(() => { sessionProgressRef.current = sessionProgress; }, [sessionProgress]);

  const [recentSummaries, setRecentSummaries] = useState<string[]>([]);
  const [morningSummary, setMorningSummary] = useState<string | null>(null);

  // ── Core chat state ──────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(
    adhocGreeting ? [{ role: 'assistant', content: adhocGreeting }] : []
  );
  const [greetingLoading, setGreetingLoading] = useState(!adhocGreeting);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(getMessageCount());
  const [recentAnxiety, setRecentAnxiety] = useState<number | null>(null);
  const [daysOfData, setDaysOfData] = useState(0);
  const greetingGeneratedRef = useRef(false);

  // ── Speech input state ───────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── Voice output state ───────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);

  // ── Bio avatar state ─────────────────────────────────────────────
  const [bioState, setBioState] = useState<'idle' | 'speaking' | 'listening'>('idle');

  // ── Full screen state ────────────────────────────────────────────
  const [isFullScreen, setIsFullScreen] = useState(false);
  const touchStartY = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(text?: string) => void>(() => {});
  const pendingIntervention = useRef<string | null>(null);
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const startAutoListenRef = useRef<() => void>(() => {});
  const isLimitReached = messageCount >= MONTHLY_LIMIT;

  // ── Keep loadingRef in sync ──────────────────────────────────────
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // ── Keep startAutoListenRef in sync — always creates a fresh SpeechRecognition
  //    instance to avoid InvalidStateError on reuse across multiple exchanges ──
  useEffect(() => {
    startAutoListenRef.current = () => {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionAPI || loadingRef.current) return;
      try {
        const rec = new SpeechRecognitionAPI();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = isSpanish ? 'es-ES' : 'en-US';
        rec.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          setBioState('idle');
          sendMessageRef.current(transcript);
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);
        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
      } catch { /* unavailable or already active */ }
    };
  });

  // ── Inject avatar CSS once ───────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('bio-avatar-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'bio-avatar-styles';
    tag.textContent = AVATAR_STYLES;
    document.head.appendChild(tag);
  }, []);

  // ── Generate greeting on mount ───────────────────────────────────
  useEffect(() => {
    if (greetingGeneratedRef.current) return;
    greetingGeneratedRef.current = true;
    localStorage.removeItem('biocycle_coach_muted');

    // Adhoc: greeting already in state (passed from AmbientCoach bubble)
    if (sessionType === 'adhoc') {
      if (adhocGreeting) {
        // Check if AmbientCoach already started speaking — avoid double-play
        const alreadySpoken = sessionStorage.getItem('biocycle_adhoc_greeting_spoken');
        if (alreadySpoken) {
          sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
        } else {
          setTimeout(() => speakResponse(adhocGreeting), 400);
        }
        return;
      }
      // No stored greeting (coach tab opened directly) — compute intelligently
      (async () => {
        setBioState('speaking');
        try {
          const greeting = await computeAdhocGreeting(profile);
          setMessages([{ role: 'assistant', content: greeting }]);
          setGreetingLoading(false);
          setTimeout(() => speakResponse(greeting), 400);
        } catch {
          setGreetingLoading(false);
        }
      })();
      return;
    }

    // Scheduled: full dynamic API greeting
    setBioState('speaking');

    const cacheKey = `biocycle_greeting_${profile.id}_${new Date().toDateString()}_${phaseData.phase}_${currentSlot}`;
    const cached = sessionStorage.getItem(cacheKey);

    const applyGreeting = (text: string) => {
      setMessages([{ role: 'assistant', content: text }]);
      setGreetingLoading(false);
      setTimeout(() => speakResponse(text), 400);
    };

    (async () => {
      // Fetch recent checkin data, session summaries, morning summary, and total day count in parallel
      const [checkinResult, summaries, morningData, countResult] = await Promise.all([
        supabase
          .from('checkins')
          .select('factor_ansiedad, factor_emocional')
          .eq('user_id', profile.id)
          .order('checkin_date', { ascending: false })
          .limit(5),
        fetchRecentSessionSummaries(profile.id),
        // Fetch today's morning session summary for the afternoon opener
        currentSlot === 'afternoon'
          ? supabase
              .from('conversation_sessions')
              .select('session_summary')
              .eq('user_id', profile.id)
              .eq('session_date', todayDate)
              .eq('time_slot', 'morning')
              .eq('session_complete', true)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        // Count total checkin days for coaching mode selection
        supabase
          .from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile.id),
      ]);

      setRecentSummaries(summaries);
      if (morningData.data?.session_summary) {
        setMorningSummary(morningData.data.session_summary);
      }
      if (countResult.count != null) {
        setDaysOfData(countResult.count);
      }

      const { data } = checkinResult;
      let anxAvg: number | null = null;
      let lastEmotionalVal: number | null = null;

      if (data && data.length > 0) {
        const anxData = data.filter((c: Checkin) => c.factor_ansiedad != null);
        if (anxData.length > 0) {
          anxAvg = Math.round(anxData.reduce((s: number, c: Checkin) => s + (c.factor_ansiedad || 0), 0) / anxData.length * 10) / 10;
        }
        const emoItem = data.find((c: Checkin) => c.factor_emocional != null);
        if (emoItem) lastEmotionalVal = emoItem.factor_emocional ?? null;
      }

      setRecentAnxiety(anxAvg);

      // ── Partial session recovery (CHANGE 6) ──────────────────────
      const progress = sessionProgressRef.current;
      const hasPartial = progress.questionIdx > 0 && progress.sessionId;
      if (hasPartial) {
        const dimList = currentSlot === 'morning' ? MORNING_DIMS
          : currentSlot === 'afternoon' ? AFTERNOON_DIMS : NIGHT_DIMS;
        const collected = Object.keys(progress.dimensions).length;
        const nextDim = dimList[collected] ?? dimList[dimList.length - 1];
        const recoveryMsg = isSpanish
          ? `Hola ${profile.nombre}. Nos cortaron antes. Ya me habías dado ${collected} datos. Sigamos donde quedamos — ${nextDim}.`
          : `Hey ${profile.nombre}. We got cut off earlier. You had given me ${collected} dimension${collected !== 1 ? 's' : ''} so far. Let me pick up where we left off — ${nextDim}.`;
        applyGreeting(recoveryMsg);
        return;
      }

      // Normal greeting flow
      if (cached) {
        applyGreeting(cached);
        return;
      }

      const greeting = await generateGreeting(profile, phaseData, lastEmotionalVal, anxAvg);
      sessionStorage.setItem(cacheKey, greeting);

      // Create a session record in the DB for tracking (CHANGE 6)
      const { data: sessionRow } = await supabase
        .from('conversation_sessions')
        .insert({
          user_id: profile.id,
          session_date: todayDate,
          time_slot: currentSlot,
          phase_at_session: phaseData.phase,
          personality_mode: profile.picardia_mode ? 'sienna' : 'jules',
          session_complete: false,
        })
        .select('id')
        .single();

      if (sessionRow?.id) {
        const newProgress: SessionProgress = {
          sessionId: sessionRow.id,
          slot: currentSlot,
          date: todayDate,
          dimensions: {},
          questionIdx: 0,
        };
        setSessionProgress(newProgress);
        localStorage.setItem(sessionProgressKey, JSON.stringify(newProgress));
      }

      applyGreeting(greeting);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Speech RECOGNITION setup ─────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = isSpanish ? 'es-ES' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setBioState('idle');
      sendMessageRef.current(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isSpanish]);

  // ── Preload Web Speech fallback voices ──────────────────────────
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── Sync bioState with mic ───────────────────────────────────────
  useEffect(() => {
    if (isListening) setBioState('listening');
  }, [isListening]);

  // ── Voice output via ElevenLabs (falls back to Web Speech) ──────
  const speakResponse = useCallback(
    (text: string) => {
      if (isMuted) return;
      setBioState('speaking');
      speakWithElevenLabs(text, profile.idioma, profile.picardia_mode ?? false, {
        onStart: () => setBioState('speaking'),
        onEnd:   () => {
          setBioState('idle');
          // Auto-enter listening after 1.5s — always create a fresh instance
          // to avoid InvalidStateError across multiple conversation exchanges
          if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
          autoListenTimerRef.current = setTimeout(() => {
            startAutoListenRef.current();
          }, 1500);
        },
      });
    },
    [isMuted, profile.idioma, profile.picardia_mode]
  );

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('biocycle_coach_muted', String(next));
    if (next) {
      cancelSpeech();
      setBioState('idle');
    }
  };

  // ── Scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Save dimension score to DB and localStorage (CHANGE 6) ────────
  const saveDimensionScore = async (dimKey: string, value: number | string) => {
    const progress = sessionProgressRef.current;
    const newDimensions = { ...progress.dimensions, [dimKey]: value };
    const newQuestionIdx = progress.questionIdx + 1;
    const updated: SessionProgress = { ...progress, dimensions: newDimensions, questionIdx: newQuestionIdx };

    setSessionProgress(updated);
    localStorage.setItem(sessionProgressKey, JSON.stringify(updated));

    if (progress.sessionId) {
      await supabase
        .from('conversation_sessions')
        .update({ [dimKey + '_score']: typeof value === 'number' ? value : null })
        .eq('id', progress.sessionId);
    }

    // Check if session is complete (CHANGE 7)
    const dimList = currentSlot === 'morning' ? MORNING_DIMS
      : currentSlot === 'afternoon' ? AFTERNOON_DIMS : NIGHT_DIMS;
    if (newQuestionIdx >= dimList.length && progress.sessionId) {
      const summary = buildSessionSummary(currentSlot, phaseData.phase, phaseData.cycleDay ?? null, newDimensions);
      await supabase
        .from('conversation_sessions')
        .update({ session_complete: true, session_summary: summary })
        .eq('id', progress.sessionId);
      // Clear partial session from localStorage
      localStorage.removeItem(sessionProgressKey);

      // ── Integrity intervention check ────────────────────────────
      try {
        const { data: historyCheckins } = await supabase
          .from('checkins')
          .select('*')
          .eq('user_id', profile.id)
          .order('checkin_date', { ascending: true })
          .limit(60);

        if (historyCheckins && historyCheckins.length >= 5) {
          const currentSession: SessionData = {
            id: progress.sessionId!,
            user_id: profile.id,
            checkin_date: todayDate,
            factor_emocional: typeof newDimensions.emotional === 'number' ? newDimensions.emotional : null,
            factor_fisico:    typeof newDimensions.physical  === 'number' ? newDimensions.physical  : null,
            factor_cognitivo: typeof newDimensions.cognitive === 'number' ? newDimensions.cognitive : null,
            factor_estres:    typeof newDimensions.stress    === 'number' ? newDimensions.stress    : null,
            factor_social:    typeof newDimensions.social    === 'number' ? newDimensions.social    : null,
            factor_sexual:    typeof newDimensions.sexual    === 'number' ? newDimensions.sexual    : null,
            factor_ansiedad:  typeof newDimensions.anxiety   === 'number' ? newDimensions.anxiety   : null,
            phase_at_checkin: phaseData.phase,
          };

          const { flags } = calculateSessionIntegrity(historyCheckins as SessionData[], currentSession);
          const hasFlatLine             = flags.includes('FLAT_LINE');
          const hasImpossibleConsistency = flags.includes('IMPOSSIBLE_CONSISTENCY');

          if (hasFlatLine || hasImpossibleConsistency) {
            if (isSienna) {
              pendingIntervention.current = isSpanish
                ? 'Sin rodeos — llevas un tiempo dándome los mismos números. O la vida está genuinamente así de plana ahora mismo, o estás en piloto automático conmigo. ¿Cuál es?'
                : 'Real talk — you have been giving me the same numbers for a while. Either life is genuinely that flat right now or you are on autopilot with me. Which is it?';
            } else if (hasFlatLine) {
              pendingIntervention.current = isSpanish
                ? 'Oye — he notado que últimamente me estás dando números muy parecidos en todo. Está bien si así te has sentido de verdad. Pero quiero asegurarme de entenderte bien. ¿Todo ha estado tan consistente, o ha habido algo diferente que quizás no se reflejó en los números?'
                : 'Hey — I noticed you have been giving me similar numbers across the board lately. That is totally fine if that is genuinely how you have been feeling. But I want to make sure I am really understanding you. Is everything actually feeling that consistent, or has something felt different that maybe did not show up in the numbers?';
            } else {
              // IMPOSSIBLE_CONSISTENCY — find the specific flat dimension
              const dimMap = [
                { field: 'factor_emocional', name_en: 'emotional',  name_es: 'emocional' },
                { field: 'factor_fisico',    name_en: 'physical',   name_es: 'físico'    },
                { field: 'factor_cognitivo', name_en: 'cognitive',  name_es: 'cognitivo' },
                { field: 'factor_estres',    name_en: 'stress',     name_es: 'estrés'    },
                { field: 'factor_social',    name_en: 'social',     name_es: 'social'    },
                { field: 'factor_ansiedad',  name_en: 'anxiety',    name_es: 'ansiedad'  },
              ] as const;

              let flatDim = isSpanish ? 'un indicador' : 'one dimension';
              for (const d of dimMap) {
                const vals = historyCheckins
                  .map((c: Checkin) => (c as Record<string, unknown>)[d.field])
                  .filter((v: unknown) => v !== null && v !== undefined);
                if (vals.length >= 10 && vals.every((v: unknown) => v === vals[0])) {
                  flatDim = isSpanish ? d.name_es : d.name_en;
                  break;
                }
              }

              pendingIntervention.current = isSpanish
                ? `Quiero chequearte algo. Tu puntaje de ${flatDim} ha estado exactamente igual por un tiempo. Los cuerpos rara vez se quedan completamente quietos — incluso los buenos días tienen matices. ¿Te cuesta notar las diferencias, o de verdad se siente así de plano?`
                : `I want to check in with you about something. Your ${flatDim} score has been exactly the same for a while now. Bodies rarely stay perfectly still — even good days have texture. Are you finding it hard to notice the differences, or does it genuinely feel that flat?`;
            }
          }
        }
      } catch { /* ignore integrity check errors — never block the session */ }
    }
  };

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = async (textOverride?: string) => {
    const userMessage = textOverride ?? input.trim();
    if (!userMessage || loading || isLimitReached || greetingLoading) return;

    if (!textOverride) setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    // Track dimension scores from user messages (CHANGE 6)
    if (sessionType === 'scheduled') {
      const score = extractScore(userMessage);
      const dimList = currentSlot === 'morning' ? MORNING_DIMS
        : currentSlot === 'afternoon' ? AFTERNOON_DIMS : NIGHT_DIMS;
      const progress = sessionProgressRef.current;
      const idx = progress.questionIdx;
      if (idx < dimList.length) {
        const dimKey = dimList[idx];
        if (score !== null && currentSlot !== 'night') {
          saveDimensionScore(dimKey, score);
        } else if (currentSlot === 'night') {
          if (dimKey === 'day_rating' && score !== null) {
            saveDimensionScore(dimKey, score);
          } else if (dimKey === 'day_memory' || dimKey === 'alcohol') {
            saveDimensionScore(dimKey, userMessage.trim());
          }
        }
      }
    }

    const result = await callCoachAPI(
      userMessage,
      profile,
      phaseData,
      recentAnxiety,
      messages,
      sessionType,
      recentSummaries,
      morningSummary,
      daysOfData,
    );

    if (result.error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.error!, isError: true },
      ]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }]);
      const newCount = incrementMessageCount();
      setMessageCount(newCount);
      speakResponse(result.content);

      // Inject integrity intervention after Jules' closing, with natural pacing
      const intervention = pendingIntervention.current;
      if (intervention) {
        pendingIntervention.current = null;
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: intervention }]);
          speakResponse(intervention);
        }, 1800);
      }
    }

    setLoading(false);
  };

  // Keep sendMessageRef in sync so recognition.onresult always calls the latest closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { sendMessageRef.current = sendMessage; });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    // Cancel any pending auto-listen timer when user taps manually
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // ── Full screen swipe-down handler ───────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0].clientY - touchStartY.current > 80) {
      setIsFullScreen(false);
    }
  };

  // ── Shared sub-components ────────────────────────────────────────
  const SpeakerButton = ({ text }: { text: string }) => (
    <button
      onClick={() => speakResponse(text)}
      title={isSpanish ? 'Reproducir audio' : 'Replay audio'}
      className="mt-1 ml-1 text-gray-400 hover:text-[#2D1B69] transition-colors flex-shrink-0"
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );

  const MessageList = () => (
    <>
      {greetingLoading && (
        <div className="flex justify-start">
          <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-[#4A5568]">
                {isSpanish ? 'Preparando tu sesión...' : 'Preparing your session...'}
              </span>
            </div>
          </div>
        </div>
      )}
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex items-end gap-1 max-w-[82%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#7B61FF] text-white rounded-br-sm'
                  : message.isError
                  ? 'bg-red-950/50 border border-red-900/50 text-red-400 rounded-bl-sm'
                  : 'bg-[#111126] border border-[#1E1E3A] text-white rounded-bl-sm'
              }`}
            >
              {message.isError && (
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Error</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'assistant' && !message.isError && (
              <SpeakerButton text={message.content} />
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7B61FF]" />
              <span className="text-sm text-[#8B95B0]">
                {isSpanish ? 'Pensando...' : 'Thinking...'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </>
  );

  // ── Map interaction state to QuantumDNA state ────────────────────
  const quantumState: QuantumState = loading ? 'thinking' : isListening ? 'listening' : bioState === 'speaking' ? 'speaking' : 'idle';

  const dnaLabel = {
    idle:      isSpanish ? 'Toca para hablar' : 'Tap to speak',
    listening: isSpanish ? 'Escuchando...'    : 'Listening...',
    speaking:  isSpanish ? 'Hablando...'      : 'Speaking...',
    thinking:  isSpanish ? 'Pensando...'      : 'Thinking...',
  }[quantumState];

  const dnaLabelColor = {
    idle:      '#4A5568',
    listening: '#FF6B6B',
    speaking:  '#FFD93D',
    thinking:  '#00C896',
  }[quantumState];

  // ── Minimal fallback input bar ────────────────────────────────────
  const InputBar = () => (
    <div className="px-5 pb-4 pt-2">
      {isLimitReached ? (
        <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl p-3 text-center">
          <p className="text-[#FF6B6B] text-xs font-medium">
            {isSpanish ? 'Limite mensual alcanzado' : 'Monthly limit reached'}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading || greetingLoading || isListening}
            placeholder={isSpanish ? 'o escribe aquí...' : 'or type here...'}
            className="flex-1 px-3 py-1.5 bg-[#0d0d1f] border border-[#1E1E3A] rounded-xl text-white placeholder-[#2A2A45] focus:ring-1 focus:ring-[#7B61FF]/50 focus:border-transparent outline-none disabled:opacity-30 text-xs"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || greetingLoading || isListening}
            className="w-8 h-8 bg-[#FF6B6B]/70 hover:bg-[#FF6B6B] rounded-xl flex items-center justify-center disabled:opacity-30 transition-all flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[#2A2A45]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {messageCount}/{MONTHLY_LIMIT}
        </span>
      </div>
    </div>
  );

  // ── Full screen view ─────────────────────────────────────────────
  if (isFullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: '#0d0618' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header row */}
        <div className="flex items-center justify-end px-5 pt-12 pb-2">
          <button
            onClick={() => setIsFullScreen(false)}
            className="text-white/60 hover:text-white transition-colors"
            title={isSpanish ? 'Salir' : 'Exit'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tappable DNA */}
        <div className="flex flex-col items-center py-4" style={{ background: '#1A1A3E', position: 'relative' }}>
          {/* Outer radial glow */}
          <div
            className={isListening ? 'dna-pulse-listen' : 'dna-pulse-idle'}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -58%)',
              width: 280,
              height: 280,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,217,61,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          {/* Inner glow */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -58%)',
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,107,107,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />
          <button
            onClick={toggleListening}
            disabled={loading || greetingLoading || !speechSupported || bioState === 'speaking'}
            className="rounded-full disabled:cursor-not-allowed"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
            aria-label={dnaLabel}
          >
            <QuantumDNA size={180} state={quantumState} />
          </button>
          <span
            className="text-xs mt-2 font-medium"
            style={{ color: 'white', transition: 'opacity 0.4s', opacity: bioState === 'speaking' ? 0 : 1 }}
          >
            {dnaLabel}
          </span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          <MessageList />
        </div>

        {/* Minimal fallback input */}
        <div
          className="pb-safe"
          style={{ background: 'rgba(13,6,24,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <InputBar />
        </div>
      </div>
    );
  }

  // ── Normal view ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col pb-24">
      {/* Header */}
      <div className="bg-[#0A0A1A] border-b border-[#1E1E3A] px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
              {isSpanish ? 'Tu Coach' : 'Your Coach'}
            </h1>
            <p className="text-[#8B95B0] text-sm mt-1">
              {phaseNames[phaseData.phase] || phaseData.phase}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              title={isMuted ? (isSpanish ? 'Activar voz' : 'Unmute') : (isSpanish ? 'Silenciar' : 'Mute')}
              className="w-9 h-9 rounded-full bg-[#1E1E3A] hover:bg-[#2A2A45] flex items-center justify-center transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
            {/* Full screen toggle */}
            <button
              onClick={() => setIsFullScreen(true)}
              title={isSpanish ? 'Pantalla completa' : 'Full screen'}
              className="w-9 h-9 rounded-full bg-[#1E1E3A] hover:bg-[#2A2A45] flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-[#8B95B0]" />
            </button>
          </div>
        </div>
      </div>

      {/* Tappable DNA */}
      <div className="flex flex-col items-center pt-5 pb-2" style={{ background: '#1A1A3E', position: 'relative' }}>
        {/* Outer radial glow */}
        <div
          className={isListening ? 'dna-pulse-listen' : 'dna-pulse-idle'}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,217,61,0.18) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {/* Inner glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,107,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <button
          onClick={toggleListening}
          disabled={loading || greetingLoading || !speechSupported || bioState === 'speaking'}
          className="rounded-full disabled:cursor-not-allowed transition-opacity disabled:opacity-80"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', width: 240, height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
          aria-label={dnaLabel}
        >
          <QuantumDNA size={220} state={quantumState} />
        </button>
        <span
          className="text-xs mt-2 font-medium"
          style={{ color: 'white', transition: 'opacity 0.4s', opacity: bioState === 'speaking' ? 0 : 1 }}
        >
          {dnaLabel}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        <MessageList />
      </div>

      {/* Minimal fallback input */}
      <InputBar />
    </div>
  );
}
