import { colors, fonts } from '../lib/tokens';

export interface CalendarMark { icon: string; color: string; }
export interface LegendEntry { icon: string; color: string; label: string; active: boolean; }

interface Props {
  days: Date[];                          // ordered, starting "today"
  marksByDay: Record<string, CalendarMark[]>; // key = YYYY-MM-DD (local), max 2 marks
  legend: LegendEntry[];
  caption?: string;                      // e.g. "Early estimate…" or the different-rhythms line
  emptyLine?: string;                    // shown under grid when nothing is marked
  isES: boolean;
}

const dayKey = (d: Date) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD local

export function CalendarGrid({ days, marksByDay, legend, caption, emptyLine, isES }: Props) {
  const weekdays = isES ? ['L','M','M','J','V','S','D'] : ['M','T','W','T','F','S','S'];
  // Monday-based offset so day 0 lands under the right weekday
  const first = days[0] ?? new Date();
  const jsDay = first.getDay();                 // 0=Sun..6=Sat
  const offset = (jsDay + 6) % 7;               // 0=Mon..6=Sun
  const anyMarks = Object.values(marksByDay).some(m => m.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {caption && (
        <div style={{ fontSize: 12, color: colors.boneFaint, fontFamily: fonts.body, textAlign: 'center', lineHeight: 1.5 }}>
          {caption}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {weekdays.map((w, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 10, color: colors.boneFaint, fontFamily: fonts.body }}>{w}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`pad${i}`} />)}
        {days.map((d, i) => {
          const marks = marksByDay[dayKey(d)] ?? [];
          const has = marks.length > 0;
          return (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
              background: has ? 'rgba(245,242,238,0.05)' : 'rgba(245,242,238,0.02)',
              border: `1px solid ${has ? 'rgba(245,242,238,0.14)' : 'transparent'}`,
            }}>
              <div style={{ fontSize: 11, color: has ? colors.bone : colors.boneFaint, fontFamily: fonts.body }}>{d.getDate()}</div>
              {has && (
                <div style={{ display: 'flex', gap: 2, lineHeight: 1 }}>
                  {marks.slice(0, 2).map((m, j) => (
                    <span key={j} style={{ fontSize: 12 }}>{m.icon}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!anyMarks && emptyLine && (
        <div style={{ textAlign: 'center', fontSize: 12, color: colors.boneFaint, fontFamily: fonts.body, lineHeight: 1.5 }}>
          {emptyLine}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 14px', justifyContent: 'center', paddingTop: 4 }}>
        {legend.map((l, i) => (
          <span key={i} style={{
            display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontFamily: fonts.body,
            color: l.active ? colors.bone : colors.boneFaint, opacity: l.active ? 1 : 0.4,
          }}>
            <span style={{ fontSize: 13 }}>{l.icon}</span>{l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
