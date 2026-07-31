import type { CompatibilityResult, CompatibilityType } from './compatibilityEngine';

// Tabler icon name + brand color per compatibility type (used on the calendar).
// Icons are rendered by the app's Tabler icon component / font.
export const TYPE_VISUAL: Record<CompatibilityType, { icon: string; color: string; labelEN: string; labelES: string }> = {
  vibe:        { icon: '✨', color: '#5dcaa5', labelEN: 'Good vibe',         labelES: 'Buena vibra' },
  cognitive:   { icon: '🧠', color: '#7f77dd', labelEN: 'Intellectual sync', labelES: 'Sincronía intelectual' },
  performance: { icon: '⚡', color: '#ef9f27', labelEN: 'Performance',        labelES: 'Rendimiento' },
  intimacy:    { icon: '💞', color: '#d4537e', labelEN: 'Intimacy',          labelES: 'Intimidad' },
};

export interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isPeak: boolean;     // both people peak on this day for this type
  isInSync: boolean;   // mid-range shared day (optional lighter mark)
}

// Turn one type's CompatibilityResult into a per-day calendar array.
// Turn one type's CompatibilityResult into a per-day calendar array.
// Peaks are RELATIVE to this pair's own range: their standout days, never a
// fixed cutoff — so the calendar highlights the best days for any pairing and
// is only empty when a pair is genuinely flat.
export function buildTypeCalendar(result: CompatibilityResult): CalendarDay[] {
  const scores = result.days.map(d => d.sharedScore);
  const n = scores.length;

  if (n === 0) {
    return [];
  }

  const avg = scores.reduce((a, b) => a + b, 0) / n;
  const max = Math.max(...scores);
  const min = Math.min(...scores);

  // 70th percentile → top ~30% of days
  const sorted = [...scores].sort((a, b) => a - b);
  const pctIdx = Math.floor(sorted.length * 0.7);
  const pctCutoff = sorted[Math.min(pctIdx, sorted.length - 1)];

  // A day peaks if it's in the top ~30% AND above the pair's own average.
  const cutoff = Math.max(avg, pctCutoff);

  // Flat pair (essentially no variation) → no peaks, honest "steady" state.
  const isFlat = (max - min) < 3;

  const days = result.days.map(d => ({
    date: new Date(d.date),
    dayOfMonth: new Date(d.date).getDate(),
    isPeak: !isFlat && d.sharedScore >= cutoff && d.sharedScore > avg,
    isInSync: false as boolean,
  }));

  // Guarantee non-empty when there IS variation: if nothing cleared the bar,
  // mark the single best day so the calendar always shows their top day.
  if (!isFlat && !days.some(d => d.isPeak)) {
    const bestIdx = scores.indexOf(max);
    if (bestIdx >= 0) days[bestIdx].isPeak = true;
  }

  // Lighter "in sync" mark: above-average days that didn't reach peak.
  for (let i = 0; i < days.length; i++) {
    if (!days[i].isPeak && result.days[i].sharedScore >= avg) {
      days[i].isInSync = true;
    }
  }

  return days;
}

// True when a type has at least one shared peak in the window.
export function hasAnyPeak(days: CalendarDay[]): boolean {
  return days.some(d => d.isPeak);
}
