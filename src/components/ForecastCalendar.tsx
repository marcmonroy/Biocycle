import { useState } from 'react';
import { CalendarGrid } from './CalendarGrid';
import type { CalendarMark, LegendEntry } from './CalendarGrid';
import { allSignalsForDay, type DaySignalBadge } from '../lib/forecastSignals';
import type { ForecastResult } from '../lib/forecastEngine';
import type { TierLimits } from '../lib/supabase';
import { fonts } from '../lib/tokens';

interface Props {
  forecast: ForecastResult;
  tierLimits: TierLimits;
  idioma: 'EN' | 'ES';
  partnerName?: string;
}

const dayKey = (d: Date) => d.toLocaleDateString('en-CA');

function toneColor(tone: 'watch' | 'opportunity' | 'decision'): string {
  if (tone === 'opportunity') return '#2c7a4d';
  if (tone === 'decision') return '#7fb0f0';
  return '#a8791d'; // watch
}

export function ForecastCalendar({ forecast, tierLimits, idioma, partnerName }: Props) {
  const isES = idioma === 'ES';
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // day 0 = today; show tomorrow onward, capped by tier lookahead
  const forecastDays = forecast.days.slice(1, tierLimits.forecastDays + 1);
  const days = forecastDays.map(d => new Date(d.date));

  const marksByDay: Record<string, CalendarMark[]> = {};
  for (const day of forecastDays) {
    const signals = allSignalsForDay(day, { isES, partnerName });
    if (signals.length > 0) {
      marksByDay[dayKey(new Date(day.date))] = signals.map(s => ({
        icon: s.emoji,
        color: toneColor(s.tone),
      }));
    }
  }

  const legend: LegendEntry[] = [
    {
      icon: '✦',
      color: '#2c7a4d',
      label: isES ? 'Oportunidad' : 'Opportunity',
      active: true,
      desc: isES ? 'Pico de energía o estado anímico' : 'Energy or mood peak',
    },
    {
      icon: '◆',
      color: '#7fb0f0',
      label: isES ? 'Día para decidir' : 'Decision window',
      active: true,
      desc: isES ? 'Ventana cognitiva favorable' : 'Favorable cognitive window',
    },
    {
      icon: '▲',
      color: '#a8791d',
      label: isES ? 'Cuidado' : 'Watch-out',
      active: true,
      desc: isES ? 'Estrés, ansiedad u otro alerta' : 'Stress, anxiety, or other alert',
    },
  ];

  const emptyLine = isES
    ? 'Una racha tranquila y estable — sin días que sobresalgan.'
    : 'A calm, steady stretch ahead — no standout days.';

  const caption = isES ? 'Toca un día para ver detalles.' : 'Tap a day for details.';

  const selectedForecastDay = selectedDate
    ? forecastDays.find(d => dayKey(new Date(d.date)) === dayKey(selectedDate))
    : null;
  const selectedBadges = selectedForecastDay
    ? allSignalsForDay(selectedForecastDay, { isES, partnerName })
    : [];

  return (
    <div style={{ fontFamily: fonts.body }}>
      <CalendarGrid
        days={days}
        marksByDay={marksByDay}
        legend={legend}
        caption={caption}
        emptyLine={emptyLine}
        isES={isES}
        onDayTap={setSelectedDate}
      />

      {selectedForecastDay && selectedBadges.length > 0 && (
        <div style={{
          marginTop: 14,
          background: 'rgba(245,242,238,0.04)',
          border: '1px solid rgba(245,242,238,0.1)',
          borderRadius: 12,
          padding: '14px 16px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#f5f2ee' }}>
              {new Date(selectedForecastDay.date).toLocaleDateString(
                isES ? 'es-ES' : 'en-US',
                { weekday: 'long', month: 'short', day: 'numeric' },
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              style={{
                background: 'none', border: 'none',
                color: 'rgba(245,242,238,0.45)', fontSize: 18,
                cursor: 'pointer', padding: 0, lineHeight: 1,
              }}
            >×</button>
          </div>
          {selectedBadges.map((b: DaySignalBadge, i: number) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                marginBottom: i < selectedBadges.length - 1 ? 10 : 0,
                paddingBottom: i < selectedBadges.length - 1 ? 10 : 0,
                borderBottom: i < selectedBadges.length - 1
                  ? '1px solid rgba(245,242,238,0.06)'
                  : 'none',
              }}
            >
              <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{b.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: toneColor(b.tone), marginBottom: 2 }}>
                  {b.label}
                </div>
                {b.tip && (
                  <div style={{ fontSize: 11, color: 'rgba(245,242,238,0.7)', lineHeight: 1.45 }}>
                    {b.tip}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedForecastDay && selectedBadges.length === 0 && (
        <div style={{
          marginTop: 14,
          background: 'rgba(245,242,238,0.03)',
          border: '1px solid rgba(245,242,238,0.08)',
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 12, color: 'rgba(245,242,238,0.45)' }}>
            {isES ? 'Día tranquilo — sin señales destacadas.' : 'Quiet day — no notable signals.'}
          </div>
          <button
            onClick={() => setSelectedDate(null)}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(245,242,238,0.45)', fontSize: 18,
              cursor: 'pointer', padding: 0, lineHeight: 1,
            }}
          >×</button>
        </div>
      )}
    </div>
  );
}
