import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData } from '../lib/phaseEngine';
import { getCardForUser, getArcStage } from '../lib/cardSystem';
import type { Tab } from '../components/BottomNav';

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

export function DashboardScreen({ profile, userState, onStartCoach, onOpenProfile, onNavigate }: Props) {
  const [streak, setStreak] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [consistencyScore, setConsistencyScore] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(1.0);
  const [foundingTrader, setFoundingTrader] = useState(false);
  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const [topRels, setTopRels] = useState<{ name: string; avgScore: number | null; category: string }[]>([]);
  const [sharing, setSharing] = useState(false);

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
      const dims = ['factor_energia','factor_cognitivo','factor_estres','factor_ansiedad',
        'factor_sueno','factor_cafeina','factor_emocional','factor_social','factor_sexual',
        'factor_hidratacion','day_rating','day_memory','factor_alcohol'];

      const { data: allSessions } = await supabase
        .from('conversation_sessions')
        .select(['session_date', ...dims].join(','))
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false })
        .limit(90);

      if (!allSessions) return;

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

      const last30 = allSessions.filter((s: any) =>
        s.session_date >= thirtyDaysAgo.toISOString().split('T')[0]
      );
      let quality = 0;
      if (last30.length > 0) {
        const depositFreq = Math.min(40, (last30.length / 30) * 40);
        const dates30 = [...new Set(last30.map((s: any) => s.session_date as string))].sort();
        let hasGap = false;
        for (let i = 1; i < dates30.length; i++) {
          const diff = (Date.parse(dates30[i]) - Date.parse(dates30[i - 1])) / 86_400_000;
          if (diff > 2) { hasGap = true; break; }
        }
        const consistency = hasGap ? 15 : 30;
        const totalFields = last30.length * dims.length;
        const filledFields = last30.reduce((acc: number, s: any) =>
          acc + dims.filter(d => s[d] !== null && s[d] !== undefined).length, 0);
        const completeness = (filledFields / totalFields) * 20;
        const depth = Math.min(10, (daysOfData / 90) * 10);
        quality = Math.min(100, Math.round(depositFreq + consistency + completeness + depth));
      }
      setQualityScore(quality);

      // Data Consistency — separate metric from quality
      // Rewards streak + session density + gap-free periods
      let consistencyScore = 0;
      if (last30.length > 0) {
        const expectedSessions = Math.min(daysOfData, 30) * 3; // 3 slots/day
        const sessionRatio = Math.min(1, last30.length / expectedSessions);

        const dates30 = [...new Set(last30.map((s: any) => s.session_date as string))].sort();
        let gaps = 0;
        for (let i = 1; i < dates30.length; i++) {
          const diff = (Date.parse(dates30[i]) - Date.parse(dates30[i - 1])) / 86_400_000;
          if (diff > 1) gaps += diff - 1;
        }
        const gapPenalty = Math.min(1, gaps / 10);

        consistencyScore = Math.round((sessionRatio * 60 + (1 - gapPenalty) * 40));
      }
      setConsistencyScore(consistencyScore);

      const { data: usData } = await supabase.from('user_state').select('founding_trader').eq('user_id', profile.id).maybeSingle();
      setFoundingTrader(usData?.founding_trader === true);

      // Data Value — realistic calibrated formula
      // Base: $0.02 per day of data (not $0.15)
      // Multiplier: quality score 0-100 as 0.0-1.0 factor
      // Bonuses only kick in after Day 30 (research-eligible threshold)
      // Age 40+ multiplier only applies after Day 30
      const researchEligible = daysOfData >= 30;

      let value = daysOfData * 0.02;
      value *= (quality / 100) || 0.1;

      if (researchEligible) {
        // Health profile bonus (filled fields add value only once eligible)
        if (profile.height_cm && profile.weight_kg && profile.exercise_frequency) value += 1.5;
        if (profile.known_conditions?.length && profile.current_medications?.length) value += 2.5;
        if (profile.blood_type) value += 1.0;

        if (profile.fecha_nacimiento) {
          const age = new Date().getFullYear() - new Date(profile.fecha_nacimiento).getFullYear();
          if (age >= 40) value *= 1.3;
        }

        if (profile.wearable_connected) value += 3.0;
      }

      setPortfolioValue(Math.max(0.10, value));

      // Forecast accuracy (rolling 30d)
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
  const arcData   = getArcStage(daysOfData, gender, picardiaMode);
  const arcLabel  = idioma === 'ES' ? arcData?.labelES : arcData?.label;
  const arcTeaser = idioma === 'ES' ? arcData?.teaserES : arcData?.teaser;

  // Canvas-based share with one-liner baked in
  async function shareCard() {
    if (sharing) return;
    setSharing(true);
    try {
      const canvas = document.createElement('canvas');
      const W = 720, H = 900;
      const imgH = H; // image fills the full canvas — no footer
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) { setSharing(false); return; }

      // Load card image
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('img load failed'));
        img.src = card.imageUrl ?? '';
      });
      const scale = Math.max(W / img.width, imgH / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (W - dw) / 2;
      const dy = (imgH - dh) / 2;
      ctx.fillStyle = '#0A0A1A';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, dx, dy, dw, dh);

      // Gradient overlay bottom of image
      const grad = ctx.createLinearGradient(0, imgH - 200, 0, imgH);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, imgH - 200, W, 200);

      // One-liner text (word-wrapped)
      ctx.fillStyle = 'white';
      ctx.font = 'bold 34px -apple-system, system-ui, sans-serif';
      ctx.textAlign = 'left';
      const words = cardHeadline.split(' ');
      const maxWidth = W - 80;
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line.trim());
          line = w + ' ';
        } else {
          line = test;
        }
      }
      if (line.trim()) lines.push(line.trim());

      let y = imgH - 50 - (lines.length - 1) * 42;
      for (const l of lines) {
        ctx.fillText(l, 40, y);
        y += 42;
      }

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(b => resolve(b), 'image/png'));
      if (!blob) { setSharing(false); return; }

      const file = new File([blob], 'biocycle-card.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: idioma === 'ES' ? 'Pronostica tu futuro — biocycle.app' : 'Forecast your future — biocycle.app',
        });
      } else {
        // Fallback: copy image to clipboard
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert(idioma === 'ES' ? 'Imagen copiada' : 'Image copied');
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'biocycle-card.png'; a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      console.error('share failed', e);
    } finally {
      setSharing(false);
    }
  }

  const flameColor = streak >= 7 ? '#FF6B6B' : streak >= 3 ? '#FFD93D' : '#4A5568';
  const tier = foundingTrader ? { label: 'FOUNDING', color: '#FFD93D' }
    : streak >= 180 && qualityScore >= 90 ? { label: 'ELITE', color: '#7B61FF' }
    : streak >= 90 && qualityScore >= 80 ? { label: 'PREMIUM', color: '#00C896' }
    : streak >= 30 && qualityScore >= 60 ? { label: 'STANDARD', color: '#FFD93D' }
    : { label: 'NEW', color: '#4A5568' };

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100vw', background: '#0A0A1A', fontFamily: 'Inter, system-ui, sans-serif', paddingBottom: 80, overflowX: 'hidden' }}>

      {/* Top bar: streak + greeting + settings + tier */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '28px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Compact streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 21 }}>🔥</span>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 700, color: flameColor, lineHeight: 1 }}>
            {streak}
          </span>
          <span style={{ color: '#4A5568', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {idioma === 'ES' ? 'días' : 'day streak'}
          </span>
        </div>

        {/* Tier badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: `${tier.color}22`, border: `1px solid ${tier.color}44`, borderRadius: 6, padding: '2px 8px', color: tier.color, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em' }}>
            {tier.label}
          </div>
          <button onClick={onOpenProfile} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 34, height: 34, color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Settings">
            ⚙
          </button>
        </div>
      </div>

      {/* Greeting + phase */}
      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
        <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 700, color: 'white', margin: 0, lineHeight: 1.2 }}>
          {greeting}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 13 }}>{phase.emoji}</span>
          <span style={{ color: '#4A5568', fontSize: 11, letterSpacing: '0.05em' }}>{phaseLabel}</span>
        </div>
      </div>

      {/* Paused state */}
      {isPaused && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏸</div>
          <h2 style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.3rem', fontWeight: 700, color: 'white', margin: '0 0 8px' }}>
            {idioma === 'ES' ? 'Sesiones pausadas' : 'Sessions paused'}
          </h2>
          <p style={{ color: '#4A5568', fontSize: '0.9rem', lineHeight: 1.55, margin: '0 0 24px' }}>
            {idioma === 'ES'
              ? `Tu racha era de ${userState?.streak_at_lapse ?? 0} días. Tus datos están preservados.`
              : `Your streak was ${userState?.streak_at_lapse ?? 0} days. Your data is preserved.`}
          </p>
          <button onClick={onStartCoach} style={{ width: '100%', background: '#FF6B6B', border: 'none', borderRadius: 14, padding: '18px', color: 'white', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
            {idioma === 'ES' ? 'Retomar gratis — check-in ahora →' : 'Resume free — check in now →'}
          </button>
        </div>
      )}

      {!isPaused && (<>
        {/* HERO CARD */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '4/5' }}>
              {card.imageUrl ? (
                <img
                  ref={cardImgRef}
                  src={card.imageUrl}
                  alt={cardHeadline}
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0A0A1A 0%, #1A1A3E 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
                  {card.phaseEmoji}
                </div>
              )}
              {/* Bottom gradient + one-liner */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 18px 22px' }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: '1rem', lineHeight: 1.25, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                  {cardHeadline}
                </span>
              </div>
              {/* Share button */}
              <button onClick={shareCard} disabled={sharing} style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)', opacity: sharing ? 0.5 : 1 }} aria-label="Share">
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={18} cy={5} r={3} />
                  <circle cx={6} cy={12} r={3} />
                  <circle cx={18} cy={19} r={3} />
                  <line x1={8.59} y1={13.51} x2={15.42} y2={17.49} />
                  <line x1={15.41} y1={6.51} x2={8.59} y2={10.49} />
                </svg>
              </button>
            </div>

            {/* Below card: copy + arc teaser */}
            <div style={{ padding: '16px 18px 18px' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.55, margin: 0 }}>{cardCopy}</p>
              {arcTeaser && (
                <p style={{ color: 'rgba(0,200,150,0.85)', fontSize: '0.8rem', lineHeight: 1.5, margin: '12px 0 0', fontStyle: 'italic' }}>
                  {arcTeaser}
                </p>
              )}
            </div>

            {/* Arc strip */}
            {arcData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <img src={arcData.imageUrl} alt={arcLabel} style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontSize: '0.78rem', fontWeight: 600, lineHeight: 1.2 }}>{arcLabel}</div>
                  <div style={{ color: '#4A5568', fontSize: 9, letterSpacing: '0.08em', marginTop: 2 }}>
                    {idioma === 'ES' ? `Etapa ${arcData.stage} de 5` : `Stage ${arcData.stage} of 5`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Session CTA */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <button onClick={onStartCoach} style={{ width: '100%', background: '#FF6B6B', border: 'none', borderRadius: 14, padding: '16px 24px', color: 'white', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}>
            {idioma === 'ES' ? 'Hablar con Jules →' : 'Talk to Jules →'}
          </button>
          {daysOfData < 30 && (
            <p style={{ color: '#4A5568', fontSize: 11, textAlign: 'center', margin: '10px 0 0' }}>
              {idioma === 'ES' ? `${30 - daysOfData} días para el pronóstico personalizado` : `${30 - daysOfData} days to your personalized forecast`}
            </p>
          )}
        </div>

        {/* Forecast accuracy (30+ days only) */}
        {accuracyPct != null && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
            <button onClick={() => onNavigate('forecast')} style={{ width: '100%', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,200,150,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: '#00C896', fontSize: 14 }}>
                {accuracyPct}%
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                  {idioma === 'ES' ? 'Jules acertó este mes' : 'Jules was right this month'}
                </div>
                <div style={{ color: '#4A5568', fontSize: 11 }}>
                  {idioma === 'ES' ? 'Ver pronóstico →' : 'See forecast →'}
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Relationships preview */}
        {topRels.length > 0 && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 14px' }}>
            <button onClick={() => onNavigate('circle')} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ color: 'white', fontSize: 12, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {idioma === 'ES' ? 'Tu Círculo' : 'Your Circle'}
                </div>
                <div style={{ color: '#4A5568', fontSize: 11 }}>→</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {topRels.map((r, i) => {
                  const scoreColor = r.avgScore == null ? '#4A5568' : r.avgScore >= 7 ? '#00C896' : r.avgScore >= 5 ? '#FFD93D' : '#FF6B6B';
                  return (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,217,61,0.2), rgba(123,97,255,0.2))', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13 }}>
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ color: 'white', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.name}
                      </div>
                      <div style={{ color: scoreColor, fontSize: 10, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700 }}>
                        {r.avgScore != null ? r.avgScore.toFixed(1) : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </button>
          </div>
        )}

        {/* Portfolio snippet (secondary) */}
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 20px' }}>
          <button onClick={() => onNavigate('earnings')} style={{ width: '100%', background: 'linear-gradient(135deg, rgba(255,217,61,0.06) 0%, rgba(123,97,255,0.06) 100%)', border: '1px solid rgba(255,217,61,0.15)', borderRadius: 14, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#4A5568', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 2 }}>
                {idioma === 'ES' ? 'Valor de tus Datos' : 'Data Value'}
              </div>
              <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.4rem', fontWeight: 700, color: '#FFD93D', lineHeight: 1 }}>
                ${animatedValue.toFixed(2)}
              </div>
              <div style={{ color: '#4A5568', fontSize: 10, marginTop: 4 }}>
                {daysOfData} {idioma === 'ES' ? 'días' : 'days'} · {idioma === 'ES' ? 'Calidad' : 'Quality'} {qualityScore}% · {idioma === 'ES' ? 'Consistencia' : 'Consistency'} {consistencyScore}%
              </div>
            </div>
            <div style={{ color: '#FFD93D', fontSize: 18 }}>→</div>
          </button>
        </div>
      </>)}
    </div>
  );
}
