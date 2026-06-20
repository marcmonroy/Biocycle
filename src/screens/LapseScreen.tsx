import { colors, fonts } from '../lib/tokens';
import type { Profile, UserState } from '../lib/supabase';

interface Props {
  profile: Profile;
  userState: UserState;
  onLogout: () => void;
}

export function LapseScreen({ profile, userState, onLogout }: Props) {
  const idioma = profile.idioma ?? 'EN';
  const isES = idioma === 'ES';
  const streakDays = userState.streak_at_lapse ?? 0;
  const lapseDate = userState.last_response_date
    ? new Date(userState.last_response_date).toLocaleDateString(
        isES ? 'es-ES' : 'en-US',
        { month: 'long', day: 'numeric' }
      )
    : null;

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
        <div style={{
          fontSize: 13,
          color: colors.boneFaint,
          textAlign: 'center',
          marginBottom: 8,
          lineHeight: 1.6,
        }}>
          {isES
            ? `Construiste una racha de ${streakDays} días${lapseDate ? ` hasta el ${lapseDate}` : ''}.`
            : `You built a ${streakDays}-day streak${lapseDate ? ` through ${lapseDate}` : ''}.`}
        </div>
      )}

      <div style={{
        fontSize: 13,
        color: colors.boneFaint,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 1.6,
        maxWidth: 300,
      }}>
        {isES
          ? 'Los accesos gratuitos requieren uso continuo. Una pausa de más de 7 días pausa el acceso gratuito.'
          : 'Free access requires continuous use. A pause of more than 7 days pauses your free access.'}
      </div>

      {/* Data reassurance */}
      <div style={{
        background: 'rgba(0,200,150,0.06)',
        border: '1px solid rgba(0,200,150,0.2)',
        borderRadius: 14,
        padding: '16px 20px',
        marginBottom: 28,
        width: '100%',
        maxWidth: 340,
      }}>
        <div style={{ fontSize: 11, color: colors.success, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
          {isES ? '✓ TUS DATOS ESTÁN SEGUROS' : '✓ YOUR DATA IS SAFE'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(245,242,238,0.7)', lineHeight: 1.6 }}>
          {isES
            ? `Todos tus datos de BioCycle están preservados. Suscríbete para continuar donde lo dejaste.`
            : `All your BioCycle data is preserved. Subscribe to continue where you left off.`}
        </div>
      </div>

      {/* Pricing options */}
      <div style={{ width: '100%', maxWidth: 340, marginBottom: 16 }}>

        {/* Standard */}
        <div style={{
          background: 'rgba(245,242,238,0.04)',
          border: '1px solid rgba(245,242,238,0.12)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.bone }}>
              {isES ? 'Estándar' : 'Standard'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.bone, fontFamily: fonts.mono }}>
              $12.99<span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 14 }}>
            {isES
              ? '3 turnos con Jules · Pronóstico 7 días · Círculo de 5 · 1 compatibilidad'
              : '3 Jules turns · 7-day forecast · Circle of 5 · 1 compatibility'}
          </div>
          <a
            href="mailto:hello@biocycle.app?subject=Standard subscription"
            style={{
              display: 'block', textAlign: 'center',
              background: 'rgba(245,242,238,0.08)',
              border: '1px solid rgba(245,242,238,0.2)',
              borderRadius: 10, padding: '10px',
              color: colors.bone, fontSize: 12,
              fontWeight: 600, textDecoration: 'none',
              letterSpacing: '0.06em',
            }}
          >
            {isES ? 'Suscribirse — $12.99/mes' : 'Subscribe — $12.99/mo'}
          </a>
        </div>

        {/* Premium */}
        <div style={{
          background: 'rgba(123,97,255,0.08)',
          border: '1px solid rgba(123,97,255,0.3)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.tierElite }}>
              Premium
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: colors.tierElite, fontFamily: fonts.mono }}>
              $22.99<span style={{ fontSize: 11, fontWeight: 400, color: colors.boneFaint }}>/mo</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: colors.boneFaint, lineHeight: 1.6, marginBottom: 14 }}>
            {isES
              ? '7 turnos con Jules · Pronóstico 14 días · Círculo de 10 · 3 compatibilidades · Trading de datos prioritario'
              : '7 Jules turns · 14-day forecast · Circle of 10 · 3 compatibilities · Priority data trading'}
          </div>
          <a
            href="mailto:hello@biocycle.app?subject=Premium subscription"
            style={{
              display: 'block', textAlign: 'center',
              background: 'rgba(123,97,255,0.15)',
              border: '1px solid rgba(123,97,255,0.4)',
              borderRadius: 10, padding: '10px',
              color: colors.tierElite, fontSize: 12,
              fontWeight: 600, textDecoration: 'none',
              letterSpacing: '0.06em',
            }}
          >
            {isES ? 'Suscribirse — $22.99/mes' : 'Subscribe — $22.99/mo'}
          </a>
        </div>
      </div>

      {/* Export data — legal right, always accessible */}
      <div style={{ marginBottom: 20, textAlign: 'center' }}>
        <a
          href={`mailto:hello@biocycle.app?subject=Data export request&body=Please send me a CSV export of all my BioCycle data. My registered email is: ${profile.id}`}
          style={{ fontSize: 11, color: colors.boneFaint, textDecoration: 'underline' }}
        >
          {isES ? 'Exportar mis datos (CSV)' : 'Export my data (CSV)'}
        </a>
      </div>

      {/* Sign out */}
      <button
        onClick={onLogout}
        style={{
          background: 'none', border: 'none',
          color: 'rgba(245,242,238,0.3)', fontSize: 11,
          cursor: 'pointer', letterSpacing: '0.06em',
        }}
      >
        {isES ? 'Cerrar sesión' : 'Sign out'}
      </button>

      {/* Note: Stripe integration will replace mailto links once approved */}
    </div>
  );
}
