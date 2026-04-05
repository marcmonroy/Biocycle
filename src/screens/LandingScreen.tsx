import { useState, useEffect, useRef } from 'react';
import { QuantumDNA } from '../components/QuantumDNA';
import { speakWithElevenLabs } from '../services/voiceService';

interface Props {
  onRegister: () => void;
  onSignIn?: () => void;
}

const JULES_GREETING = "I'm Jules. I'll learn your biology and tell you how you'll feel before it happens. The more consistent you are, the more your data is worth.";

export function LandingScreen({ onRegister, onSignIn }: Props) {
  const [isMuted, setIsMuted] = useState(true);
  const [julesState, setJulesState] = useState<'idle' | 'speaking'>('idle');
  const [portfolioDays, setPortfolioDays] = useState(0);
  const hasPlayedRef = useRef(false);

  const portfolioValue = Math.max(1.00, portfolioDays * 0.15);

  useEffect(() => {
    if (hasPlayedRef.current) return;
    hasPlayedRef.current = true;
    // Auto-play muted — will play when user unmutes
  }, []);

  const handleUnmute = async () => {
    setIsMuted(false);
    setJulesState('speaking');
    await speakWithElevenLabs(JULES_GREETING, 'EN', false, {
      onStart: () => setJulesState('speaking'),
      onEnd:   () => setJulesState('idle'),
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowY: 'auto',
      paddingBottom: 40,
    }}>

      {/* Hero */}
      <div style={{
        width: '100%',
        maxWidth: 430,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px 40px',
        gap: 24,
      }}>

        {/* DNA animation */}
        <div style={{ position: 'relative' }}>
          <QuantumDNA size={180} state={julesState} />

          {/* Human silhouettes ring */}
          <svg
            width={220}
            height={220}
            viewBox="0 0 220 220"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none', animation: 'spin 20s linear infinite' }}
          >
            <style>{`@keyframes spin { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }`}</style>
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              const x = 110 + 100 * Math.cos(rad);
              const y = 110 + 100 * Math.sin(rad);
              const c = ['#FFD93D','#FF6B6B','#00C896','#7B61FF','#FFD93D','#FF6B6B'][i];
              return (
                <g key={i} transform={`translate(${x},${y})`}>
                  <circle r="6" fill={c} fillOpacity="0.6" />
                  <line x1="0" y1="-6" x2="0" y2="-13" stroke={c} strokeWidth="1.5" strokeOpacity="0.5" />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Voice control */}
        <button
          onClick={isMuted ? handleUnmute : undefined}
          style={{
            background: 'rgba(255,217,61,0.08)',
            border: '1px solid rgba(255,217,61,0.25)',
            borderRadius: 24,
            padding: '8px 20px',
            color: 'rgba(255,217,61,0.8)',
            fontSize: 12,
            letterSpacing: '0.1em',
            cursor: isMuted ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{isMuted ? '🔇' : '🔊'}</span>
          {isMuted ? 'Tap to hear Jules' : 'Jules is speaking...'}
        </button>

        {/* Taglines */}
        <div style={{ textAlign: 'center', gap: 8, display: 'flex', flexDirection: 'column' }}>
          <h1 style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 'clamp(1.4rem, 5vw, 1.9rem)',
            fontWeight: 700,
            color: 'white',
            margin: 0,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}>
            Know yourself<br />before it happens.
          </h1>
          <p style={{
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.95rem',
            color: '#4A5568',
            margin: 0,
          }}>
            Knowing yourself pays.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={onRegister}
          style={{
            width: '100%',
            maxWidth: 360,
            background: '#FF6B6B',
            border: 'none',
            borderRadius: 14,
            padding: '18px 24px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Become a Data Trader
        </button>

        {onSignIn && (
          <button
            onClick={onSignIn}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A5568',
              fontSize: '0.85rem',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              padding: '4px 0',
            }}
          >
            Already a trader? Sign in
          </button>
        )}
      </div>

      <div style={{ width: '100%', maxWidth: 430, height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* Portfolio Calculator */}
      <div style={{ width: '100%', maxWidth: 430, padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#4A5568', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          Your estimated data portfolio value
        </p>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '2.8rem',
          fontWeight: 700,
          color: '#FFD93D',
          lineHeight: 1,
        }}>
          ${portfolioValue.toFixed(2)}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#4A5568', fontSize: 13 }}>Days consistent</span>
            <span style={{ color: 'white', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
              {portfolioDays}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={365}
            value={portfolioDays}
            onChange={e => setPortfolioDays(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#FFD93D', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#4A5568', fontSize: 11 }}>Day 0</span>
            <span style={{ color: '#4A5568', fontSize: 11 }}>Day 365</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* Founding Trader CTA */}
      <div style={{ width: '100%', maxWidth: 430, padding: '32px 24px' }}>
        <div style={{
          border: '1px solid rgba(255,217,61,0.35)',
          borderRadius: 16,
          padding: '24px',
          boxShadow: '0 0 32px rgba(255,217,61,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          <div style={{
            background: 'rgba(255,217,61,0.1)',
            border: '1px solid rgba(255,217,61,0.25)',
            borderRadius: 8,
            padding: '4px 10px',
            color: '#FFD93D',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.1em',
            display: 'inline-block',
            width: 'fit-content',
          }}>
            ★ FOUNDING TRADER
          </div>
          <p style={{
            color: 'rgba(255,255,255,0.88)',
            fontSize: '0.95rem',
            lineHeight: 1.55,
            margin: 0,
          }}>
            First 500 traders lock in <strong style={{ color: '#FFD93D' }}>$7.99/month forever</strong> and keep <strong style={{ color: '#FFD93D' }}>80%</strong> of every research transaction.
          </p>
          <button
            onClick={onRegister}
            style={{
              background: 'rgba(255,217,61,0.12)',
              border: '1px solid rgba(255,217,61,0.4)',
              borderRadius: 10,
              padding: '14px',
              color: '#FFD93D',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Secure your spot →
          </button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 430, height: 1, background: 'rgba(255,255,255,0.07)' }} />

      {/* Footer */}
      <p style={{ color: '#4A5568', fontSize: 12, padding: '20px 24px', textAlign: 'center', margin: 0 }}>
        18+ only. biocycle.app. Santo Domingo, DR.
      </p>
    </div>
  );
}
