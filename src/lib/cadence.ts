// ── BioCycle post-day-30 cadence ────────────────────────────────────────────
// After day 30 we stop asking the dimension questions every day. Instead a day
// becomes a "question-day" at most ~2x/week, biased to fill gaps in the forecast
// model (under-sampled cycle phases). Off-days skip questions and give the
// session over to forecast + circle + compatibility.
//
// A "question-day" = a completed session that actually collected answers, which
// we detect by factor_energia being non-null (off-days never set the factors).

import { supabase } from './supabase';

export interface QuestionDayDecision {
  ask: boolean;
  reason: string; // for logging / debugging only
}

const iso = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD, local

/**
 * Decide whether today's day-30+ session should collect the dimension questions.
 * @param userId       profile.id
 * @param currentPhase the cycle phase label used when writing sessions (phase_at_session)
 */
export async function decideQuestionDay(
  userId: string,
  currentPhase: string,
): Promise<QuestionDayDecision> {
  const today = new Date();
  const sevenAgo = new Date(today);  sevenAgo.setDate(today.getDate() - 7);
  const ninetyAgo = new Date(today); ninetyAgo.setDate(today.getDate() - 90);

  const { data } = await supabase
    .from('conversation_sessions')
    .select('session_date, phase_at_session, factor_energia')
    .eq('user_id', userId)
    .eq('session_complete', true)
    .not('factor_energia', 'is', null)
    .gte('session_date', iso(ninetyAgo))
    .order('session_date', { ascending: false });

  const rows = (data ?? []) as Array<{
    session_date: string;
    phase_at_session: string | null;
    factor_energia: number | null;
  }>;

  // ── 1) Weekly cap: never more than 2 question-days per rolling 7 days ──
  const sevenIso = iso(sevenAgo);
  const last7 = rows.filter(r => r.session_date >= sevenIso);
  if (last7.length >= 2) return { ask: false, reason: 'weekly-cap-reached' };

  // ── Anti-starvation: nothing collected in the last 7 days → ask now ──
  if (last7.length === 0) return { ask: true, reason: 'starvation-none-in-7' };

  // ── Freshness: 3+ days since the last question-day → ask ──
  const lastDate = rows[0]?.session_date;
  let daysSinceLast = 99;
  if (lastDate) {
    const d = new Date(lastDate + 'T00:00:00');
    daysSinceLast = Math.floor((today.getTime() - d.getTime()) / 86400000);
  }
  if (daysSinceLast >= 3) return { ask: true, reason: 'freshness-3-days' };

  // ── Gap-fill: is the current phase under-sampled vs the user's average? ──
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (!r.phase_at_session) continue;
    counts[r.phase_at_session] = (counts[r.phase_at_session] ?? 0) + 1;
  }
  const phases = Object.keys(counts);
  const currentCount = counts[currentPhase] ?? 0;
  const avg = phases.length
    ? phases.reduce((s, p) => s + counts[p], 0) / phases.length
    : 0;

  if (currentCount < avg) return { ask: true, reason: 'phase-under-sampled' };

  return { ask: false, reason: 'phase-covered' };
}
