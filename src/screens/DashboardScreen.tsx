import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData } from '../lib/phaseEngine';
import { getCardForUser, getArcStage } from '../lib/cardSystem';
import { computePortfolioMetrics } from '../lib/portfolioValue';
import { generateForecast, type ForecastDay } from '../lib/forecastEngine';
import type { Tab } from '../components/BottomNav';
import { colors, fonts } from '../lib/tokens';

interface Props {
  profile: Profile;
  userState: UserState | null;
  onStartCoach: () => void;
  onOpenProfile: () => void;
  onNavigate: (tab: Tab) => void;
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(2)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function ForecastBar({ label, value, color, large = false }: { label: string; value: number; color: string; large?: boolean }) {
  return (
    <div style={{ marginBottom: large ? 14 : 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ color: colors.boneDim, fontSize: large ? 13 : 11, fontFamily: fonts.body, fontWeight: large ? 600 : 400 }}>{label}</span>
        <span style={{ color, fontSize: large ? 13 : 11, fontWeight: 700, fontFamily: fonts.mono }}>{value}%</span>
      </div>
      <div style={{ height: large ? 6 : 4, background: colors.surfaceMid, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
      </div>
    </div>
  );
}

export function DashboardScreen({ profile, userState, onStartCoach, onOpenProfile, onNavigate }: Props) {
  const [streak, setStreak] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(1.0);
  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const [topRels, setTopRels] = useState<{ name: string; avgScore: number | null; category: string }[]>([]);
  const [todayForecast, setTodayForecast] = useState<ForecastDay | null>(null);
  const [sharing, setSharing] = useState(false);
  const [liveDays, setLiveDays] = useState<number>(getDaysOfData(profile));

  const animatedValue = useCountUp(portfolioValue, 1200);
  const daysOfData = getDaysOfData(profile);
  const phase = getCurrentPhase(profile);
  const card = getCardForUser(profile);
  const idioma = profile.idioma ?? 'EN';
  const cardImgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    async function loadStats() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Load forecast for today
      const forecast = await generateForecast(profile);
      if (forecast.days.length > 0) {
        setTodayForecast(forecast.days[0]);
      }

      // Streak calculation
      const { data: allSessions } = await supabase
        .from('conversation_sessions')
        .select('session_date')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false })
        .limit(300);

      if (allSessions) {
        const uniqueDates = [...new Set(allSessions.map((s: any) => s.session_date as string))].sort().reverse();
        const todayStr = new Date().toISOString().split('T')[0];
        let currentStreak = 0;
        let checkDate = todayStr;
        for (const date of uniqueDates) {
          if (date === checkDate) {
            currentStreak++;
            const prev = new Date(checkDate);
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toISOString().split('T')[0];
          } else break;
        }
        setStreak(currentStreak);
      }

      // Load fresh days_of_data from Supabase — profile prop may be stale
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('days_of_data')
        .eq('id', profile.id)
        .single();
      if (freshProfile?.days_of_data != null) {
        setLiveDays(freshProfile.days_of_data);
      }

      const metrics = await computePortfolioMetrics(profile);
      setPortfolioValue(metrics.value);
      setQualityScore(metrics.qualityScore);
      setConsistencyScore(metrics.consistencyScore);

      // Forecast accuracy (30+ days only)
      if (daysOfData >= 30) {
        const { data: accRows } = await supabase
          .from('forecast_accuracy')
          .select('accuracy_pct')
          .eq('user_id', profile.id)
          .gte('forecast_date', thirtyDaysAgo.toISOString().split('T')[0])
          .not('accuracy_pct', 'is', null);
        if (accRows && accRows.length > 0) {
          const avg = accRows.reduce((a: number, r: any) => a + r.accuracy_pct, 0) / accRows.length;
          setAccuracyPct(Math.round(avg));
        }
      }

      // Top 3 relationships
      const { data: rels } = await supabase
        .from('relationships')
        .select('id, name, category')
        .eq('user_id', profile.id)
        .order('rank', { ascending: true })
        .limit(3);
      if (rels && rels.length > 0) {
        const enriched = await Promise.all(rels.map(async (r: any) => {
          const since = new Date();
          since.setDate(since.getDate() - 30);
          const { data: interactions } = await supabase
            .from('relationship_interactions')
            .select('connection_score')
            .eq('relationship_id', r.id)
            .gte('interaction_date', since.toISOString().split('T')[0]);
          let avgScore: number | null = null;
          if (interactions && interactions.length > 0) {
            const scores = interactions.map((i: any) => i.connection_score).filter((s: number) => s != null);
            if (scores.length > 0) {
              avgScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 10) / 10;
            }
          }
          return { name: r.name, avgScore, category: r.category };
        }));
        setTopRels(enriched);
      }
    }
    loadStats();
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPaused = userState?.state === 'paused_trader';
  const nombre = profile.nombre ?? (idioma === 'ES' ? 'Trader' : 'Trader');
  const greeting = idioma === 'ES' ? `Hola, ${nombre}.` : `Hey, ${nombre}.`;
  const cardHeadline = idioma === 'ES' ? card.headlineES : card.headline;
  const cardCopy     = idioma === 'ES' ? card.copyTextES : card.copyText;
  const phaseLabel   = idioma === 'ES' ? phase.displayNameES : phase.displayName;

  const gender = (profile.genero ?? 'nonbinary') as 'female' | 'male' | 'nonbinary';
  const picardiaMode = profile.picardia_mode ?? false;
  const arcData   = getArcStage(liveDays, gender, picardiaMode);
  const arcLabel  = idioma === 'ES' ? arcData?.labelES : arcData?.label;
  const arcTeaser = idioma === 'ES' ? arcData?.teaserES : arcData?.teaser;

  async function shareCard() {
    if (sharing) return;
    setSharing(true);
    try {
      const canvas = document.createElement('canvas');
      const W = 720, H = 900;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setSharing(false); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('img load failed'));
        img.src = card.imageUrl ?? '';
      });
      const scale = Math.max(W / img.width, H / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.fillStyle = colors.midnight;
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
      const grad = ctx.createLinearGradient(0, H - 200, 0, H);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, H - 200, W, 200);
      ctx.fillStyle = colors.bone;
      ctx.font = 'bold 34px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const words = cardHeadline.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > W - 80 && line) { lines.push(line.trim()); line = w + ' '; }
        else { line = test; }
      }
      if (line.trim()) lines.push(line.trim());
      let y = H - 50 - (lines.length - 1) * 42;
      for (const l of lines) { ctx.fillText(l, 40, y); y += 42; }
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
      if (!blob) { setSharing(false); return; }
      const file = new File([blob], 'biocycle-card.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: idioma === 'ES' ? 'Pronostica tu futuro — biocycle.app' : 'Forecast your future — biocycle.app' });
      } else {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert(idioma === 'ES' ? 'Imagen copiada' : 'Image copied');
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'biocycle-card.png'; a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) { console.error('share failed', e); }
    finally { setSharing(false); }
  }

  const flameColor = streak >= 3 ? colors.amber : colors.boneFaint;
  const tierColors = {
    FOUNDING: { bg: `${colors.amber}22`, border: `${colors.amber}44`, text: colors.amber },
    ELITE:    { bg: `${colors.tierElite}22`, border: `${colors.tierElite}44`, text: colors.tierElite },
    PREMIUM:  { bg: colors.boneTrace, border: colors.surfaceBorderHi, text: colors.bone },
    STANDARD: { bg: colors.surfaceLow, border: colors.surfaceBorder, text: colors.boneDim },
    NEW:      { bg: 'transparent', border: colors.surfaceBorder, text: colors.boneFaint },
  } as const;
  type TierKey = keyof typeof tierColors;
  const tierKey = ((profile as any).tier?.toUpperCase() ?? 'NEW') as TierKey;
  const tierStyle = tierColors[tierKey] ?? tierColors.NEW;

  // Sexual energy forecast color
  const sexualColor = todayForecast
    ? todayForecast.sexual >= 70 ? colors.success : todayForecast.sexual >= 45 ? colors.amber : colors.danger
    : colors.boneFaint;

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', background: colors.midnight, fontFamily: fonts.body, paddingBottom: 80, overflowX: 'hidden' }}>

      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '28px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <img src="/favicon.svg" alt="" style={{ width: 20, height: 20 }} />
          <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>biocycle</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 21 }}>🔥</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 17, fontWeight: 700, color: flameColor, lineHeight: 1 }}>{streak}</span>
          <span style={{ color: colors.boneFaint, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {idioma === 'ES' ? 'días' : 'day streak'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: tierStyle.bg, border: `1px solid ${tierStyle.border}`, borderRadius: 4, padding: '2px 8px', color: tierStyle.text, fontSize: 9, fontWeight: 500, letterSpacing: '0.14em', fontFamily: fonts.mono }}>
            {tierKey}
          </div>
          <button onClick={onOpenProfile} style={{ background: 'rgba(245,242,238,0.05)', border: '1px solid rgba(245,242,238,0.1)', borderRadius: 8, width: 34, height: 34, color: colors.bone, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Settings">⚙</button>
        </div>
      </div>

      {/* Greeting + phase + anxiety indicator */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
        <h2 style={{ fontFamily: fonts.mono, fontSize: '1.1rem', fontWeight: 700, color: colors.bone, margin: 0, lineHeight: 1.2 }}>{greeting}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ fontSize: 13 }}>{phase.emoji}</span>
          <span style={{ color: colors.boneFaint, fontSize: 11, letterSpacing: '0.05em' }}>{phaseLabel}</span>
        </div>
      </div>

      {isPaused && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
          <h2 style={{ fontFamily: fonts.mono, fontSize: '1.3rem', fontWeight: 700, color: colors.bone, margin: '0 0 8px' }}>
            {idioma === 'ES' ? 'Sesiones pausadas' : 'Sessions paused'}
          </h2>
          <p style={{ color: colors.boneFaint, fontSize: '0.9rem', lineHeight: 1.55, margin: '0 0 24px' }}>
            {idioma === 'ES'
              ? `Tu racha era de ${userState?.streak_at_lapse ?? 0} días. Tus datos están preservados.`
              : `Your streak was ${userState?.streak_at_lapse ?? 0} days. Your data is preserved.`}
          </p>
          <button onClick={onStartCoach} style={{ width: '100%', background: colors.amber, border: 'none', borderRadius: 14, padding: '18px', color: colors.midnight, fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
            {idioma === 'ES' ? 'Retomar gratis — check-in ahora →' : 'Resume free — check in now →'}
          </button>
        </div>
      )}

      {!isPaused && (<>

        {/* HERO CARD */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(245,242,238,0.07)', background: 'rgba(245,242,238,0.02)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5' }}>
              {card.imageUrl ? (
                <img ref={cardImgRef} src={card.imageUrl} alt={cardHeadline} crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: `linear-gradient(180deg, ${colors.midnightDeep} 0%, ${colors.midnight} 55%, rgba(239,159,39,0.45) 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
                  {card.phaseEmoji}
                </div>
              )}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 18px 22px' }}>
                <span style={{ color: colors.bone, fontWeight: 400, fontSize: 16, lineHeight: 1.3, textShadow: '0 1px 4px rgba(0,0,0,0.7)', fontFamily: fonts.display, fontStyle: 'italic' }}>{cardHeadline}</span>
              </div>
              <button onClick={shareCard} disabled={sharing} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(245,242,238,0.25)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', opacity: sharing ? 0.5 : 1 }} aria-label="Share">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={18} cy={5} r={3} /><circle cx={6} cy={12} r={3} /><circle cx={18} cy={19} r={3} />
                  <line x1={8.59} y1={13.51} x2={15.42} y2={17.49} /><line x1={15.41} y1={6.51} x2={8.59} y2={10.49} />
                </svg>
              </button>
            </div>
            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ color: 'rgba(245,242,238,0.7)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>{cardCopy}</p>
              {arcTeaser && <p style={{ color: colors.amber, fontSize: '0.8rem', lineHeight: 1.5, margin: '12px 0 0', fontStyle: 'italic' }}>{arcTeaser}</p>}
            </div>
            {arcData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 14px', borderTop: '1px solid rgba(245,242,238,0.06)' }}>
                <img src={arcData.imageUrl} alt={arcLabel} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: colors.bone, fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.2 }}>{arcLabel}</div>
                  <div style={{ color: colors.boneFaint, fontSize: 9, letterSpacing: '0.08em', marginTop: 2 }}>
                    {idioma === 'ES' ? `Etapa ${arcData.stage} de 5` : `Stage ${arcData.stage} of 5`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S BIOLOGICAL FORECAST — algorithm output, not reported values */}
        {todayForecast && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
            <div style={{ background: colors.surfaceLow, border: `1px solid ${colors.surfaceBorder}`, borderRadius: 14, padding: '16px 18px' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ color: colors.boneFaint, fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: fonts.mono }}>
                  {idioma === 'ES' ? 'Pronóstico de hoy' : "Today's forecast"}
                </span>
                <button onClick={() => onNavigate('forecast')} style={{ background: 'none', border: 'none', color: colors.amber, fontSize: 11, cursor: 'pointer', fontFamily: fonts.body }}>
                  {idioma === 'ES' ? 'Ver 7 días →' : 'See 7 days →'}
                </button>
              </div>

              {/* SEXUAL ENERGY — primary, prominent */}
              <div style={{
                background: `${sexualColor}12`,
                border: `1px solid ${sexualColor}33`,
                borderRadius: 10,
                padding: '12px 14px',
                marginBottom: 14,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ color: colors.bone, fontSize: 13, fontWeight: 700, fontFamily: fonts.body }}>
                    {idioma === 'ES' ? 'Energía Sexual' : 'Sexual Energy'}
                  </span>
                  <span style={{ color: sexualColor, fontSize: 18, fontWeight: 800, fontFamily: fonts.mono }}>
                    {todayForecast.sexual}%
                  </span>
                </div>
                <div style={{ height: 6, background: colors.surfaceMid, borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${todayForecast.sexual}%`, background: sexualColor, borderRadius: 999, transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
                <div style={{ color: sexualColor, fontSize: 11, fontWeight: 600, marginTop: 8, fontFamily: fonts.body, lineHeight: 1.4 }}>
                  {todayForecast.sexual >= 70
                    ? (idioma === 'ES'
                        ? `Ventana de alta energía sexual hoy — ${todayForecast.sexual}%. Aprovecha esta ventana.`
                        : `High sexual energy window today — ${todayForecast.sexual}%. This window is open.`)
                    : todayForecast.sexual >= 45
                    ? (idioma === 'ES'
                        ? `Energía sexual moderada hoy — ${todayForecast.sexual}%.`
                        : `Moderate sexual energy today — ${todayForecast.sexual}%.`)
                    : (idioma === 'ES'
                        ? `Energía sexual baja hoy — ${todayForecast.sexual}%. Día de recuperación.`
                        : `Low sexual energy today — ${todayForecast.sexual}%. Recovery day.`)}
                </div>
              </div>

              {/* Secondary metrics */}
              <ForecastBar
                label={idioma === 'ES' ? 'Energía' : 'Energy'}
                value={todayForecast.energy}
                color={todayForecast.energy >= 70 ? colors.success : todayForecast.energy >= 45 ? colors.amber : colors.danger}
              />
              <ForecastBar
                label={idioma === 'ES' ? 'Cognitivo' : 'Cognitive'}
                value={todayForecast.cognitive}
                color={todayForecast.cognitive >= 70 ? colors.tierElite : todayForecast.cognitive >= 45 ? colors.amber : colors.danger}
              />
              <ForecastBar
                label={idioma === 'ES' ? 'Estrés' : 'Stress'}
                value={100 - todayForecast.stress}
                color={todayForecast.stress >= 60 ? colors.danger : todayForecast.stress >= 40 ? colors.amber : colors.success}
              />
              <ForecastBar
                label={idioma === 'ES' ? 'Ansiedad' : 'Anxiety'}
                value={100 - todayForecast.anxiety}
                color={todayForecast.anxiety >= 60 ? colors.danger : todayForecast.anxiety >= 40 ? colors.amber : colors.success}
              />
              <ForecastBar
                label={idioma === 'ES' ? 'Emocional' : 'Emotional'}
                value={todayForecast.emotional}
                color={todayForecast.emotional >= 70 ? colors.success : todayForecast.emotional >= 45 ? colors.amber : colors.danger}
              />

              {/* Phase insight */}
              {(idioma === 'ES' ? todayForecast.insightES : todayForecast.insight) && (
                <p style={{ color: colors.boneFaint, fontSize: 11, lineHeight: 1.55, margin: '12px 0 0', paddingTop: 12, borderTop: '1px solid rgba(245,242,238,0.06)', fontStyle: 'italic' }}>
                  {idioma === 'ES' ? todayForecast.insightES : todayForecast.insight}
                </p>
              )}

              {/* Mode indicator */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <span style={{ fontSize: 9, color: colors.boneFaint, fontFamily: fonts.mono, letterSpacing: '0.08em' }}>
                  {liveDays < 30
                    ? (idioma === 'ES' ? `MODELO BASE · ${30 - liveDays} DÍAS PARA TU PRONÓSTICO` : `BASE MODEL · ${30 - liveDays} DAYS TO YOUR FORECAST`)
                    : liveDays < 90
                    ? (idioma === 'ES' ? `CALIBRANDO · DÍA ${liveDays}` : `CALIBRATING · DAY ${liveDays}`)
                    : (idioma === 'ES' ? `PERSONALIZADO · DÍA ${liveDays}` : `PERSONALIZED · DAY ${liveDays}`)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Session CTA */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <button onClick={onStartCoach} style={{ width: '100%', background: colors.amber, border: 'none', borderRadius: 14, padding: '16px 24px', color: colors.midnight, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}>
            {idioma === 'ES' ? 'Hablar con Jules →' : 'Talk to Jules →'}
          </button>
        </div>

        {/* Forecast accuracy */}
        {accuracyPct != null && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
            <button onClick={() => onNavigate('forecast')} style={{ width: '100%', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,200,150,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.mono, fontWeight: 700, color: colors.success, fontSize: 14 }}>
                {accuracyPct}%
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: colors.bone, fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {idioma === 'ES' ? 'Jules acertó este mes' : 'Jules was right this month'}
                </div>
                <div style={{ color: colors.boneFaint, fontSize: 11 }}>
                  {idioma === 'ES' ? 'Ver pronóstico →' : 'See forecast →'}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Relationships preview */}
        {topRels.length > 0 && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
            <button onClick={() => onNavigate('circle')} style={{ width: '100%', background: 'rgba(245,242,238,0.03)', border: '1px solid rgba(245,242,238,0.08)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ color: colors.bone, fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {idioma === 'ES' ? 'Tu Círculo' : 'Your Circle'}
                </div>
                <div style={{ color: colors.boneFaint, fontSize: 11 }}>→</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {topRels.map((r, i) => {
                  const scoreColor = r.avgScore == null ? colors.boneFaint : r.avgScore >= 7 ? colors.success : colors.amber;
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,217,61,0.2), rgba(123,97,255,0.2))', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.bone, fontWeight: 700, fontSize: 13 }}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ color: colors.bone, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
                      <div style={{ color: scoreColor, fontSize: 10, fontFamily: fonts.mono, fontWeight: 700 }}>
                        {r.avgScore != null ? r.avgScore.toFixed(1) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
          </div>
        )}

        {/* Portfolio */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 20px' }}>
          <button onClick={() => onNavigate('earnings')} style={{ width: '100%', background: `linear-gradient(180deg, ${colors.midnightDeep} 0%, ${colors.midnight} 55%, rgba(239,159,39,0.45) 100%)`, border: `1px solid ${colors.boneTrace}`, borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: colors.boneFaint, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                {idioma === 'ES' ? 'Valor de tus Datos' : 'Data Value'}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: '1.4rem', fontWeight: 700, color: colors.amber, lineHeight: 1 }}>
                ${animatedValue.toFixed(2)}
              </div>
              <div style={{ color: colors.boneFaint, fontSize: 10, marginTop: 4 }}>
                {daysOfData} {idioma === 'ES' ? 'días' : 'days'} · {idioma === 'ES' ? 'Calidad' : 'Quality'} {qualityScore}% · {idioma === 'ES' ? 'Consistencia' : 'Consistency'} {consistencyScore}%
              </div>
            </div>
            <div style={{ color: colors.amber, fontSize: 18 }}>→</div>
          </button>
        </div>

      </>)}
    </div>
  );
}
