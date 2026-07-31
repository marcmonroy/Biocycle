import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserState } from '../lib/supabase';
import { getDaysOfData } from '../lib/phaseEngine';
import { getCardForUser, getArcStage } from '../lib/cardSystem';

import { generateForecast, type ForecastDay } from '../lib/forecastEngine';
import type { Tab } from '../components/BottomNav';
import { colors, fonts } from '../lib/tokens';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';

interface Props {
  profile: Profile;
  userState: UserState | null;
  onStartCoach: () => void;
  onOpenProfile: () => void;
  onNavigate: (tab: Tab) => void;
}



const METRIC_DEFS = [
  { key: 'energy',    emoji: '⚡', labelEN: 'Energy',        labelES: 'Energía',       invert: false },
  { key: 'cognitive', emoji: '🧠', labelEN: 'Mind',          labelES: 'Mente',         invert: false },
  { key: 'stress',    emoji: '😰', labelEN: 'Stress',        labelES: 'Estrés',        invert: true  },
  { key: 'anxiety',   emoji: '🌊', labelEN: 'Anxiety',       labelES: 'Ansiedad',      invert: true  },
  { key: 'sleep',     emoji: '😴', labelEN: 'Sleep',         labelES: 'Sueño',         invert: false },
  { key: 'emotional', emoji: '💗', labelEN: 'Mood',          labelES: 'Ánimo',         invert: false },
  { key: 'social',    emoji: '🎉', labelEN: 'Social',        labelES: 'Social',        invert: false },
  { key: 'sexual',    emoji: '🔥', labelEN: 'Sensual',       labelES: 'Sensual',       invert: false },
] as const;

function metricColor(value: number, invert: boolean): string {
  const v = invert ? 100 - value : value;
  if (v >= 70) return '#2c7a4d';   // good (green)
  if (v >= 45) return '#a8791d';   // watch (amber)
  return '#b3402f';                // low (red)
}

export function DashboardScreen({ profile, userState, onStartCoach, onOpenProfile, onNavigate }: Props) {
  const [streak, setStreak] = useState(0);

  const [accuracyPct, setAccuracyPct] = useState<number | null>(null);
  const [todayForecast, setTodayForecast] = useState<ForecastDay | null>(null);
  const [sharing, setSharing] = useState(false);
  const [liveDays, setLiveDays] = useState<number>(getDaysOfData(profile));
  const [hasAnySession, setHasAnySession] = useState(false);
  const [waActivating, setWaActivating] = useState(false);
  const [waJustActivated, setWaJustActivated] = useState(false);
  const [waDismissed, setWaDismissed] = useState(false);
  const waPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const daysOfData = getDaysOfData(profile);
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

      setHasAnySession((allSessions?.length ?? 0) > 0);

      if (allSessions) {
        const uniqueDates = [...new Set(allSessions.map((s: any) => s.session_date as string))].sort().reverse();
        const todayStr = new Date().toLocaleDateString('en-CA');
        let currentStreak = 0;
        let checkDate = todayStr;
        for (const date of uniqueDates) {
          if (date === checkDate) {
            currentStreak++;
            // Use noon local time to avoid UTC-midnight parsing edge cases
            const prev = new Date(checkDate + 'T12:00:00');
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toLocaleDateString('en-CA');
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


      // Forecast accuracy (30+ days only)
      if (daysOfData >= 30) {
        const { data: accRows } = await supabase
          .from('forecast_accuracy')
          .select('accuracy_pct')
          .eq('user_id', profile.id)
          .gte('forecast_date', thirtyDaysAgo.toLocaleDateString('en-CA'))
          .not('accuracy_pct', 'is', null);
        if (accRows && accRows.length > 0) {
          const avg = accRows.reduce((a: number, r: any) => a + r.accuracy_pct, 0) / accRows.length;
          setAccuracyPct(Math.round(avg));
        }
      }

    }
    loadStats();
  }, [profile.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function startWaPolling() {
    if (waPollRef.current) return;
    setWaActivating(true);
    waPollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('whatsapp_enabled')
        .eq('id', profile.id)
        .single();
      if (data?.whatsapp_enabled === true) {
        clearInterval(waPollRef.current!);
        waPollRef.current = null;
        setWaActivating(false);
        setWaJustActivated(true);
      }
    }, 3000);
  }

  useEffect(() => {
    return () => { if (waPollRef.current) clearInterval(waPollRef.current); };
  }, []);

  useEffect(() => {
    // Detect if already running as installed PWA — never show banner if so
    // Suppress entirely on native Capacitor builds — the app is already installed
    if (Capacitor.isNativePlatform()) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Detect iOS — no beforeinstallprompt event exists there
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Check dismissal cooldown — 14 days
    const dismissedAt = localStorage.getItem('biocycle_install_dismissed');
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) return;
    }

    if (iOS) {
      setShowInstallBanner(true);
      return;
    }

    // Android/Chrome — capture the native install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstallClick() {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const { outcome } = await installPromptEvent.userChoice;
      console.log('[BioCycle] install prompt outcome:', outcome);
      setShowInstallBanner(false);
      setInstallPromptEvent(null);
    }
  }

  function dismissInstallBanner() {
    localStorage.setItem('biocycle_install_dismissed', String(Date.now()));
    setShowInstallBanner(false);
  }

  const isPaused = userState?.state === 'paused_trader';
  const nombre = profile.nombre ?? (idioma === 'ES' ? 'Trader' : 'Trader');
  const greeting = idioma === 'ES' ? `Hola, ${nombre}.` : `Hey, ${nombre}.`;
  const cardHeadline = idioma === 'ES' ? card.headlineES : card.headline;
  const cardCopy     = idioma === 'ES' ? card.copyTextES : card.copyText;


  const gender = (profile.genero ?? 'nonbinary') as 'female' | 'male' | 'nonbinary';
  const picardiaMode = profile.picardia_mode ?? false;
  const arcData   = getArcStage(liveDays, gender, picardiaMode);
  const arcLabel  = idioma === 'ES' ? arcData?.labelES : arcData?.label;
  const arcTeaser = idioma === 'ES' ? arcData?.teaserES : arcData?.teaser;

  async function shareCard() {
    if (sharing) return;
    setSharing(true);
    try {
      // ── Build canvas image ─────────────────────────────────────────────
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

      const shareText = idioma === 'ES' ? 'Pronostica tu futuro — biocycle.app' : 'Forecast your future — biocycle.app';
      const shareTitle = cardHeadline;

      // ── Native path: Capacitor Share plugin ───────────────────────────
      if (Capacitor.isNativePlatform()) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const fileName = `biocycle-card-${Date.now()}.png`;
        const writeResult = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({
          title: shareTitle,
          text: shareText,
          url: writeResult.uri,
          dialogTitle: shareTitle,
        });
        return;
      }

      // ── Web/PWA path: navigator.share with file ────────────────────────
      const file = new File([blob], 'biocycle-card.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        return;
      }

      // ── Web fallback: download ─────────────────────────────────────────
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'biocycle-card.png'; a.click();
      URL.revokeObjectURL(url);
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

      </div>

      {!isPaused && hasAnySession && !waDismissed && (profile as any).whatsapp_enabled !== true && !waJustActivated && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.3)', borderRadius: 14, padding: '16px 18px' }}>
            <p style={{ color: colors.bone, fontSize: 13, lineHeight: 1.5, margin: '0 0 12px', fontWeight: 600 }}>
              {idioma === 'ES'
                ? '¿Quieres que Jules te recuerde cada día? Activa tus recordatorios — toma 5 segundos.'
                : 'Want Jules to remind you daily? Activate your reminders — takes 5 seconds.'}
            </p>
            {waActivating ? (
              <p style={{ color: '#25D366', fontSize: 12, margin: 0 }}>
                {idioma === 'ES' ? 'Esperando tu mensaje en WhatsApp...' : 'Waiting for your message in WhatsApp...'}
              </p>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <a
                  href={`https://wa.me/16625688859?text=${encodeURIComponent(idioma === 'ES' ? 'Sí, envíenme recordatorios' : 'Yes, send me reminders')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => startWaPolling()}
                  style={{ background: '#25D366', borderRadius: 10, padding: '10px 18px', color: 'white', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}
                >
                  {idioma === 'ES' ? '💬 Activar' : '💬 Activate'}
                </a>
                <button
                  onClick={() => setWaDismissed(true)}
                  style={{ background: 'none', border: 'none', color: colors.boneFaint, fontSize: 12, cursor: 'pointer' }}
                >
                  {idioma === 'ES' ? 'Más tarde' : 'Maybe later'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {!isPaused && waJustActivated && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.35)', borderRadius: 14, padding: '14px 18px', textAlign: 'center' }}>
            <p style={{ color: '#25D366', fontSize: 13, fontWeight: 700, margin: 0 }}>
              {idioma === 'ES' ? '✓ Recordatorios activados' : '✓ Reminders activated'}
            </p>
          </div>
        </div>
      )}

      {showInstallBanner && !isPaused && (
        <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 16px' }}>
          <div style={{ background: 'rgba(239,159,39,0.08)', border: '1px solid rgba(239,159,39,0.3)', borderRadius: 14, padding: '16px 18px' }}>
            {isIOS ? (
              <>
                <p style={{ color: colors.bone, fontSize: 13, lineHeight: 1.5, margin: '0 0 10px', fontWeight: 600 }}>
                  {idioma === 'ES'
                    ? 'Agrega BioCycle a tu pantalla de inicio para abrirla con un toque.'
                    : 'Add BioCycle to your home screen to open it with one tap.'}
                </p>
                <p style={{ color: colors.boneFaint, fontSize: 12, lineHeight: 1.6, margin: '0 0 12px' }}>
                  {idioma === 'ES'
                    ? 'Toca el botón de compartir ⬆️ en Safari, luego "Agregar a pantalla de inicio".'
                    : 'Tap the Share button ⬆️ in Safari, then "Add to Home Screen".'}
                </p>
                <button
                  onClick={dismissInstallBanner}
                  style={{ background: 'none', border: 'none', color: colors.boneFaint, fontSize: 12, cursor: 'pointer' }}
                >
                  {idioma === 'ES' ? 'Entendido' : 'Got it'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: colors.bone, fontSize: 13, lineHeight: 1.5, margin: '0 0 12px', fontWeight: 600 }}>
                  {idioma === 'ES'
                    ? 'Instala BioCycle en tu teléfono para abrirla con un toque, sin buscarla en el navegador.'
                    : 'Install BioCycle on your phone to open it with one tap — no browser search needed.'}
                </p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button
                    onClick={handleInstallClick}
                    style={{ background: colors.amber, border: 'none', borderRadius: 10, padding: '10px 18px', color: colors.midnight, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {idioma === 'ES' ? '📲 Instalar' : '📲 Install'}
                  </button>
                  <button
                    onClick={dismissInstallBanner}
                    style={{ background: 'none', border: 'none', color: colors.boneFaint, fontSize: 12, cursor: 'pointer' }}
                  >
                    {idioma === 'ES' ? 'Más tarde' : 'Maybe later'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

        {todayForecast && (
          <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', padding: '0 20px 20px' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.05em', color: colors.boneFaint, fontFamily: fonts.body, marginBottom: 12 }}>
              {idioma === 'ES' ? 'CÓMO ESTÁS HOY' : 'HOW YOU ARE TODAY'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {METRIC_DEFS.map(m => {
                const value = Math.round((todayForecast as any)[m.key] ?? 0);
                const color = metricColor(value, m.invert);
                return (
                  <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(245,242,238,0.04)', borderRadius: 12, padding: '10px 12px' }}>
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{m.emoji}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 12, color: colors.bone, fontFamily: fonts.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{idioma === 'ES' ? m.labelES : m.labelEN}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color, fontFamily: fonts.body }}>{value}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 14, fontSize: 11, color: colors.boneFaint, fontFamily: fonts.body }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#2c7a4d' }} />{idioma === 'ES' ? 'bien' : 'good'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#a8791d' }} />{idioma === 'ES' ? 'atención' : 'watch'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: '#b3402f' }} />{idioma === 'ES' ? 'bajo' : 'low'}</span>
            </div>
          </div>
        )}

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


      </>)}
    </div>
  );
}
