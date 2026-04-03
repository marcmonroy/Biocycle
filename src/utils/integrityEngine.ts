// ── Session Integrity Scoring Engine ─────────────────────────────────────────
//
// Detects data quality issues in check-in sessions and returns a 0-100
// integrity score plus a list of triggered flags.

export type IntegrityFlag =
  | 'FLAT_LINE'
  | 'IMPOSSIBLE_CONSISTENCY'
  | 'SPEED_FLAG'
  | 'TIME_ANOMALY'
  | 'DIMENSION_COLLISION'
  | 'RESPONSE_DRIFT';

export interface SessionData {
  // Core check-in fields (matches Checkin type from supabase.ts)
  id: string;
  user_id: string;
  checkin_date: string;           // ISO date string e.g. "2026-04-03"
  factor_emocional: number | null;
  factor_fisico: number | null;
  factor_cognitivo: number | null;
  factor_estres: number | null;
  factor_social: number | null;
  factor_sexual: number | null;
  factor_ansiedad: number | null;
  phase_at_checkin: string | null;
  notas?: string | null;
  // Extended integrity fields (may be absent in older records)
  session_duration_seconds?: number | null;
  checkin_label?: string | null;  // 'morning' | 'afternoon' | 'night'
  completed_at?: string | null;   // ISO datetime when session was submitted
}

export interface IntegrityResult {
  integrityScore: number;
  flags: IntegrityFlag[];
  passed: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the 5 core wellness dimensions from a session (excluding anxiety/sexual). */
function coreDimensions(s: SessionData): Record<string, number | null> {
  return {
    emocional:  s.factor_emocional,
    fisico:     s.factor_fisico,
    cognitivo:  s.factor_cognitivo,
    estres:     s.factor_estres,
    social:     s.factor_social,
  };
}

/** Return the hour (0–23) from an ISO datetime string using local time. */
function localHour(isoString: string): number {
  return new Date(isoString).getHours();
}

/** Return sessions within the last N days relative to today. */
function withinDays(sessions: SessionData[], days: number): SessionData[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return sessions.filter(s => new Date(s.checkin_date) >= cutoff);
}

/** Linear regression slope — positive means upward trend. */
function slope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Calculate the integrity score for a user's check-in data.
 *
 * @param sessions  All historical sessions for the user, sorted oldest→newest.
 * @param current   The session being evaluated (may or may not be in `sessions`).
 */
export function calculateSessionIntegrity(
  sessions: SessionData[],
  current: SessionData,
): IntegrityResult {
  const flags: IntegrityFlag[] = [];
  let score = 100;

  // ── FLAT_LINE ──────────────────────────────────────────────────────────────
  // Same score in 5+ consecutive sessions across 3+ dimensions simultaneously.
  const FLAT_WINDOW = 5;
  const FLAT_DIM_THRESHOLD = 3;

  if (sessions.length >= FLAT_WINDOW) {
    const recent = sessions.slice(-FLAT_WINDOW);
    const dims = Object.keys(coreDimensions(recent[0]));
    let flatDimCount = 0;

    for (const dim of dims) {
      const vals = recent.map(s => coreDimensions(s)[dim]);
      if (vals.every(v => v !== null) && vals.every(v => v === vals[0])) {
        flatDimCount++;
      }
    }

    if (flatDimCount >= FLAT_DIM_THRESHOLD) {
      flags.push('FLAT_LINE');
      score -= 25;
    }
  }

  // ── IMPOSSIBLE_CONSISTENCY ─────────────────────────────────────────────────
  // Zero variance in any single dimension across 30+ days.
  const last30 = withinDays(sessions, 30);

  if (last30.length >= 10) { // need enough data to be meaningful
    const dims = Object.keys(coreDimensions(last30[0]));
    for (const dim of dims) {
      const vals = last30
        .map(s => coreDimensions(s)[dim])
        .filter((v): v is number => v !== null);

      if (vals.length >= 10) {
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        if (min === max) {
          flags.push('IMPOSSIBLE_CONSISTENCY');
          score -= 20;
          break; // deduct once even if multiple dimensions trigger
        }
      }
    }
  }

  // ── SPEED_FLAG ─────────────────────────────────────────────────────────────
  // Session completed in under 90 seconds.
  if (
    current.session_duration_seconds !== null &&
    current.session_duration_seconds !== undefined &&
    current.session_duration_seconds < 90
  ) {
    flags.push('SPEED_FLAG');
    score -= 30;
  }

  // ── TIME_ANOMALY ───────────────────────────────────────────────────────────
  // Morning label sessions submitted after 8pm, 3+ times in last 7 days.
  const last7 = withinDays(sessions, 7);
  const lateMorning = last7.filter(s => {
    if (s.checkin_label !== 'morning') return false;
    const ts = s.completed_at ?? s.checkin_date;
    return localHour(ts) >= 20;
  });

  if (lateMorning.length >= 3) {
    flags.push('TIME_ANOMALY');
    score -= 15;
  }

  // ── DIMENSION_COLLISION ────────────────────────────────────────────────────
  // Physical > 7 AND stress > 8 AND anxiety > 7 in same session.
  const physical = current.factor_fisico ?? 0;
  const stress   = current.factor_estres  ?? 0;
  const anxiety  = current.factor_ansiedad ?? 0;

  if (physical > 7 && stress > 8 && anxiety > 7) {
    flags.push('DIMENSION_COLLISION');
    score -= 10;
  }

  // ── RESPONSE_DRIFT ─────────────────────────────────────────────────────────
  // All dimensions drifting in the same direction by >3 points over 14 days
  // without a phase change.
  const last14 = withinDays(sessions, 14);

  if (last14.length >= 5) {
    const dims = Object.keys(coreDimensions(last14[0]));
    const slopes: number[] = [];

    for (const dim of dims) {
      const vals = last14
        .map(s => coreDimensions(s)[dim])
        .filter((v): v is number => v !== null);

      if (vals.length >= 5) {
        const s14 = slope(vals);
        // Only count if the total drift (slope × n) exceeds 3 points
        if (Math.abs(s14 * vals.length) > 3) {
          slopes.push(s14);
        }
      }
    }

    const allPositive = slopes.length >= dims.length && slopes.every(s14 => s14 > 0);
    const allNegative = slopes.length >= dims.length && slopes.every(s14 => s14 < 0);

    if (allPositive || allNegative) {
      // Check if any phase change occurred in the window
      const phases = last14.map(s => s.phase_at_checkin).filter(Boolean);
      const uniquePhases = new Set(phases);
      const noPhaseChange = uniquePhases.size <= 1;

      if (noPhaseChange) {
        flags.push('RESPONSE_DRIFT');
        score -= 10;
      }
    }
  }

  score = Math.max(0, score);

  return {
    integrityScore: score,
    flags,
    passed: score >= 60,
  };
}
