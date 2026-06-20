import { generateForecast } from './forecastEngine';
import type { Profile } from './supabase';

// ── Compatibility types ───────────────────────────────────────────────────

export type CompatibilityType = 'vibe' | 'cognitive' | 'performance' | 'intimacy';

export interface CompatibilityTypeConfig {
  id: CompatibilityType;
  label: string;
  labelES: string;
  description: string;
  descriptionES: string;
  icon: string;
  tier: 'free' | 'standard' | 'premium';
  compositeA: keyof DayComposites;
  compositeB: keyof DayComposites;
  sharedLabel: string;
  sharedLabelES: string;
}

interface DayComposites {
  performance: number;
  emotionalResilience: number;
  socialMagnetism: number;
  recoveryQuality: number;
  intimacyReadiness: number;
  stressLoad: number;
  cognitiveEdge: number;
  biologicalVitality: number;
}

export const COMPATIBILITY_TYPES: CompatibilityTypeConfig[] = [
  {
    id: 'vibe',
    label: 'Vibe Check',
    labelES: 'Buena Vibra',
    description: 'Shared social energy and emotional alignment. Best for friends and anyone.',
    descriptionES: 'Energía social compartida y alineación emocional. Para amigos y cualquier persona.',
    icon: '✨',
    tier: 'free',
    compositeA: 'socialMagnetism',
    compositeB: 'emotionalResilience',
    sharedLabel: 'Vibe Score',
    sharedLabelES: 'Índice de Vibra',
  },
  {
    id: 'cognitive',
    label: 'Cognitive Sync',
    labelES: 'Sincronía Intelectual',
    description: 'Shared mental clarity and focus windows. Best for work teams and collaborators.',
    descriptionES: 'Claridad mental y ventanas de enfoque compartidas. Para equipos de trabajo.',
    icon: '🧠',
    tier: 'standard',
    compositeA: 'cognitiveEdge',
    compositeB: 'cognitiveEdge',
    sharedLabel: 'Sync Score',
    sharedLabelES: 'Índice de Sincronía',
  },
  {
    id: 'performance',
    label: 'Performance Sync',
    labelES: 'Sincronía de Rendimiento',
    description: 'Shared execution capacity. Best for project partners and team leads.',
    descriptionES: 'Capacidad de ejecución compartida. Para socios de proyecto y líderes.',
    icon: '⚡',
    tier: 'standard',
    compositeA: 'performance',
    compositeB: 'performance',
    sharedLabel: 'Performance Score',
    sharedLabelES: 'Índice de Rendimiento',
  },
  {
    id: 'intimacy',
    label: 'Connection Forecast',
    labelES: 'Pronóstico de Conexión',
    description: 'Shared connection readiness windows. For couples and close partners.',
    descriptionES: 'Ventanas de preparación para la conexión compartida. Para parejas.',
    icon: '💞',
    tier: 'premium',
    compositeA: 'intimacyReadiness',
    compositeB: 'intimacyReadiness',
    sharedLabel: 'Connection Readiness',
    sharedLabelES: 'Preparación para Conectar',
  },
];

// ── Output types ──────────────────────────────────────────────────────────

export interface CompatibilityDay {
  date: Date;
  dateLabel: string;
  dateLabelES: string;
  scoreA: number;       // User A's relevant composite
  scoreB: number;       // User B's relevant composite
  sharedScore: number;  // Geometric mean — penalises mismatch
  isSharedPeak: boolean;   // Both above 70
  isSharedRisk: boolean;   // Both below 40 (or stress mismatch)
  insight: string;
  insightES: string;
}

export interface CompatibilityResult {
  type: CompatibilityType;
  days: CompatibilityDay[];
  todayScore: number;
  weekAverage: number;
  bestDayIndex: number | null;
  worstDayIndex: number | null;
  bestDayLabel: string;
  bestDayLabelES: string;
  overallLabel: string;
  overallLabelES: string;
  overallColor: string;
}

// ── Day/month name helpers ────────────────────────────────────────────────

const DAY_EN  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_ES  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MON_EN  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON_ES  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function dayLabel(date: Date, es: boolean): string {
  const d = es ? DAY_ES : DAY_EN;
  const m = es ? MON_ES : MON_EN;
  return `${d[date.getDay()]} ${date.getDate()} ${m[date.getMonth()]}`;
}

// ── Score helpers ─────────────────────────────────────────────────────────

// Geometric mean — punishes mismatch (80+20 = 40, not 50)
function geometricMean(a: number, b: number): number {
  return Math.round(Math.sqrt(a * b));
}

function overallLabel(score: number, es: boolean): { label: string; color: string } {
  if (score >= 80) return { label: es ? 'Excelente alineación' : 'Excellent alignment',    color: '#00c896' };
  if (score >= 65) return { label: es ? 'Buena sincronía'      : 'Good sync',               color: '#5ca8ff' };
  if (score >= 50) return { label: es ? 'Alineación moderada'  : 'Moderate alignment',      color: '#efdf39' };
  if (score >= 35) return { label: es ? 'Baja sincronía'       : 'Low sync',                color: '#ef9f27' };
  return               { label: es ? 'Fuera de fase'           : 'Out of phase',            color: '#ef4444' };
}

function dayInsight(type: CompatibilityType, sharedScore: number, scoreA: number, scoreB: number, es: boolean): string {
  const mismatch = Math.abs(scoreA - scoreB) > 30;

  if (type === 'vibe') {
    if (sharedScore >= 75) return es ? 'Gran día para conectar. Ambos están en su mejor momento social.' : 'Great day to connect. Both of you are at your social best.';
    if (mismatch)          return es ? 'Energías distintas hoy — uno de los dos necesita espacio.' : 'Different energies today — one of you may need space.';
    if (sharedScore >= 50) return es ? 'Día casual. Un café funciona, nada muy intenso.' : 'Casual day. Coffee works, nothing too intense.';
    return                        es ? 'Día de recarga individual. Mejor posponerlo.' : 'Individual recharge day. Better to postpone.';
  }
  if (type === 'cognitive') {
    if (sharedScore >= 75) return es ? 'Ventana de trabajo profundo compartida. Agenda lo importante hoy.' : 'Shared deep work window. Schedule the important stuff today.';
    if (mismatch)          return es ? 'Uno está enfocado, el otro no. Espera al próximo pico compartido.' : 'One is focused, the other is not. Wait for the next shared peak.';
    if (sharedScore >= 50) return es ? 'Capacidad intelectual decente. Bueno para revisiones y seguimiento.' : 'Decent intellectual capacity. Good for reviews and follow-ups.';
    return                        es ? 'Día de baja sincronía cognitiva. Evita decisiones importantes juntos.' : 'Low cognitive sync day. Avoid important decisions together.';
  }
  if (type === 'performance') {
    if (sharedScore >= 75) return es ? 'Ambos en modo ejecución. Máxima productividad compartida.' : 'Both in execution mode. Maximum shared productivity.';
    if (mismatch)          return es ? 'Ritmos de rendimiento distintos hoy.' : 'Different performance rhythms today.';
    if (sharedScore >= 50) return es ? 'Rendimiento moderado. Bueno para tareas de rutina.' : 'Moderate performance. Good for routine tasks.';
    return                        es ? 'Día de bajo rendimiento compartido. Reorganiza prioridades.' : 'Low shared performance day. Reorganise priorities.';
  }
  // intimacy
  if (sharedScore >= 75) return es ? 'Ventana de conexión fuerte para ambos. Momento ideal.' : 'Strong connection window for both. Ideal moment.';
  if (mismatch)          return es ? 'Uno está disponible emocionalmente, el otro no. Comunica primero.' : 'One is emotionally available, the other is not. Communicate first.';
  if (sharedScore >= 50) return es ? 'Conexión moderada. Bueno para conversaciones tranquilas.' : 'Moderate connection. Good for quiet conversations.';
  return                        es ? 'Ambos necesitan recarga individual primero.' : 'Both need individual recharge first.';
}

// ── Main engine ───────────────────────────────────────────────────────────

export async function computeCompatibility(
  profileA: Profile,
  profileB: Profile,
  type: CompatibilityType,
  forecastDays: number = 7,
): Promise<CompatibilityResult> {
  const config = COMPATIBILITY_TYPES.find(t => t.id === type)!;

  // Generate forecasts for both users in parallel
  const [fcA, fcB] = await Promise.all([
    generateForecast(profileA, forecastDays),
    generateForecast(profileB, forecastDays),
  ]);

  const days: CompatibilityDay[] = [];
  const len = Math.min(fcA.days.length, fcB.days.length);

  for (let i = 0; i < len; i++) {
    const dayA = fcA.days[i];
    const dayB = fcB.days[i];

    const scoreA = dayA.composite[config.compositeA];
    const scoreB = dayB.composite[config.compositeB];

    // For stressLoad — invert it (lower stress = better compatibility)
    const adjA = config.compositeA === 'stressLoad' ? 100 - scoreA : scoreA;
    const adjB = config.compositeB === 'stressLoad' ? 100 - scoreB : scoreB;

    const sharedScore = geometricMean(adjA, adjB);
    const date = dayA.date;

    days.push({
      date,
      dateLabel:   dayLabel(date, false),
      dateLabelES: dayLabel(date, true),
      scoreA: adjA,
      scoreB: adjB,
      sharedScore,
      isSharedPeak: adjA >= 70 && adjB >= 70,
      isSharedRisk: sharedScore < 35,
      insight:   dayInsight(type, sharedScore, adjA, adjB, false),
      insightES: dayInsight(type, sharedScore, adjA, adjB, true),
    });
  }

  // Summary stats
  const todayScore  = days[0]?.sharedScore ?? 0;
  const weekAverage = Math.round(days.reduce((a, d) => a + d.sharedScore, 0) / days.length);

  let bestDayIndex:  number | null = null;
  let worstDayIndex: number | null = null;
  let maxScore = -1;
  let minScore = 101;

  for (let i = 1; i < days.length; i++) {
    if (days[i].sharedScore > maxScore) { maxScore = days[i].sharedScore; bestDayIndex  = i; }
    if (days[i].sharedScore < minScore) { minScore = days[i].sharedScore; worstDayIndex = i; }
  }

  const bestDay = bestDayIndex !== null ? days[bestDayIndex] : null;
  const ol = overallLabel(weekAverage, false);
  const olES = overallLabel(weekAverage, true);

  return {
    type,
    days,
    todayScore,
    weekAverage,
    bestDayIndex,
    worstDayIndex,
    bestDayLabel:   bestDay ? bestDay.dateLabel   : '—',
    bestDayLabelES: bestDay ? bestDay.dateLabelES : '—',
    overallLabel:   ol.label,
    overallLabelES: olES.label,
    overallColor:   ol.color,
  };
}
