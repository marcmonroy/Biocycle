import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState, TierLimits } from '../lib/supabase';
import { generateForecast, type ForecastResult } from '../lib/forecastEngine';
import { getDaysOfData } from '../lib/phaseEngine';
import { ForecastCalendar } from '../components/ForecastCalendar';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  tierLimits: TierLimits;
}

export function ForecastScreen({ profile, userState: _userState, tierLimits }: Props) {
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerName, setPartnerName] = useState<string | undefined>(undefined);

  const idioma = profile.idioma ?? 'EN';
  const daysOfData = getDaysOfData(profile);

  const { forecastDays, vulnerabilityAlerts, accuracyDisplay } = tierLimits;

  useEffect(() => {
    Promise.all([
      generateForecast(profile, forecastDays),
      supabase
        .from('relationships')
        .select('name')
        .eq('user_id', profile.id)
        .eq('intimacy', true)
        .order('rank', { ascending: true })
        .limit(1),
    ]).then(([forecastResult, { data: romantic }]) => {
      setForecast(forecastResult);
      setPartnerName((romantic?.[0] as any)?.name || undefined);
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

  return (
    <div style={{ minHeight: '100vh', background: colors.midnight, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '52px 24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <img src="/favicon.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>biocycle</span>
        </div>
        <h1 style={{ fontFamily: fonts.display, fontSize: '1.3rem', fontWeight: 300, color: colors.bone, margin: 0 }}>
          {idioma === 'ES' ? 'Pronóstico' : 'Forecast'}
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

      {/* Forecast calendar */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 24px 16px' }}>
        <ForecastCalendar forecast={forecast} tierLimits={tierLimits} idioma={idioma} partnerName={partnerName} />
      </div>

    </div>
  );
}
