import { colors, fonts } from '../lib/tokens';

export interface CalendarMark { icon: string; color: string; warn?: boolean; more?: boolean; }
export interface LegendEntry { icon: string; color: string; label: string; active: boolean; desc?: string; }

interface Props {
  days: Date[];
  marksByDay: Record<string, CalendarMark[]>;
  legend: LegendEntry[];
  caption?: string;
  emptyLine?: string;
  isES: boolean;
  onDayTap?: (date: Date) => void;
  singleMark?: boolean;
}

const dayKey = (d: Date) => d.toLocaleDateString('en-CA');

export function CalendarGrid({ days, marksByDay, legend, caption, emptyLine, isES, onDayTap, singleMark = false }: Props) {
  const weekdays = isES ? ['L','M','M','J','V','S','D'] : ['M','T','W','T','F','S','S'];
  const first = days[0] ?? new Date();
  const offset = (first.getDay() + 6) % 7;
  const anyMarks = Object.values(marksByDay).some(m => m.length > 0);

  const cellDark = '#161d30';
  const padDark  = '#0e1424';
  const cellHeight = singleMark ? 70 : 90;

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
          <div key={`pad${i}`} style={{ background: padDark, minHeight: cellHeight }} />
        ))}

        {days.map((d, i) => {
          const marks = marksByDay[dayKey(d)] ?? [];
          const has = marks.length > 0;
          const top = marks[0];
          const isWarn = singleMark && has && top.warn === true;

          const cellBg = has
            ? (isWarn ? 'rgba(179,64,47,0.18)' : 'rgba(224,178,58,0.14)')
            : cellDark;

          return (
            <div key={i}
              onClick={onDayTap ? () => onDayTap(d) : undefined}
              style={{
                background: cellBg,
                minHeight: cellHeight,
                display: 'flex',
                flexDirection: 'column',
                alignItems: singleMark ? 'center' : 'flex-start',
                justifyContent: 'flex-start',
                padding: '7px 8px',
                gap: 4,
                cursor: onDayTap ? 'pointer' : undefined,
                position: singleMark ? 'relative' : undefined,
                ...(isWarn ? { boxShadow: 'inset 0 0 0 1px rgba(179,64,47,0.5)' } : {}),
              }}
            >
              <div style={{ fontSize: 13, color: has ? colors.amber : colors.boneFaint, fontFamily: fonts.body, fontWeight: has ? 600 : 400 }}>
                {d.getDate()}
              </div>

              {/* singleMark mode: one primary emoji + optional warn/more badges */}
              {singleMark && has && (
                <>
                  {isWarn && (
                    <span style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, lineHeight: 1 }}>⚠️</span>
                  )}
                  <span style={{ fontSize: 19, lineHeight: 1, marginTop: 2 }}>{top.icon}</span>
                  {top.more && (
                    <span style={{ position: 'absolute', bottom: 4, right: 5, fontSize: 9, color: colors.boneFaint, lineHeight: 1, fontFamily: fonts.body }}>＋</span>
                  )}
                </>
              )}

              {/* multi-mark mode (compatibility calendar): up to 2 icons side by side */}
              {!singleMark && has && (
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
