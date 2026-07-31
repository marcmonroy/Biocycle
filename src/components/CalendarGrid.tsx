import { colors, fonts } from '../lib/tokens';

export interface CalendarMark { icon: string; color: string; }
export interface LegendEntry { icon: string; color: string; label: string; active: boolean; desc?: string; }

interface Props {
  days: Date[];
  marksByDay: Record<string, CalendarMark[]>;
  legend: LegendEntry[];
  caption?: string;
  emptyLine?: string;
  isES: boolean;
}

const dayKey = (d: Date) => d.toLocaleDateString('en-CA');

export function CalendarGrid({ days, marksByDay, legend, caption, emptyLine, isES }: Props) {
  const weekdays = isES ? ['L','M','M','J','V','S','D'] : ['M','T','W','T','F','S','S'];
  const first = days[0] ?? new Date();
  const offset = (first.getDay() + 6) % 7;
  const anyMarks = Object.values(marksByDay).some(m => m.length > 0);

  const cellDark = 'rgba(245,242,238,0.03)';
  const padDark  = 'rgba(0,0,0,0.25)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {caption && (
        <div style={{ fontSize: 12, color: colors.boneFaint, fontFamily: fonts.body, textAlign: 'center', lineHeight: 1.5 }}>
          {caption}
        </div>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        background: '#000', gap: 2, border: '2px solid #000',
        borderRadius: 6, overflow: 'hidden',
      }}>
        {weekdays.map((w, i) => (
          <div key={`wd${i}`} style={{
            background: cellDark, minHeight: 24, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: colors.boneFaint, fontFamily: fonts.body,
          }}>{w}</div>
        ))}

        {Array.from({ length: offset }).map((_, i) => (
          <div key={`pad${i}`} style={{ background: padDark, minHeight: 90 }} />
        ))}

        {days.map((d, i) => {
          const marks = marksByDay[dayKey(d)] ?? [];
          const has = marks.length > 0;
          return (
            <div key={i} style={{
              background: has ? 'rgba(224,178,58,0.14)' : cellDark,
              minHeight: 90, display: 'flex', flexDirection: 'column',
              alignItems: 'flex-start', justifyContent: 'flex-start',
              padding: '7px 8px', gap: 4,
            }}>
              <div style={{ fontSize: 13, color: has ? colors.amber : colors.boneFaint, fontFamily: fonts.body, fontWeight: has ? 600 : 400 }}>
                {d.getDate()}
              </div>
              {has && (
                <div style={{ display: 'flex', gap: 2, alignSelf: 'center', marginTop: 6, lineHeight: 1 }}>
                  {marks.slice(0, 2).map((m, j) => (
                    <span key={j} style={{ fontSize: 15 }}>{m.icon}</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 12px', paddingTop: 4 }}>
        {legend.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', opacity: l.active ? 1 : 0.4 }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>{l.icon}</span>
            <div>
              <div style={{ fontSize: 12, color: l.active ? colors.bone : colors.boneFaint, fontFamily: fonts.body }}>{l.label}</div>
              {l.desc && <div style={{ fontSize: 10, color: colors.boneFaint, fontFamily: fonts.body, lineHeight: 1.4 }}>{l.desc}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
