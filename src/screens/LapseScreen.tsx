import { useState } from 'react';
import { colors, fonts } from '../lib/tokens';
import type { Profile, UserState } from '../lib/supabase';
import { purchaseTier, restorePurchases } from '../lib/iap';

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

  const [purchasing, setPurchasing] = useState<'standard' | 'premium' | 'restore' | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  async function handlePurchase(tier: 'standard' | 'premium') {
    setPurchasing(tier);
    setPurchaseError(null);
    const result = await purchaseTier(tier);
    setPurchasing(null);
    if (result.ok) {
      onTierChange();
    } else if (!result.cancelled) {
      setPurchaseError(result.error ?? (isES ? 'Error al procesar la compra.' : 'Purchase failed. Please try again.'));
    }
  }

  async function handleRestore() {
    setPurchasing('restore');
    setPurchaseError(null);
    const result = await restorePurchases();
    setPurchasing(null);
    if (result.ok && result.tier) {
      onTierChange();
    } else if (!result.ok) {
      setPurchaseError(result.error ?? (isES ? 'No se encontraron compras.' : 'No purchases found.'));
    } else {
      setPurchaseError(isES ? 'No se encontraron compras activas.' : 'No active purchases found.');
    }
  }

  const btnBase: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'center',
    borderRadius: 10, padding: '11px',
    fontSize: 13, fontWeight: 600,
    letterSpacing: '0.05em', cursor: 'pointer',
    fontFamily: fonts.body, border: 'none',
    transition: 'opacity 0.15s',
  };

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
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 24 }}>
        <button
          onClick={onResume}
          style={{
            ...btnBase,
            background: colors.amber,
            color: colors.midnight,
            fontSize: 14,
            padding: '14px',
          }}
        >
          {isES ? 'Retomar gratis — check-in ahora' : 'Resume free — check in now'}
        </button>
      </div>

      {/* Data reassurance */}
      <div style={{
        background: 'rgba(0,200,150,0.06)',
        border: '1px solid rgba(0,200,150,0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 24,
        width: '100%',
        maxWidth: 340,
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

      {/* ── OPTIONAL: upgrade ────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 8 }}>
        <div style={{ fontSize: 11, color: colors.boneFaint, textAlign: 'center', marginBottom: 14, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
          {isES ? 'O suscríbete para acceso continuo' : 'Or subscribe for uninterrupted access'}
        </div>

        {/* Standard */}
        <div style={{
          background: 'rgba(245,242,238,0.04)',
          border: '1px solid rgba(245,242,238,0.12)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.bone }}>{isES ? 'Estándar' : 'Standard'}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.bone, fontFamily: fonts.mono }}>
              $12.99<span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 12 }}>
            {isES
              ? '3 turnos con Jules · Pronóstico 7 días · Círculo de 5 · 1 compatibilidad'
              : '3 Jules turns · 7-day forecast · Circle of 5 · 1 compatibility'}
          </div>
          <button
            onClick={() => handlePurchase('standard')}
            disabled={purchasing !== null}
            style={{
              ...btnBase,
              background: 'rgba(245,242,238,0.08)',
              border: '1px solid rgba(245,242,238,0.2)',
              color: colors.bone,
              opacity: purchasing !== null ? 0.5 : 1,
            }}
          >
            {purchasing === 'standard'
              ? (isES ? 'Procesando…' : 'Processing…')
              : (isES ? 'Suscribirse — $12.99/mes' : 'Subscribe — $12.99/mo')}
          </button>
        </div>

        {/* Premium */}
        <div style={{
          background: 'rgba(123,97,255,0.08)',
          border: '1px solid rgba(123,97,255,0.3)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.tierElite }}>Premium</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.tierElite, fontFamily: fonts.mono }}>
              $22.99<span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 12 }}>
            {isES
              ? '7 turnos con Jules · Pronóstico 14 días · Círculo de 10 · 3 compatibilidades · Trading de datos prioritario'
              : '7 Jules turns · 14-day forecast · Circle of 10 · 3 compatibilities · Priority data trading'}
          </div>
          <button
            onClick={() => handlePurchase('premium')}
            disabled={purchasing !== null}
            style={{
              ...btnBase,
              background: 'rgba(123,97,255,0.15)',
              border: '1px solid rgba(123,97,255,0.4)',
              color: colors.tierElite,
              opacity: purchasing !== null ? 0.5 : 1,
            }}
          >
            {purchasing === 'premium'
              ? (isES ? 'Procesando…' : 'Processing…')
              : (isES ? 'Suscribirse — $22.99/mes' : 'Subscribe — $22.99/mo')}
          </button>
        </div>

        {purchaseError && (
          <div style={{ fontSize: 12, color: '#ff6b6b', textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
            {purchaseError}
          </div>
        )}

        {/* Auto-renewal disclosure — required by Apple & Google */}
        <div style={{ fontSize: 10, color: 'rgba(245,242,238,0.35)', textAlign: 'center', lineHeight: 1.6, marginTop: 12, padding: '0 4px' }}>
          {isES
            ? 'Las suscripciones se renuevan automáticamente a menos que las canceles al menos 24 horas antes del final del período vigente. Puedes gestionar y cancelar tus suscripciones en la configuración de tu cuenta de la App Store o Google Play.'
            : 'Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your App Store or Google Play account settings.'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 10 }}>
          <a href="https://biocycle.app/terms" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'rgba(245,242,238,0.35)', textDecoration: 'underline' }}>
            {isES ? 'Términos de uso' : 'Terms of Use'}
          </a>
          <a href="https://biocycle.app/privacy" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 10, color: 'rgba(245,242,238,0.35)', textDecoration: 'underline' }}>
            {isES ? 'Privacidad' : 'Privacy Policy'}
          </a>
        </div>
      </div>

      {/* Restore purchases */}
      <button
        onClick={handleRestore}
        disabled={purchasing !== null}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(245,242,238,0.4)', fontSize: 11,
          cursor: 'pointer', letterSpacing: '0.04em',
          marginBottom: 12, fontFamily: fonts.body,
          opacity: purchasing !== null ? 0.4 : 1,
        }}
      >
        {purchasing === 'restore'
          ? (isES ? 'Restaurando…' : 'Restoring…')
          : (isES ? 'Restaurar compras' : 'Restore Purchases')}
      </button>

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
    </div>
  );
}
