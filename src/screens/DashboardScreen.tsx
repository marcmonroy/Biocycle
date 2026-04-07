import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData } from '../lib/phaseEngine';
import { getCardForUser } from '../lib/cardSystem';

interface Props {
  profile: Profile;
  onStartCoach: () => void;
}

function useCountUp(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((eased * target).toFixed(2)));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function DataQualityArc({ score }: { score: number }) {
  // score 0–100
  const r = 44;
  const cx = 56;
  const cy = 56;
  const circumference = Math.PI * r; // half circle
  const filled = (score / 100) * circumference;
  const color = score >= 80 ? '#00C896' : score >= 50 ? '#FFD93D' : '#FF6B6B';

  return (
    <svg width={112} height={64} viewBox="0 0 112 64" style={{ overflow: 'visible' }}>
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Label */}
      <text x={cx} y={cy - 10} textAnchor="middle" fill={color}
        fontSize={18} fontWeight={700} fontFamily="JetBrains Mono, monospace">
        {score}%
      </text>
      <text x={cx} y={cy + 4} textAnchor="middle" fill="#4A5568" fontSize={9}
        fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.08em">
        DATA QUALITY
      </text>
    </svg>
  );
}

function TierBadge({ days }: { days: number }) {
  let label: string;
  let color: string;
  let bg: string;

  if (days < 7) {
    label = 'SEED';
    color = '#4A5568';
    bg = 'rgba(74,85,104,0.15)';
  } else if (days < 30) {
    label = 'SPROUT';
    color = '#00C896';
    bg = 'rgba(0,200,150,0.1)';
  } else if (days < 90) {
    label = 'TRADER';
    color = '#FFD93D';
    bg = 'rgba(255,217,61,0.1)';
  } else if (days < 180) {
    label = 'ANALYST';
    color = '#7B61FF';
    bg = 'rgba(123,97,255,0.1)';
  } else {
    label = 'FOUNDING TRADER';
    color = '#FFD93D';
    bg = 'rgba(255,217,61,0.15)';
  }

  return (
    <div style={{
      background: bg,
      border: `1px solid ${color}33`,
      borderRadius: 6,
      padding: '3px 10px',
      color,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.12em',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {label}
    </div>
  );
}

function StreakBar({ streak, idioma }: { streak: number; idioma: 'EN' | 'ES' }) {
  const label = idioma === 'ES' ? 'días seguidos' : 'day streak';
  const flameColor = streak >= 7 ? '#FF6B6B' : streak >= 3 ? '#FFD93D' : '#4A5568';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ fontSize: 22, lineHeight: 1 }}>🔥</span>
      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '1.4rem',
          fontWeight: 700,
          color: flameColor,
          lineHeight: 1,
        }}>
          {streak}
        </div>
        <div style={{
          fontSize: 10,
          color: '#4A5568',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          {label}
        </div>
      </div>
    </div>
  );
}

export function DashboardScreen({ profile, onStartCoach }: Props) {
  const [streak, setStreak] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const hasAnimated = useRef(false);

  const daysOfData = getDaysOfData(profile);
  const portfolioValue = Math.max(1.0, daysOfData * 0.15);
  const animatedValue = useCountUp(hasAnimated.current ? portfolioValue : portfolioValue, 1200);

  const phase = getCurrentPhase(profile);
  const card = getCardForUser(profile);
  const idioma = profile.idioma ?? 'EN';

  useEffect(() => {
    hasAnimated.current = true;
  }, []);

  useEffect(() => {
    async function loadStats() {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .select('session_date, session_complete, integrity_score')
        .eq('user_id', profile.id)
        .order('session_date', { ascending: false })
        .limit(90);

      if (error || !data) return;

      // Calculate streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const seenDates = new Set(data.map(r => r.session_date));

      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (seenDates.has(key)) {
          currentStreak++;
        } else if (i > 0) {
          break;
        }
      }
      setStreak(currentStreak);

      // Calculate quality score based on complete sessions and integrity
      const complete = data.filter(r => r.session_complete);
      const avgIntegrity = complete.length > 0
        ? complete.reduce((sum, r) => sum + (r.integrity_score ?? 70), 0) / complete.length
        : 0;
      const completionRate = data.length > 0 ? (complete.length / data.length) * 100 : 0;
      const quality = Math.round((avgIntegrity * 0.6) + (completionRate * 0.4));
      setQualityScore(Math.min(100, quality));
    }
    loadStats();
  }, [profile.id]);

  const nombre = profile.nombre ?? (idioma === 'ES' ? 'Trader' : 'Trader');
  const greeting = idioma === 'ES'
    ? `Hola, ${nombre}.`
    : `Hey, ${nombre}.`;

  const phaseLabel = idioma === 'ES' ? phase.displayNameES : phase.displayName;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      background: '#0A0A1A',
      fontFamily: 'Inter, system-ui, sans-serif',
      paddingBottom: 80,
      overflowX: 'hidden',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '52px 24px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        <div>
          <h2 style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'white',
            margin: 0,
            lineHeight: 1.2,
          }}>
            {greeting}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <span style={{ fontSize: 14 }}>{phase.emoji}</span>
            <span style={{ color: '#4A5568', fontSize: 12, letterSpacing: '0.05em' }}>
              {phaseLabel}
            </span>
          </div>
        </div>
        <TierBadge days={daysOfData} />
      </div>

      {/* Portfolio Hero */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '8px 24px 24px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,217,61,0.06) 0%, rgba(123,97,255,0.06) 100%)',
          border: '1px solid rgba(255,217,61,0.15)',
          borderRadius: 20,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <p style={{
            color: '#4A5568',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            margin: 0,
          }}>
            {idioma === 'ES' ? 'Valor del portafolio' : 'Portfolio value'}
          </p>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 'clamp(2.4rem, 8vw, 3rem)',
            fontWeight: 700,
            color: '#FFD93D',
            lineHeight: 1,
          }}>
            ${animatedValue.toFixed(2)}
          </div>
          <p style={{
            color: '#4A5568',
            fontSize: 11,
            margin: '4px 0 0',
          }}>
            {daysOfData} {idioma === 'ES' ? 'días de datos' : 'days of data'} · $0.15/day
          </p>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 20,
            paddingTop: 20,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <StreakBar streak={streak} idioma={idioma} />
            <DataQualityArc score={qualityScore} />
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, margin: '0 auto', height: 1, background: 'rgba(255,255,255,0.05)' }} />

      {/* Daily Card */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '24px 24px 8px',
      }}>
        <p style={{
          color: '#4A5568',
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          margin: '0 0 12px',
        }}>
          {idioma === 'ES' ? 'Tu tarjeta de hoy' : "Today's card"}
        </p>

        <div style={{
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {/* Card image or placeholder */}
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.headline}
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={{
              width: '100%',
              aspectRatio: '16/9',
              background: `linear-gradient(135deg, #0A0A1A 0%, #1A1A3E 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
            }}>
              {card.phaseEmoji}
            </div>
          )}

          <div style={{ padding: '20px 20px 22px' }}>
            {/* Tags */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <span style={{
                background: 'rgba(123,97,255,0.12)',
                border: '1px solid rgba(123,97,255,0.25)',
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 10,
                color: '#7B61FF',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}>
                {card.phaseEmoji} {card.phaseTag}
              </span>
              <span style={{
                background: card.pillar === 'financial'
                  ? 'rgba(255,217,61,0.1)'
                  : card.pillar === 'biology'
                    ? 'rgba(0,200,150,0.1)'
                    : 'rgba(255,107,107,0.1)',
                border: `1px solid ${card.pillar === 'financial' ? 'rgba(255,217,61,0.25)' : card.pillar === 'biology' ? 'rgba(0,200,150,0.25)' : 'rgba(255,107,107,0.25)'}`,
                borderRadius: 6,
                padding: '2px 8px',
                fontSize: 10,
                color: card.pillar === 'financial' ? '#FFD93D' : card.pillar === 'biology' ? '#00C896' : '#FF6B6B',
                letterSpacing: '0.08em',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {card.pillar}
              </span>
            </div>

            <h3 style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '1rem',
              fontWeight: 700,
              color: 'white',
              margin: '0 0 10px',
              lineHeight: 1.3,
            }}>
              {card.headline}
            </h3>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              margin: 0,
            }}>
              {card.copyText}
            </p>
          </div>
        </div>
      </div>

      {/* Session CTA */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        margin: '0 auto',
        padding: '16px 24px 0',
      }}>
        <button
          onClick={onStartCoach}
          style={{
            width: '100%',
            background: '#FF6B6B',
            border: 'none',
            borderRadius: 14,
            padding: '18px 24px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {idioma === 'ES' ? 'Hablar con Jules →' : 'Talk to Jules →'}
        </button>
        {daysOfData < 30 && (
          <p style={{
            color: '#4A5568',
            fontSize: 11,
            textAlign: 'center',
            margin: '10px 0 0',
          }}>
            {idioma === 'ES'
              ? `${30 - daysOfData} días hasta que tu portafolio se desbloquea`
              : `${30 - daysOfData} days until your portfolio unlocks`}
          </p>
        )}
      </div>
    </div>
  );
}
