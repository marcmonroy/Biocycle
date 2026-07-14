import { supabase } from './supabase';
import type { Profile } from './supabase';
import { getDaysOfData } from './phaseEngine';

// ── Types ────────────────────────────────────────────────────────────────

export type Dimension =
  | 'energy'
  | 'cognitive'
  | 'stress'
  | 'anxiety'
  | 'sleep'
  | 'emotional'
  | 'social'
  | 'sexual';

export type TimeSlot = 'morning' | 'afternoon' | 'night';

export interface ForecastDay {
  date: Date;
  cycleDay: number | null;
  phase: string;
  phaseLabel: string;
  phaseLabelES: string;
  phaseEmoji: string;
  energy: number;
  cognitive: number;
  stress: number;
  anxiety: number;
  sleep: number;
  emotional: number;
  social: number;
  sexual: number;
  physical: number;
  insight: string;
  insightES: string;
  isVulnerabilityWindow: boolean;
  // Composite scores (Premium only — always computed, display gated by tier)
  composite: {
    performance: number;        // (Energy×0.4) + (Cognitive×0.4) + ((100-Stress)×0.2)
    emotionalResilience: number; // (Emotional×0.4) + ((100-Anxiety)×0.35) + ((100-Stress)×0.25)
    socialMagnetism: number;    // (Social×0.5) + (Emotional×0.3) + (Energy×0.2)
    recoveryQuality: number;    // (Sleep×0.6) + (Energy×0.25) + ((100-Stress)×0.15)
    intimacyReadiness: number;  // (Sexual×0.4) + (Emotional×0.35) + ((100-Anxiety)×0.25)
    stressLoad: number;         // (Stress×0.45) + (Anxiety×0.35) + ((100-Sleep)×0.20) — higher = more load
    cognitiveEdge: number;      // (Cognitive×0.5) + (Energy×0.25) + ((100-Anxiety)×0.25)
    biologicalVitality: number; // master score — weighted blend of all dims
  };
}

export type CoachingMode = 'learning' | 'calibration' | 'companion';

export interface ForecastResult {
  mode: CoachingMode;
  days: ForecastDay[];
  accuracyPct: number | null;
  vulnerabilityAlertHours: number | null;
  bestPerformanceDay: number | null;   // index into days[]
  bestCognitiveDay: number | null;     // index into days[]
  bestIntimacyDay: number | null;      // index into days[]
  worstStressDay: number | null;       // index into days[] — highest stress load
}

// ── Textbook baseline — hardcoded hormonal curves ───────────────────────

const FEMALE_TEXTBOOK: Record<string, Record<Dimension, number>> = {
  menstrual:    { energy: 35, cognitive: 40, stress: 55, anxiety: 45, sleep: 55, emotional: 30, social: 35, sexual: 18 },
  follicular:   { energy: 70, cognitive: 75, stress: 35, anxiety: 20, sleep: 75, emotional: 65, social: 70, sexual: 72 },
  ovulatory:    { energy: 95, cognitive: 85, stress: 25, anxiety: 15, sleep: 80, emotional: 80, social: 90, sexual: 95 },
  luteal:       { energy: 55, cognitive: 60, stress: 50, anxiety: 55, sleep: 60, emotional: 45, social: 55, sexual: 38 },
  late_luteal:  { energy: 45, cognitive: 50, stress: 70, anxiety: 85, sleep: 45, emotional: 35, social: 35, sexual: 30 },
};

const MALE_TEXTBOOK: Record<string, Record<Dimension, number>> = {
  morning_peak:      { energy: 90, cognitive: 92, stress: 30, anxiety: 25, sleep: 70, emotional: 65, social: 70, sexual: 85 },
  midday_transition: { energy: 80, cognitive: 85, stress: 40, anxiety: 30, sleep: 70, emotional: 65, social: 75, sexual: 70 },
  afternoon_dip:     { energy: 55, cognitive: 50, stress: 60, anxiety: 55, sleep: 55, emotional: 55, social: 55, sexual: 42 },
  evening_balance:   { energy: 70, cognitive: 65, stress: 35, anxiety: 35, sleep: 70, emotional: 75, social: 80, sexual: 68 },
  night_rest:        { energy: 40, cognitive: 45, stress: 30, anxiety: 40, sleep: 85, emotional: 70, social: 50, sexual: 45 },
};

const PHASE_INSIGHTS: Record<string, { en: string; es: string }> = {
  menstrual:    { en: 'Rest and restoration. Your body is recalibrating.',        es: 'Descanso y restauración. Tu cuerpo se está recalibrando.' },
  follicular:   { en: 'Rising energy. Ideal for starting new things.',            es: 'Energía en ascenso. Ideal para empezar cosas nuevas.' },
  ovulatory:    { en: 'Peak window. Magnetism and confidence at full.',           es: 'Ventana máxima. Magnetismo y confianza al tope.' },
  luteal:       { en: 'Inward focus. Best for detail and completion.',            es: 'Enfoque interno. Mejor para detalles y cerrar ciclos.' },
  late_luteal:  { en: 'Sensitivity window. Protect your energy.',                 es: 'Ventana de sensibilidad. Protege tu energía.' },
  morning_peak: { en: 'Testosterone peaks 30min after waking. Use this window.',  es: 'La testosterona alcanza su pico 30min tras despertar.' },
  afternoon_dip:{ en: 'Natural cortisol dip. Schedule around this.',              es: 'Descenso natural del cortisol. Planifica alrededor.' },
  evening_balance: { en: 'Social window reopens. Connection energy returns.',    es: 'Se reabre la ventana social. La energía vuelve.' },
  night_rest:   { en: 'Recovery phase. Tomorrow depends on tonight.',             es: 'Fase de recuperación. Mañana depende de esta noche.' },
  midday_transition: { en: 'Sustained focus window.',                             es: 'Ventana de concentración sostenida.' },
  perimenopause:{ en: 'Hormonal fluctuation. Jules tracks your unique rhythm.',   es: 'Fluctuación hormonal. Jules rastrea tu ritmo único.' },
  andropause:   { en: 'Gradual shift. Consistency is your edge.',                 es: 'Cambio gradual. La consistencia es tu ventaja.' },
};

// ── Helpers ──────────────────────────────────────────────────────────────

function getAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getFemaleCyclePhase(cycleDay: number): string {
  if (cycleDay >= 1 && cycleDay <= 5)  return 'menstrual';
  if (cycleDay >= 6 && cycleDay <= 13) return 'follicular';
  if (cycleDay >= 14 && cycleDay <= 16) return 'ovulatory';
  if (cycleDay >= 17 && cycleDay <= 24) return 'luteal';
  return 'late_luteal';
}

function getCoachingMode(daysOfData: number): CoachingMode {
  if (daysOfData < 30) return 'learning';
  if (daysOfData < 90) return 'calibration';
  return 'companion';
}

function deltaKey(phase: string, dim: Dimension): string {
  return `${phase}_${dim}`;
}

// ── Calibration engine ───────────────────────────────────────────────────

export async function computeDeltaVector(profile: Profile): Promise<Record<string, number>> {
  const daysOfData = getDaysOfData(profile);
  if (daysOfData < 30) return {};

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: sessions } = await supabase
    .from('conversation_sessions')
    .select('phase_at_session, time_slot, factor_energia, factor_cognitivo, factor_estres, factor_ansiedad, factor_sueno, factor_emocional, factor_social, factor_sexual')
    .eq('user_id', profile.id)
    .eq('session_complete', true)
    .gte('session_date', thirtyDaysAgo.toLocaleDateString('en-CA'));

  if (!sessions || sessions.length === 0) return {};

  const grouped: Record<string, Record<Dimension, number[]>> = {};

  for (const s of sessions as any[]) {
    if (!s.phase_at_session) continue;
    const phase = s.phase_at_session;
    if (!grouped[phase]) {
      grouped[phase] = { energy: [], cognitive: [], stress: [], anxiety: [], sleep: [], emotional: [], social: [], sexual: [] };
    }
    if (s.factor_energia    != null) grouped[phase].energy.push(s.factor_energia * 10);
    if (s.factor_cognitivo  != null) grouped[phase].cognitive.push(s.factor_cognitivo * 10);
    if (s.factor_estres     != null) grouped[phase].stress.push(s.factor_estres * 10);
    if (s.factor_ansiedad   != null) grouped[phase].anxiety.push(s.factor_ansiedad * 10);
    if (s.factor_sueno      != null) grouped[phase].sleep.push(s.factor_sueno * 10);
    if (s.factor_emocional  != null) grouped[phase].emotional.push(s.factor_emocional * 10);
    if (s.factor_social     != null) grouped[phase].social.push(s.factor_social * 10);
    if (s.factor_sexual     != null) grouped[phase].sexual.push(s.factor_sexual * 10);
  }

  const vector: Record<string, number> = {};
  const dims: Dimension[] = ['energy','cognitive','stress','anxiety','sleep','emotional','social','sexual'];

  const isFemale = profile.genero === 'female';
  const textbook = isFemale ? FEMALE_TEXTBOOK : MALE_TEXTBOOK;

  for (const phase of Object.keys(grouped)) {
    const baseline = textbook[phase];
    if (!baseline) continue;
    for (const dim of dims) {
      const samples = grouped[phase][dim];
      if (samples.length < 3) continue;
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const delta = Math.round(avg - baseline[dim]);
      vector[deltaKey(phase, dim)] = delta;
    }
  }

  return vector;
}

// ── Apply calibration — weighted by coaching mode ───────────────────────

function applyCalibration(
  textbookValue: number,
  delta: number | undefined,
  mode: CoachingMode
): number {
  if (delta == null) return textbookValue;
  const weight = mode === 'learning' ? 0 : mode === 'calibration' ? 0.5 : 1.0;
  return Math.max(0, Math.min(100, Math.round(textbookValue + delta * weight)));
}

// ── Main: generate forecast ───────────────────────────────────────────────

export async function generateForecast(profile: Profile, forecastDays: number = 7): Promise<ForecastResult> {
  const daysOfData = getDaysOfData(profile);
  const mode = getCoachingMode(daysOfData);
  const age = profile.fecha_nacimiento ? getAge(profile.fecha_nacimiento) : 0;
  const isFemale = profile.genero === 'female';
  const isMale = profile.genero === 'male';
  const is40Plus = age >= 40;

  const vector = mode !== 'learning' ? await computeDeltaVector(profile) : {};

  const days: ForecastDay[] = [];
  const today = new Date();

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    let phase: string;
    let cycleDay: number | null = null;

    if (isFemale && is40Plus) {
      phase = 'perimenopause';
    } else if (isMale && is40Plus) {
      const dayOfWeek = date.getDay();
      const rhythmPhases = ['morning_peak', 'midday_transition', 'morning_peak', 'evening_balance', 'afternoon_dip', 'morning_peak', 'evening_balance'];
      phase = rhythmPhases[dayOfWeek];
    } else if (isFemale && profile.cycle_start_date) {
      const start = new Date(profile.cycle_start_date);
      const diffMs = date.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const cycleLength = profile.cycle_length || 28;
      cycleDay = (diffDays % cycleLength) + 1;
      if (cycleDay <= 0) cycleDay += cycleLength;
      phase = getFemaleCyclePhase(cycleDay);
    } else {
      phase = 'morning_peak';
    }

    const textbook = isFemale
      ? (FEMALE_TEXTBOOK[phase] ?? FEMALE_TEXTBOOK.follicular)
      : (MALE_TEXTBOOK[phase] ?? MALE_TEXTBOOK.morning_peak);

    const energy    = applyCalibration(textbook.energy,    vector[deltaKey(phase, 'energy')],    mode);
    const cognitive = applyCalibration(textbook.cognitive, vector[deltaKey(phase, 'cognitive')], mode);
    const emotional = applyCalibration(textbook.emotional, vector[deltaKey(phase, 'emotional')], mode);
    const sexual    = applyCalibration(textbook.sexual,    vector[deltaKey(phase, 'sexual')],    mode);
    const anxiety   = applyCalibration(textbook.anxiety,   vector[deltaKey(phase, 'anxiety')],   mode);
    const stress    = applyCalibration(textbook.stress,    vector[deltaKey(phase, 'stress')],    mode);
    const sleep     = applyCalibration(textbook.sleep,     vector[deltaKey(phase, 'sleep')],     mode);
    const social    = applyCalibration(textbook.social,    vector[deltaKey(phase, 'social')],    mode);
    const physical  = Math.round((energy + (textbook.energy * 0.9)) / 2);

    const insight = PHASE_INSIGHTS[phase] ?? { en: '', es: '' };

    // ── Composite scores ───────────────────────────────────────────────
    const performance         = Math.round(energy * 0.4 + cognitive * 0.4 + (100 - stress) * 0.2);
    const emotionalResilience = Math.round(emotional * 0.4 + (100 - anxiety) * 0.35 + (100 - stress) * 0.25);
    const socialMagnetism     = Math.round(social * 0.5 + emotional * 0.3 + energy * 0.2);
    const recoveryQuality     = Math.round(sleep * 0.6 + energy * 0.25 + (100 - stress) * 0.15);
    const intimacyReadiness   = Math.round(sexual * 0.4 + emotional * 0.35 + (100 - anxiety) * 0.25);
    const stressLoad          = Math.round(stress * 0.45 + anxiety * 0.35 + (100 - sleep) * 0.20);
    const cognitiveEdge       = Math.round(cognitive * 0.5 + energy * 0.25 + (100 - anxiety) * 0.25);
    const biologicalVitality  = Math.round(
      energy * 0.25 + cognitive * 0.15 + (100 - stress) * 0.15 +
      (100 - anxiety) * 0.15 + sleep * 0.15 + emotional * 0.10 + social * 0.05
    );

    days.push({
      date,
      cycleDay,
      phase,
      phaseLabel: phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      phaseLabelES: phase.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      phaseEmoji: phase === 'menstrual' ? '🌑' : phase === 'follicular' ? '🌱' : phase === 'ovulatory' ? '✨' : phase === 'luteal' ? '🍂' : phase === 'late_luteal' ? '🌘' : phase === 'morning_peak' ? '☀️' : phase === 'afternoon_dip' ? '🌥' : phase === 'evening_balance' ? '🌆' : phase === 'night_rest' ? '🌙' : '✨',
      energy, cognitive, stress, anxiety, sleep, emotional, social, sexual, physical,
      insight: insight.en,
      insightES: insight.es,
      isVulnerabilityWindow: anxiety >= 70,
      composite: {
        performance, emotionalResilience, socialMagnetism,
        recoveryQuality, intimacyReadiness, stressLoad,
        cognitiveEdge, biologicalVitality,
      },
    });
  }

  // ── Vulnerability alert — highest anxiety in next 72 hours ────────────
  const upcomingHighAnxiety = days.slice(1, 4).find(d => d.isVulnerabilityWindow);
  const vulnerabilityAlertHours = upcomingHighAnxiety
    ? Math.round((upcomingHighAnxiety.date.getTime() - today.getTime()) / (1000 * 60 * 60))
    : null;

  // ── Best / worst day highlights (skip today = index 0) ───────────────
  let bestPerformanceDay: number | null = null;
  let bestCognitiveDay: number | null = null;
  let bestIntimacyDay: number | null = null;
  let worstStressDay: number | null = null;

  if (days.length > 1) {
    let maxPerf = -1, maxCog = -1, maxIntimacy = -1, maxStress = -1;
    for (let i = 1; i < days.length; i++) {
      const c = days[i].composite;
      if (c.performance > maxPerf)           { maxPerf = c.performance;           bestPerformanceDay = i; }
      if (c.cognitiveEdge > maxCog)          { maxCog = c.cognitiveEdge;          bestCognitiveDay = i; }
      if (c.intimacyReadiness > maxIntimacy) { maxIntimacy = c.intimacyReadiness; bestIntimacyDay = i; }
      if (c.stressLoad > maxStress)          { maxStress = c.stressLoad;          worstStressDay = i; }
    }
  }

  // ── Accuracy from forecast_accuracy table (30-day rolling) ───────────
  let accuracyPct: number | null = null;
  if (mode !== 'learning') {
    const thirtyAgo = new Date();
    thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    const { data: accRows } = await supabase
      .from('forecast_accuracy')
      .select('accuracy_pct')
      .eq('user_id', profile.id)
      .gte('forecast_date', thirtyAgo.toLocaleDateString('en-CA'))
      .not('accuracy_pct', 'is', null);
    if (accRows && accRows.length > 0) {
      const avg = accRows.reduce((a: number, r: any) => a + r.accuracy_pct, 0) / accRows.length;
      accuracyPct = Math.round(avg);
    }
  }

  return { mode, days, accuracyPct, vulnerabilityAlertHours, bestPerformanceDay, bestCognitiveDay, bestIntimacyDay, worstStressDay };
}

// ── Record a forecast prediction for later accuracy scoring ────────────

export async function recordForecastPrediction(
  userId: string,
  date: Date,
  timeSlot: TimeSlot,
  dimension: Dimension,
  predictedValue: number
): Promise<void> {
  await supabase.from('forecast_accuracy').insert({
    user_id: userId,
    forecast_date: date.toLocaleDateString('en-CA'),
    time_slot: timeSlot,
    dimension,
    predicted_value: predictedValue,
  });
}

// ── Score accuracy after actual check-in completes ──────────────────────

export async function scoreActualVsPredicted(
  userId: string,
  date: Date,
  timeSlot: TimeSlot,
  dimension: Dimension,
  actualValue: number
): Promise<void> {
  const dateStr = date.toLocaleDateString('en-CA');
  const { data: pred } = await supabase
    .from('forecast_accuracy')
    .select('id, predicted_value')
    .eq('user_id', userId)
    .eq('forecast_date', dateStr)
    .eq('time_slot', timeSlot)
    .eq('dimension', dimension)
    .is('actual_value', null)
    .maybeSingle();

  if (!pred) return;

  const predicted = pred.predicted_value as number;
  const delta = Math.abs(actualValue - predicted);
  const accuracy = Math.max(0, 100 - delta);

  await supabase
    .from('forecast_accuracy')
    .update({ actual_value: actualValue, accuracy_pct: accuracy })
    .eq('id', pred.id);
}
