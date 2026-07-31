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
export function buildTypeCalendar(result: CompatibilityResult): CalendarDay[] {
  return result.days.map(d => ({
    date: new Date(d.date),
    dayOfMonth: new Date(d.date).getDate(),
    isPeak: d.isSharedPeak,
    isInSync: !d.isSharedPeak && d.sharedScore >= 55,
  }));
}

// True when a type has at least one shared peak in the window.
export function hasAnyPeak(days: CalendarDay[]): boolean {
  return days.some(d => d.isPeak);
}
