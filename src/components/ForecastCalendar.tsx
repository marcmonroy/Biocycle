import { useState } from 'react';
import { CalendarGrid } from './CalendarGrid';
import type { CalendarMark, LegendEntry } from './CalendarGrid';
import { allSignalsForDay, type DaySignalBadge } from '../lib/forecastSignals';
import { exportToCalendar } from '../lib/icsExport';
import type { ForecastResult } from '../lib/forecastEngine';
import type { TierLimits } from '../lib/supabase';
import { colors, fonts } from '../lib/tokens';

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

  // Build one mark per day: primary emoji + warn flag for stress/anxiety spikes + more flag
  const marksByDay: Record<string, CalendarMark[]> = {};
  for (const day of forecastDays) {
    const sigs = allSignalsForDay(day, { isES, partnerName });
    if (sigs.length > 0) {
      const top = sigs[0];
      marksByDay[dayKey(new Date(day.date))] = [{
        icon: top.emoji,
        color: toneColor(top.tone),
        warn: top.tone === 'watch' && (top.kind === 'stress' || top.kind === 'anxiety'),
        more: sigs.length > 1,
      }];
    }
  }

  const caption = isES
    ? 'Toca un día para ver todo lo que trae.'
    : 'Tap a day to see everything it holds.';

  const emptyLine = isES
    ? 'Una racha tranquila y estable — sin días que sobresalgan.'
    : 'A calm, steady stretch ahead — no standout days.';

  // No abstract symbols — tap-detail explains specifics
  const legend: LegendEntry[] = [];

  const selectedForecastDay = selectedDate
    ? forecastDays.find(d => dayKey(new Date(d.date)) === dayKey(selectedDate))
    : null;
  const selectedBadges = selectedForecastDay
    ? allSignalsForDay(selectedForecastDay, { isES, partnerName })
    : [];

  async function handleExport() {
    const events = forecastDays
      .map(day => {
        const sigs = allSignalsForDay(day, { isES, partnerName });
        if (sigs.length === 0) return null;
        const top = sigs[0];
        return {
          date: new Date(day.date),
          title: top.label,
          notes: sigs.map(s => s.label).join(', '),
        };
      })
      .filter((e): e is { date: Date; title: string; notes: string } => e !== null);
    await exportToCalendar(events, 'biocycle-pronostico.ics');
  }

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
        singleMark={true}
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

      <button
        onClick={handleExport}
        style={{
          marginTop: 16, width: '100%',
          background: 'rgba(245,242,238,0.06)',
          border: '1px solid rgba(245,242,238,0.14)',
          borderRadius: 10, padding: '10px 0',
          color: colors.boneFaint, fontSize: 12,
          fontFamily: fonts.body, cursor: 'pointer',
          letterSpacing: '0.02em',
        }}
      >
        {isES ? 'Añadir a mi calendario' : 'Add to my calendar'}
      </button>
    </div>
  );
}
