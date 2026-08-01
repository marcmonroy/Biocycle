// ── BioCycle forecast signal scanner ────────────────────────────────────────
// Reads a forecast, finds only the days/dimensions that cross a "matters" line
// inside the tier's lookahead window, ranks them, and returns the top 1-2 with
// mitigation tips attached. Feeds both the coach and (later) in-app notifications.

import type { ForecastResult, ForecastDay, CoachingMode } from './forecastEngine';
import { getTips } from './mitigations';

export type SignalKind =
  | 'energy' | 'cognitive' | 'sleep' | 'emotional' | 'social' | 'sexual'
  | 'stress' | 'anxiety' | 'decision';

export type SignalDirection = 'low' | 'high';
export type SignalConfidence = 'early' | 'calibrating' | 'confident';

export interface ForecastSignal {
  kind: SignalKind;
  direction: SignalDirection; // for decision: high = good window, low = poor window
  dayIndex: number;           // index into forecast.days (1 = tomorrow)
  dayLabel: string;           // localized ("tomorrow" / weekday)
  value: number;              // the driving score, rounded
  confidence: SignalConfidence;
  partnerName?: string;       // sexual signals only, when a romantic Circle member exists
  tips: string[];             // up to 2 candidate mitigations
}

// ── Thresholds (0-100). Tune here. ──────────────────────────────────────────
const FLOOR = 35;          // below this = low          (energy/cognitive/sleep/emotional/social/sexual)
const CEIL  = 75;          // above this = high / peak
const SPIKE = 79;          // stress / anxiety spike
const DECISION_GOOD = 75;  // cognitiveEdge good-decision-window threshold

const STD_DIMS: SignalKind[] = ['energy', 'cognitive', 'sleep', 'emotional', 'social', 'sexual'];

function confidenceFromMode(mode: CoachingMode): SignalConfidence {
  if (mode === 'learning') return 'early';
  if (mode === 'calibration') return 'calibrating';
  return 'confident';
}

function dayLabel(date: Date, index: number, isES: boolean): string {
  if (index === 1) return isES ? 'mañana' : 'tomorrow';
  return date.toLocaleDateString(isES ? 'es-ES' : 'en-US', { weekday: 'long' });
}

// priority: stress/anxiety spike (3) > decision (2) > everything else (1)
function priorityTier(kind: SignalKind): number {
  if (kind === 'stress' || kind === 'anxiety') return 3;
  if (kind === 'decision') return 2;
  return 1;
}

interface Ranked extends ForecastSignal { severity: number; tier: number; }

/**
 * Scan days 1..lookaheadDays for signals that cross a threshold.
 * Returns the top 1-2 ranked signals (stress/anxiety lead, then decision, then others).
 */
export function scanUpcomingSignals(
  forecast: ForecastResult,
  lookaheadDays: number,
  opts: { isES: boolean; partnerName?: string },
): ForecastSignal[] {
  const isES = opts.isES;
  const confidence = confidenceFromMode(forecast.mode);
  const raw: Ranked[] = [];

  const lastDay = Math.min(lookaheadDays, forecast.days.length - 1);
  for (let i = 1; i <= lastDay; i++) {
    const d = forecast.days[i];
    if (!d) continue;
    const label = dayLabel(d.date, i, isES);

    // Standard dimensions: low < FLOOR or high > CEIL
    for (const dim of STD_DIMS) {
      const v = (d as unknown as Record<string, number>)[dim];
      if (v == null) continue;
      let dir: SignalDirection | null = null;
      if (v < FLOOR) dir = 'low';
      else if (v > CEIL) dir = 'high';
      if (!dir) continue;
      const partnerName = dim === 'sexual' ? opts.partnerName : undefined;
      raw.push({
        kind: dim, direction: dir, dayIndex: i, dayLabel: label,
        value: Math.round(v), confidence, partnerName,
        tips: getTips(dim, dir, isES, partnerName),
        severity: dir === 'low' ? FLOOR - v : v - CEIL,
        tier: priorityTier(dim),
      });
    }

    // Stress / anxiety: spike only
    for (const dim of ['stress', 'anxiety'] as SignalKind[]) {
      const v = (d as unknown as Record<string, number>)[dim];
      if (v != null && v > SPIKE) {
        raw.push({
          kind: dim, direction: 'high', dayIndex: i, dayLabel: label,
          value: Math.round(v), confidence,
          tips: getTips(dim, 'high', isES),
          severity: (v - SPIKE) + 20, // spikes outrank ordinary lows/peaks
          tier: priorityTier(dim),
        });
      }
    }

    // Decision window (derived): good = sharp head + calm nerves; poor = foggy or spiking
    const ce = d.composite.cognitiveEdge;
    if (ce > DECISION_GOOD && d.anxiety <= SPIKE && d.stress <= SPIKE) {
      raw.push({
        kind: 'decision', direction: 'high', dayIndex: i, dayLabel: label,
        value: Math.round(ce), confidence, tips: getTips('decision', 'high', isES),
        severity: ce - DECISION_GOOD, tier: priorityTier('decision'),
      });
    } else if (d.cognitive < FLOOR || d.anxiety > SPIKE || d.stress > SPIKE) {
      const mag = Math.max(
        d.cognitive < FLOOR ? FLOOR - d.cognitive : 0,
        d.anxiety > SPIKE ? d.anxiety - SPIKE : 0,
        d.stress  > SPIKE ? d.stress  - SPIKE : 0,
      );
      raw.push({
        kind: 'decision', direction: 'low', dayIndex: i, dayLabel: label,
        value: Math.round(ce), confidence, tips: getTips('decision', 'low', isES),
        severity: mag, tier: priorityTier('decision'),
      });
    }
  }

  // Rank: priority tier desc, then severity desc, then earliest day
  raw.sort((a, b) => b.tier - a.tier || b.severity - a.severity || a.dayIndex - b.dayIndex);

  // Cap at 2, distinct kinds, and avoid pairing two "calm-down" signals together
  const out: ForecastSignal[] = [];
  const seen = new Set<SignalKind>();
  for (const s of raw) {
    if (seen.has(s.kind)) continue;
    if (out.length === 1) {
      const firstCalm = out[0].kind === 'stress' || out[0].kind === 'anxiety';
      const thisCalm  = s.kind === 'stress' || s.kind === 'anxiety';
      if (firstCalm && thisCalm) continue;
    }
    seen.add(s.kind);
    const { severity: _s, tier: _t, ...sig } = s;
    out.push(sig);
    if (out.length >= 2) break;
  }
  return out;
}

export type SignalTone = 'watch' | 'opportunity' | 'decision';

export interface DaySignalBadge {
  kind: SignalKind;
  direction: SignalDirection;
  tone: SignalTone;   // watch = caution, opportunity = peak, decision = act-now window
  label: string;      // localized chip label
  tip: string;        // one localized mitigation line
  emoji: string;      // visual icon for this kind+direction
}

const KIND_EMOJI: Record<string, { low: string; high: string }> = {
  energy:    { low: '🪫',  high: '⚡' },
  cognitive: { low: '🌫️', high: '🎯' },
  sleep:     { low: '😴',  high: '😴' },
  emotional: { low: '💗',  high: '💗' },
  social:    { low: '🔇',  high: '🎉' },
  sexual:    { low: '🌙',  high: '🔥' },
  stress:    { low: '😰',  high: '😰' },
  anxiety:   { low: '🌊',  high: '🌊' },
  decision:  { low: '🌫️', high: '🧠' },
};

const KIND_LABELS: Record<string, { low: [string, string]; high: [string, string] }> = {
  energy:    { low: ['low energy', 'energía baja'],              high: ['energy peak', 'pico de energía'] },
  cognitive: { low: ['low focus', 'enfoque bajo'],              high: ['sharp focus', 'mente aguda'] },
  sleep:     { low: ['poor sleep ahead', 'sueño pobre'],        high: ['good rest', 'buen descanso'] },
  emotional: { low: ['tender day', 'día sensible'],             high: ['warm day', 'día cálido'] },
  social:    { low: ['low social battery', 'batería social baja'], high: ['social peak', 'pico social'] },
  sexual:    { low: ['quieter window', 'ventana tranquila'],    high: ['intimacy peak', 'pico de intimidad'] },
  stress:    { low: ['stress spike', 'pico de estrés'],         high: ['stress spike', 'pico de estrés'] },
  anxiety:   { low: ['anxiety spike', 'pico de ansiedad'],      high: ['anxiety spike', 'pico de ansiedad'] },
  decision:  { low: ['hold big decisions', 'aplaza decisiones'], high: ['good decision day', 'buen día para decidir'] },
};

function toneFor(kind: SignalKind, direction: SignalDirection): SignalTone {
  if (kind === 'stress' || kind === 'anxiety') return 'watch';
  if (kind === 'decision') return direction === 'high' ? 'decision' : 'watch';
  return direction === 'high' ? 'opportunity' : 'watch';
}

/** All qualifying signals for one day, ranked by tier desc then severity desc. Empty = quiet day. */
export function allSignalsForDay(
  day: ForecastDay,
  opts: { isES: boolean; partnerName?: string },
): DaySignalBadge[] {
  const isES = opts.isES;
  const cands: Array<{ kind: SignalKind; direction: SignalDirection; severity: number; tier: number }> = [];

  for (const dim of STD_DIMS) {
    const v = (day as unknown as Record<string, number>)[dim];
    if (v == null) continue;
    if (v < FLOOR) cands.push({ kind: dim, direction: 'low',  severity: FLOOR - v, tier: priorityTier(dim) });
    else if (v > CEIL) cands.push({ kind: dim, direction: 'high', severity: v - CEIL,  tier: priorityTier(dim) });
  }
  for (const dim of ['stress', 'anxiety'] as SignalKind[]) {
    const v = (day as unknown as Record<string, number>)[dim];
    if (v != null && v > SPIKE) cands.push({ kind: dim, direction: 'high', severity: (v - SPIKE) + 20, tier: priorityTier(dim) });
  }
  const ce = day.composite.cognitiveEdge;
  if (ce > DECISION_GOOD && day.anxiety <= SPIKE && day.stress <= SPIKE) {
    cands.push({ kind: 'decision', direction: 'high', severity: ce - DECISION_GOOD, tier: priorityTier('decision') });
  } else if (day.cognitive < FLOOR || day.anxiety > SPIKE || day.stress > SPIKE) {
    const mag = Math.max(
      day.cognitive < FLOOR ? FLOOR - day.cognitive : 0,
      day.anxiety > SPIKE   ? day.anxiety - SPIKE   : 0,
      day.stress  > SPIKE   ? day.stress  - SPIKE   : 0,
    );
    cands.push({ kind: 'decision', direction: 'low', severity: mag, tier: priorityTier('decision') });
  }

  cands.sort((a, b) => b.tier - a.tier || b.severity - a.severity);

  return cands.map(c => {
    const labels = KIND_LABELS[c.kind];
    const label  = (c.direction === 'high' ? labels.high : labels.low)[isES ? 1 : 0];
    const tip    = getTips(c.kind, c.direction, isES, c.kind === 'sexual' ? opts.partnerName : undefined)[0] ?? '';
    const emoji  = KIND_EMOJI[c.kind]?.[c.direction] ?? '';
    return { kind: c.kind, direction: c.direction, tone: toneFor(c.kind, c.direction), label, tip, emoji };
  });
}

/** The single most significant signal for one day, for row highlighting. Null = quiet day. */
export function topSignalForDay(
  day: ForecastDay,
  opts: { isES: boolean; partnerName?: string },
): DaySignalBadge | null {
  return allSignalsForDay(day, opts)[0] ?? null;
}
