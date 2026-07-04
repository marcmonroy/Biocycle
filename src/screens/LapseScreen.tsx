import { useState } from 'react';
import { colors, fonts } from '../lib/tokens';
import type { Profile, UserState } from '../lib/supabase';
import { UpgradeSheet } from '../components/UpgradeSheet';

interface Props {
  profile: Profile;
  userState: UserState;
  onLogout: () => void;
  onResume: () => void;
  onTierChange: () => void;
}

export function LapseScreen({ profile, userState, onLogout, onResume, onTierChange }: Props) {
  const idioma = profile.idioma ?? 'EN';
  const isES = idioma === 'ES';
  const streakDays = userState.streak_at_lapse ?? 0;
  const lapseDate = userState.last_response_date
    ? new Date(userState.last_response_date).toLocaleDateString(
        isES ? 'es-ES' : 'en-US',
        { month: 'long', day: 'numeric' }
      )
    : null;

  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div style={{
      minHeight: '100vh',
      background: colors.midnight,
      fontFamily: fonts.body,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40 }}>
        <img src="/favicon.svg" alt="" style={{ width: 24, height: 24 }} />
        <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: colors.boneFaint, letterSpacing: '0.04em' }}>
          biocycle
        </span>
      </div>

      {/* Streak lost icon */}
      <div style={{ fontSize: 52, marginBottom: 20 }}>🌑</div>

      {/* Headline */}
      <h1 style={{
        fontFamily: fonts.display,
        fontSize: '1.5rem',
        fontWeight: 300,
        color: colors.bone,
        textAlign: 'center',
        margin: '0 0 12px',
        lineHeight: 1.3,
      }}>
        {isES ? 'Tu acceso gratuito pausó' : 'Your free access paused'}
      </h1>

      {/* Streak info */}
      {streakDays > 0 && (
        <div style={{ fontSize: 13, color: colors.boneFaint, textAlign: 'center', marginBottom: 8, lineHeight: 1.6 }}>
          {isES
            ? `Construiste una racha de ${streakDays} días${lapseDate ? ` hasta el ${lapseDate}` : ''}.`
            : `You built a ${streakDays}-day streak${lapseDate ? ` through ${lapseDate}` : ''}.`}
        </div>
      )}

      <div style={{ fontSize: 13, color: colors.boneFaint, textAlign: 'center', marginBottom: 28, lineHeight: 1.6, maxWidth: 300 }}>
        {isES
          ? 'Los accesos gratuitos requieren uso continuo. Una pausa de más de 7 días pausa el acceso gratuito.'
          : 'Free access requires continuous use. A pause of more than 7 days pauses your free access.'}
      </div>

      {/* ── PRIMARY: resume free via check-in ────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 20 }}>
        <button
          onClick={onResume}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: colors.amber, color: colors.midnight,
            borderRadius: 10, padding: '14px',
            fontSize: 14, fontWeight: 700,
            letterSpacing: '0.04em', cursor: 'pointer',
            fontFamily: fonts.body, border: 'none',
          }}
        >
          {isES ? 'Retomar gratis — check-in ahora' : 'Resume free — check in now'}
        </button>
      </div>

      {/* Data reassurance */}
      <div style={{
        background: 'rgba(0,200,150,0.06)',
        border: '1px solid rgba(0,200,150,0.2)',
        borderRadius: 14, padding: '16px 20px', marginBottom: 20,
        width: '100%', maxWidth: 340,
      }}>
        <div style={{ fontSize: 11, color: colors.success, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
          {isES ? '✓ TUS DATOS ESTÁN SEGUROS' : '✓ YOUR DATA IS SAFE'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,242,238,0.7)', lineHeight: 1.6 }}>
          {isES
            ? 'Todos tus datos de BioCycle están preservados. Suscríbete para continuar sin pausas.'
            : 'All your BioCycle data is preserved. Subscribe to continue without interruptions.'}
        </div>
      </div>

      {/* ── SECONDARY: optional upgrade ──────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 20 }}>
        <button
          onClick={() => setShowUpgrade(true)}
          style={{
            display: 'block', width: '100%', textAlign: 'center',
            background: 'rgba(133,183,235,0.08)',
            border: '1px solid rgba(133,183,235,0.25)',
            borderRadius: 10, padding: '12px',
            fontSize: 13, fontWeight: 600,
            color: colors.tierElite, cursor: 'pointer',
            fontFamily: fonts.body,
          }}
        >
          {isES
            ? 'Ver planes — desde $12.99/mes'
            : 'View plans — from $12.99/mo'}
        </button>
      </div>

      {/* Sign out */}
      <button
        onClick={onLogout}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(245,242,238,0.25)', fontSize: 11,
          cursor: 'pointer', letterSpacing: '0.06em',
          fontFamily: fonts.body,
        }}
      >
        {isES ? 'Cerrar sesión' : 'Sign out'}
      </button>

      {/* UpgradeSheet modal */}
      {showUpgrade && (
        <UpgradeSheet
          lang={idioma as 'EN' | 'ES'}
          onSuccess={() => { setShowUpgrade(false); onTierChange(); }}
          onClose={() => setShowUpgrade(false)}
        />
      )}
    </div>
  );
}
