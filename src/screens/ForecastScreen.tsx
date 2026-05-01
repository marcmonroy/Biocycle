import { useState, useEffect } from 'react';
import type { Profile } from '../lib/supabase';
import { generateForecast, type ForecastResult, type ForecastDay } from '../lib/forecastEngine';
import { getDaysOfData } from '../lib/phaseEngine';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
}

const DAY_NAMES_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_NAMES_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function formatDate(date: Date, idioma: 'EN' | 'ES'): string {
  const days = idioma === 'ES' ? DAY_NAMES_ES : DAY_NAMES_EN;
  return `${days[date.getDay()]} ${date.getDate()}`;
}

function DimBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: 'rgba(245, 242, 238,0.65)', letterSpacing: '0.03em' }}>{label}</span>
        <span style={{ fontSize: 11, color: colors.bone, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(245, 242, 238,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function DayCard({ day, isToday, idioma, showSexual }: { day: ForecastDay; isToday: boolean; idioma: 'EN' | 'ES'; showSexual: boolean }) {
  const anxietyColor = day.anxiety >= 70 ? colors.amber : day.anxiety >= 50 ? colors.amber : colors.success;
  const anxietyLabel = day.anxiety >= 70
    ? (idioma === 'ES' ? 'Vulnerabilidad' : 'Vulnerability')
    : day.anxiety >= 50
      ? (idioma === 'ES' ? 'Elevada' : 'Elevated')
      : (idioma === 'ES' ? 'Baja' : 'Low');

  return (
    <div style={{
      background: 'rgba(245, 242, 238,0.03)',
      border: isToday ? '1px solid rgba(255,217,61,0.3)' : '1px solid rgba(245, 242, 238,0.06)',
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: colors.boneFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
            {isToday ? (idioma === 'ES' ? 'Hoy' : 'Today') : formatDate(day.date, idioma)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>{day.phaseEmoji}</span>
            <span style={{ color: colors.bone, fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
              {idioma === 'ES' ? day.phaseLabelES : day.phaseLabel}
            </span>
          </div>
        </div>
        <div style={{
          background: `${anxietyColor}22`,
          border: `1px solid ${anxietyColor}44`,
          borderRadius: 6,
          padding: '3px 8px',
          fontSize: 10,
          color: anxietyColor,
          fontWeight: 600,
        }}>
          {anxietyLabel}
        </div>
      </div>

      <DimBar label={idioma === 'ES' ? 'Energía' : 'Energy'}          value={day.energy}    color={colors.amber} />
      <DimBar label={idioma === 'ES' ? 'Cognitivo' : 'Cognitive'}     value={day.cognitive} color={colors.tierElite} />
      <DimBar label={idioma === 'ES' ? 'Emocional' : 'Emotional'}     value={day.emotional} color={colors.amber} />
      <DimBar label={idioma === 'ES' ? 'Físico' : 'Physical'}         value={day.physical}  color={colors.success} />
      {showSexual && <DimBar label="Sexual" value={day.sexual} color={colors.amber} />}

      <p style={{ color: 'rgba(245, 242, 238,0.55)', fontSize: 12, lineHeight: 1.5, margin: '10px 0 0', paddingTop: 10, borderTop: '1px solid rgba(245, 242, 238,0.06)' }}>
        {idioma === 'ES' ? day.insightES : day.insight}
      </p>
    </div>
  );
}

export function ForecastScreen({ profile }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);

  const idioma = profile.idioma ?? 'EN';
  const daysOfData = getDaysOfData(profile);
  const age = profile.fecha_nacimiento ? new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear() : 0;
  const showSexual = age >= 18;

  useEffect(() => {
    generateForecast(profile).then(r => {
      setForecast(r);
      setLoading(false);
    });
  }, [profile.id]);

  if (loading || !forecast) {
    return (
      <div style={{ minHeight: '100vh', background: colors.midnight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,217,61,0.5)', fontSize: 12, letterSpacing: '0.15em' }}>
          {idioma === 'ES' ? 'CALCULANDO...' : 'CALCULATING...'}
        </div>
      </div>
    );
  }

  const modeLabel = forecast.mode === 'learning'
    ? (idioma === 'ES' ? 'Aprendiendo' : 'Learning')
    : forecast.mode === 'calibration'
      ? (idioma === 'ES' ? 'Calibrando a ti' : 'Calibrating to you')
      : (idioma === 'ES' ? 'Personalizado' : 'Personalized');

  return (
    <div style={{ minHeight: '100vh', background: colors.midnight, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '52px 24px 16px' }}>
        <h1 style={{
          fontFamily: fonts.display,
          fontSize: '1.3rem',
          fontWeight: 300,
          color: colors.bone,
          margin: 0,
        }}>
          {idioma === 'ES' ? 'Pronóstico 7 días' : '7-Day Forecast'}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{
            background: forecast.mode === 'companion' ? 'rgba(0,200,150,0.12)' : forecast.mode === 'calibration' ? 'rgba(239, 159, 39,0.12)' : 'rgba(123,97,255,0.12)',
            border: `1px solid ${forecast.mode === 'companion' ? 'rgba(0,200,150,0.3)' : forecast.mode === 'calibration' ? 'rgba(239, 159, 39,0.3)' : 'rgba(123,97,255,0.3)'}`,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 10,
            color: forecast.mode === 'companion' ? colors.success : forecast.mode === 'calibration' ? colors.amber : colors.tierElite,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {modeLabel}
          </div>
          {forecast.accuracyPct != null && (
            <div style={{ fontSize: 11, color: colors.boneFaint }}>
              {idioma === 'ES' ? `Precisión: ${forecast.accuracyPct}%` : `Accuracy: ${forecast.accuracyPct}%`}
            </div>
          )}
        </div>
      </div>

      {/* Learning mode banner */}
      {forecast.mode === 'learning' && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{
            background: 'rgba(123,97,255,0.08)',
            border: '1px solid rgba(123,97,255,0.25)',
            borderRadius: 12,
            padding: '14px 16px',
          }}>
            <div style={{ color: colors.tierElite, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              {idioma === 'ES' ? 'Jules está aprendiendo' : 'Jules is learning'}
            </div>
            <div style={{ color: 'rgba(245, 242, 238,0.75)', fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? `${30 - daysOfData} días para que este pronóstico se calibre a ti específicamente. Lo de abajo es el modelo base — todavía no es tuyo.`
                : `${30 - daysOfData} days until this forecast calibrates to you specifically. Below is the textbook model — not yet yours.`}
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability alert */}
      {forecast.vulnerabilityAlertHours != null && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{
            background: 'rgba(239, 159, 39,0.12)',
            border: '1px solid rgba(239, 159, 39,0.35)',
            borderRadius: 12,
            padding: '14px 16px',
          }}>
            <div style={{ color: colors.amber, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              ⚠ {idioma === 'ES' ? 'Ventana de vulnerabilidad' : 'Vulnerability window'}
            </div>
            <div style={{ color: 'rgba(245, 242, 238,0.85)', fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? `Se aproxima en ${forecast.vulnerabilityAlertHours} horas. Reduce cafeína, protege tu sueño, evita decisiones importantes.`
                : `Approaching in ${forecast.vulnerabilityAlertHours} hours. Reduce caffeine, protect sleep, avoid big decisions.`}
            </div>
          </div>
        </div>
      )}

      {/* Day cards */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px' }}>
        {forecast.days.map((day, i) => (
          <DayCard key={i} day={day} isToday={i === 0} idioma={idioma} showSexual={showSexual} />
        ))}
      </div>
    </div>
  );
}
