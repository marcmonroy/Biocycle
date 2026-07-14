import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState, TierLimits } from '../lib/supabase';
import { generateForecast, type ForecastResult, type ForecastDay } from '../lib/forecastEngine';
import { getDaysOfData } from '../lib/phaseEngine';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  tierLimits: TierLimits;
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
        <span style={{ fontSize: 11, color: 'rgba(245,242,238,0.65)', letterSpacing: '0.03em' }}>{label}</span>
        <span style={{ fontSize: 11, color: colors.bone, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace' }}>{value}%</span>
      </div>
      <div style={{ height: 4, background: 'rgba(245,242,238,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function CompositeRing({ value, label, labelES, color, idioma }: {
  value: number; label: string; labelES: string; color: string; idioma: 'EN' | 'ES';
}) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 64 }}>
      <svg width={54} height={54} viewBox="0 0 54 54">
        <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(245,242,238,0.08)" strokeWidth={4} />
        <circle
          cx={27} cy={27} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 27 27)"
        />
        <text x={27} y={32} textAnchor="middle" fontSize={11} fontWeight={700}
          fill={colors.bone} fontFamily="JetBrains Mono, monospace">{value}</text>
      </svg>
      <span style={{ fontSize: 9, color: colors.boneFaint, textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        {idioma === 'ES' ? labelES : label}
      </span>
    </div>
  );
}

function HighlightCard({ emoji, label, labelES, value, subtext, subtextES, color, idioma }: {
  emoji: string; label: string; labelES: string;
  value: string; subtext: string; subtextES: string;
  color: string; idioma: 'EN' | 'ES';
}) {
  return (
    <div style={{
      background: `rgba(${color},0.08)`,
      border: `1px solid rgba(${color},0.25)`,
      borderRadius: 12, padding: '12px 14px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
      <div style={{ fontSize: 9, color: colors.boneFaint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
        {idioma === 'ES' ? labelES : label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: colors.bone, fontFamily: fonts.mono }}>{value}</div>
      <div style={{ fontSize: 10, color: colors.boneFaint, marginTop: 2, lineHeight: 1.4 }}>
        {idioma === 'ES' ? subtextES : subtext}
      </div>
    </div>
  );
}

function LockedBanner({ label, labelES, idioma }: { label: string; labelES: string; idioma: 'EN' | 'ES' }) {
  return (
    <div style={{
      background: 'rgba(123,97,255,0.06)',
      border: '1px solid rgba(123,97,255,0.2)',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{ fontSize: 16 }}>🔒</span>
      <div>
        <div style={{ fontSize: 11, color: colors.tierElite, fontWeight: 600, letterSpacing: '0.06em' }}>
          {idioma === 'ES' ? labelES : label}
        </div>
        <div style={{ fontSize: 10, color: colors.boneFaint, marginTop: 2 }}>
          {idioma === 'ES' ? 'Disponible en Standard y Premium' : 'Available on Standard & Premium'}
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, isToday, idioma, showSexual, showAllDims, showComposite }: {
  day: ForecastDay; isToday: boolean; idioma: 'EN' | 'ES';
  showSexual: boolean; showAllDims: boolean; showComposite: boolean;
}) {
  const [expanded, setExpanded] = useState(isToday);
  const sexualColor = day.sexual >= 70 ? colors.success : day.sexual >= 40 ? colors.amber : colors.boneFaint;
  const anxietyColor = day.anxiety >= 70 ? colors.danger : day.anxiety >= 50 ? colors.amber : colors.success;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{
        background: isToday ? 'rgba(245,242,238,0.06)' : 'rgba(245,242,238,0.02)',
        border: `1px solid ${isToday ? 'rgba(245,242,238,0.18)' : 'rgba(245,242,238,0.07)'}`,
        borderRadius: 14, padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
      }}
    >
      {/* Row 1: date + phase + vitality */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{day.phaseEmoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: colors.bone }}>
              {isToday ? (idioma === 'ES' ? 'Hoy' : 'Today') : formatDate(day.date, idioma)}
            </div>
            <div style={{ fontSize: 10, color: colors.boneFaint, letterSpacing: '0.04em' }}>
              {day.phaseLabel}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Always show energy + sexual teaser */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: colors.boneFaint, letterSpacing: '0.04em' }}>
              {idioma === 'ES' ? 'Energía' : 'Energy'}
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.amber, fontFamily: fonts.mono }}>
              {day.energy}
            </div>
          </div>
          {showSexual && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: colors.boneFaint, letterSpacing: '0.04em' }}>
                {idioma === 'ES' ? 'Sexual' : 'Sexual'}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: sexualColor, fontFamily: fonts.mono }}>
                {day.sexual}
              </div>
            </div>
          )}
          <span style={{ color: colors.boneFaint, fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ marginTop: 14 }}>

          {/* All 8 dimensions — gated */}
          {showAllDims ? (
            <>
              <DimBar label={idioma === 'ES' ? 'Energía' : 'Energy'} value={day.energy} color={colors.amber} />
              <DimBar label={idioma === 'ES' ? 'Cognitivo' : 'Cognitive'} value={day.cognitive} color={colors.tierElite} />
              <DimBar label={idioma === 'ES' ? 'Estrés' : 'Stress'} value={day.stress} color={colors.danger} />
              <DimBar label={idioma === 'ES' ? 'Ansiedad' : 'Anxiety'} value={day.anxiety} color={anxietyColor} />
              <DimBar label={idioma === 'ES' ? 'Sueño' : 'Sleep'} value={day.sleep} color={colors.success} />
              <DimBar label={idioma === 'ES' ? 'Emocional' : 'Emotional'} value={day.emotional} color="#a78bfa" />
              <DimBar label={idioma === 'ES' ? 'Social' : 'Social'} value={day.social} color="#34d399" />
              {showSexual && (
                <DimBar label={idioma === 'ES' ? 'Energía Sexual' : 'Sexual Energy'} value={day.sexual} color={sexualColor} />
              )}
            </>
          ) : (
            <>
              <DimBar label={idioma === 'ES' ? 'Energía' : 'Energy'} value={day.energy} color={colors.amber} />
              {showSexual && (
                <DimBar label={idioma === 'ES' ? 'Energía Sexual' : 'Sexual Energy'} value={day.sexual} color={sexualColor} />
              )}
              <div style={{ marginTop: 8 }}>
                <LockedBanner
                  label="6 more dimensions available"
                  labelES="6 dimensiones más disponibles"
                  idioma={idioma}
                />
              </div>
            </>
          )}

          {/* Composite scores — Premium only */}
          {showComposite && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 10, fontWeight: 500, letterSpacing: '0.12em',
                color: colors.boneFaint, fontFamily: fonts.mono,
                textTransform: 'uppercase', marginBottom: 12,
              }}>
                {idioma === 'ES' ? 'Índices compuestos' : 'Composite scores'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
                <CompositeRing value={day.composite.biologicalVitality}
                  label="Vitality" labelES="Vitalidad" color={colors.success} idioma={idioma} />
                <CompositeRing value={day.composite.performance}
                  label="Performance" labelES="Rendimiento" color={colors.amber} idioma={idioma} />
                <CompositeRing value={day.composite.cognitiveEdge}
                  label="Cognitive Edge" labelES="Mente" color={colors.tierElite} idioma={idioma} />
                <CompositeRing value={day.composite.emotionalResilience}
                  label="Resilience" labelES="Resiliencia" color="#a78bfa" idioma={idioma} />
                <CompositeRing value={day.composite.socialMagnetism}
                  label="Social" labelES="Social" color="#34d399" idioma={idioma} />
                <CompositeRing value={day.composite.recoveryQuality}
                  label="Recovery" labelES="Recuperación" color="#60a5fa" idioma={idioma} />
                <CompositeRing value={day.composite.intimacyReadiness}
                  label="Intimacy" labelES="Intimidad" color="#f472b6" idioma={idioma} />
                <CompositeRing value={100 - day.composite.stressLoad}
                  label="Calm" labelES="Calma" color="#fbbf24" idioma={idioma} />
              </div>
            </div>
          )}

          {/* Phase insight */}
          {day.insight && (
            <div style={{
              marginTop: 14, padding: '10px 12px',
              background: 'rgba(245,242,238,0.04)',
              borderRadius: 8, borderLeft: `2px solid ${colors.amber}`,
            }}>
              <p style={{ margin: 0, fontSize: 11, color: 'rgba(245,242,238,0.7)', lineHeight: 1.5 }}>
                {idioma === 'ES' ? day.insightES : day.insight}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ForecastScreen({ profile, userState: _userState, tierLimits }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<Array<{
    session_date: string; time_slot: string;
    factor_energia: number | null; factor_estres: number | null;
    factor_ansiedad: number | null; factor_cognitivo: number | null;
    factor_sueno: number | null; factor_emocional: number | null;
  }>>([]);

  const idioma = profile.idioma ?? 'EN';
  const daysOfData = getDaysOfData(profile);
  const age = profile.fecha_nacimiento ? new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear() : 0;
  const showSexual = age >= 18;

  const { forecastDays, forecastAllDims, forecastComposite, forecastHighlights, vulnerabilityAlerts, accuracyDisplay } = tierLimits;

  useEffect(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    Promise.all([
      generateForecast(profile, forecastDays),
      supabase
        .from('conversation_sessions')
        .select('session_date,time_slot,factor_energia,factor_estres,factor_ansiedad,factor_cognitivo,factor_sueno,factor_emocional')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .gte('session_date', sevenDaysAgo.toLocaleDateString('en-CA'))
        .order('session_date', { ascending: true }),
    ]).then(([forecastResult, { data: sessions }]) => {
      setForecast(forecastResult);
      if (sessions) setTrendData(sessions as any[]);
      setLoading(false);
    });
  }, [profile.id, forecastDays]);

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

  const horizonLabel = forecastDays === 3
    ? (idioma === 'ES' ? 'Pronóstico 3 días' : '3-Day Forecast')
    : forecastDays === 14
      ? (idioma === 'ES' ? 'Pronóstico 14 días' : '14-Day Forecast')
      : (idioma === 'ES' ? 'Pronóstico 7 días' : '7-Day Forecast');

  // Best/worst day labels
  const getDayLabel = (idx: number | null) => {
    if (idx === null || !forecast.days[idx]) return '—';
    return formatDate(forecast.days[idx].date, idioma);
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.midnight, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '52px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <img src="/favicon.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>biocycle</span>
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: '1.3rem', fontWeight: 300, color: colors.bone, margin: 0 }}>
          {horizonLabel}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{
            background: forecast.mode === 'companion' ? 'rgba(0,200,150,0.12)' : forecast.mode === 'calibration' ? 'rgba(239,159,39,0.12)' : 'rgba(123,97,255,0.12)',
            border: `1px solid ${forecast.mode === 'companion' ? 'rgba(0,200,150,0.3)' : forecast.mode === 'calibration' ? 'rgba(239,159,39,0.3)' : 'rgba(123,97,255,0.3)'}`,
            borderRadius: 6, padding: '3px 10px', fontSize: 10,
            color: forecast.mode === 'companion' ? colors.success : forecast.mode === 'calibration' ? colors.amber : colors.tierElite,
            fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
          }}>
            {modeLabel}
          </div>
          {accuracyDisplay && forecast.accuracyPct != null && (
            <div style={{ fontSize: 11, color: colors.boneFaint }}>
              {idioma === 'ES' ? `Precisión: ${forecast.accuracyPct}%` : `Accuracy: ${forecast.accuracyPct}%`}
            </div>
          )}
        </div>
      </div>

      {/* Learning mode banner */}
      {forecast.mode === 'learning' && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{ background: 'rgba(123,97,255,0.08)', border: '1px solid rgba(123,97,255,0.25)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: colors.tierElite, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
              {idioma === 'ES' ? 'Jules está aprendiendo' : 'Jules is learning'}
            </div>
            <div style={{ color: 'rgba(245,242,238,0.75)', fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? `${30 - daysOfData} días para que este pronóstico se calibre a ti específicamente.`
                : `${30 - daysOfData} days until this forecast calibrates to you specifically.`}
            </div>
          </div>
        </div>
      )}

      {/* Vulnerability alert — Standard + Premium only */}
      {vulnerabilityAlerts && forecast.vulnerabilityAlertHours != null && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{ background: 'rgba(239,159,39,0.12)', border: '1px solid rgba(239,159,39,0.35)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: colors.amber, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
              ⚠ {idioma === 'ES' ? 'Ventana de vulnerabilidad' : 'Vulnerability window'}
            </div>
            <div style={{ color: 'rgba(245,242,238,0.85)', fontSize: 12, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? `Se aproxima en ${forecast.vulnerabilityAlertHours} horas. Reduce cafeína, protege tu sueño, evita decisiones importantes.`
                : `Approaching in ${forecast.vulnerabilityAlertHours} hours. Reduce caffeine, protect sleep, avoid big decisions.`}
            </div>
          </div>
        </div>
      )}

      {/* Best / worst day highlights — Premium only */}
      {forecastHighlights && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', color: colors.boneFaint, fontFamily: fonts.mono, textTransform: 'uppercase' as const, marginBottom: 10 }}>
            {idioma === 'ES' ? 'Highlights del período' : 'Period highlights'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <HighlightCard
              emoji="⚡" label="Peak Performance" labelES="Mejor rendimiento"
              value={getDayLabel(forecast.bestPerformanceDay)}
              subtext="Best day to execute" subtextES="Mejor día para ejecutar"
              color="239,159,39" idioma={idioma}
            />
            <HighlightCard
              emoji="🧠" label="Cognitive Peak" labelES="Pico cognitivo"
              value={getDayLabel(forecast.bestCognitiveDay)}
              subtext="Complex work & decisions" subtextES="Trabajo complejo y decisiones"
              color="123,97,255" idioma={idioma}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <HighlightCard
              emoji="💞" label="Intimacy Window" labelES="Ventana de intimidad"
              value={getDayLabel(forecast.bestIntimacyDay)}
              subtext="Connection & closeness" subtextES="Conexión y cercanía"
              color="244,114,182" idioma={idioma}
            />
            <HighlightCard
              emoji="⚠️" label="High Stress Risk" labelES="Riesgo de estrés"
              value={getDayLabel(forecast.worstStressDay)}
              subtext="Protect your schedule" subtextES="Protege tu agenda"
              color="239,68,68" idioma={idioma}
            />
          </div>
        </div>
      )}

      {/* Upsell for free tier — no highlights */}
      {!forecastHighlights && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
          <div style={{ background: 'rgba(123,97,255,0.06)', border: '1px solid rgba(123,97,255,0.2)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ color: colors.tierElite, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 4 }}>
              🔒 {idioma === 'ES' ? 'Highlights disponibles en Premium' : 'Highlights available on Premium'}
            </div>
            <div style={{ color: 'rgba(245,242,238,0.65)', fontSize: 11, lineHeight: 1.5 }}>
              {idioma === 'ES'
                ? 'Descubre tu mejor día para ejecutar, tu pico cognitivo, tu ventana de intimidad y días de riesgo.'
                : 'See your best day to execute, cognitive peak, intimacy window, and high-stress risk days.'}
            </div>
          </div>
        </div>
      )}

      {/* Real data trend — last 7 days */}
      {trendData.length > 0 && (() => {
        const dims = [
          { key: 'factor_energia',   labelEN: 'Energy',  labelES: 'Energía', color: colors.amber },
          { key: 'factor_cognitivo', labelEN: 'Focus',   labelES: 'Enfoque', color: colors.tierElite },
          { key: 'factor_estres',    labelEN: 'Stress',  labelES: 'Estrés',  color: colors.danger,  invert: true },
          { key: 'factor_ansiedad',  labelEN: 'Anxiety', labelES: 'Ansiedad',color: colors.danger,  invert: true },
          { key: 'factor_sueno',     labelEN: 'Sleep',   labelES: 'Sueño',   color: colors.success },
        ];
        const byDate: Record<string, Record<string, number[]>> = {};
        trendData.forEach((s: any) => {
          if (!byDate[s.session_date]) byDate[s.session_date] = {};
          dims.forEach(d => {
            const v = s[d.key];
            if (v != null) {
              if (!byDate[s.session_date][d.key]) byDate[s.session_date][d.key] = [];
              byDate[s.session_date][d.key].push(v);
            }
          });
        });
        const dates = Object.keys(byDate).sort();
        const W = 36; const H = 36;
        const chartW = Math.max(dates.length * W, 200);
        const getAvg = (date: string, key: string) => {
          const vals = byDate[date]?.[key];
          if (!vals || vals.length === 0) return null;
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };
        const sparkPath = (key: string, invert?: boolean) => {
          const points = dates.map((d, i) => {
            const v = getAvg(d, key);
            if (v == null) return null;
            const norm = invert ? (10 - v) / 10 : v / 10;
            const x = i * W + W / 2;
            const y = H - norm * H;
            return `${x},${y}`;
          }).filter(Boolean);
          if (points.length < 2) return '';
          return `M ${points.join(' L ')}`;
        };
        const dayLabels = dates.map(d => {
          const dt = new Date(d + 'T12:00:00');
          const names = idioma === 'ES' ? DAY_NAMES_ES : DAY_NAMES_EN;
          return names[dt.getDay()];
        });
        return (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
            <div style={{ background: colors.surfaceLow, border: `1px solid ${colors.surfaceBorder}`, borderRadius: 14, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', color: colors.boneFaint, fontFamily: fonts.mono, textTransform: 'uppercase' as const, marginBottom: 12 }}>
                {idioma === 'ES' ? 'Tus últimos 7 días' : 'Your last 7 days'}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <svg width={chartW} height={H + 20} style={{ display: 'block' }}>
                  {dayLabels.map((label, i) => (
                    <text key={i} x={i * W + W / 2} y={H + 14} textAnchor="middle" fontSize={9} fill={colors.boneFaint} fontFamily={fonts.mono}>{label}</text>
                  ))}
                  {dims.map(d => {
                    const path = sparkPath(d.key, d.invert);
                    if (!path) return null;
                    return <path key={d.key} d={path} stroke={d.color} strokeWidth={1.5} fill="none" opacity={0.8} strokeLinecap="round" strokeLinejoin="round" />;
                  })}
                  {dims.map(d => {
                    const lastDate = dates[dates.length - 1];
                    const v = getAvg(lastDate, d.key);
                    if (v == null) return null;
                    const norm = d.invert ? (10 - v) / 10 : v / 10;
                    const x = (dates.length - 1) * W + W / 2;
                    const y = H - norm * H;
                    return <circle key={d.key} cx={x} cy={y} r={3} fill={d.color} />;
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px 14px', marginTop: 8 }}>
                {dims.map(d => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 16, height: 2, background: d.color, borderRadius: 1 }} />
                    <span style={{ fontSize: 10, color: colors.boneFaint, fontFamily: fonts.body }}>
                      {idioma === 'ES' ? d.labelES : d.labelEN}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Day cards */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px' }}>
        {forecast.days.map((day, i) => (
          <DayCard
            key={i} day={day} isToday={i === 0} idioma={idioma}
            showSexual={showSexual}
            showAllDims={forecastAllDims}
            showComposite={forecastComposite}
          />
        ))}
      </div>

    </div>
  );
}
