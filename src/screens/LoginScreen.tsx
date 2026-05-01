import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLang } from '../lib/lang';
import { colors, fonts } from '../lib/tokens';

interface Props {
  onRegister?: () => void;
}

export function LoginScreen({ onRegister }: Props) {
  const isES = getLang() === 'ES';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError(isES ? 'Todos los campos son requeridos.' : 'All fields required.'); return; }
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    // On success, onAuthStateChange in App.tsx fires → loadProfile → setScreen('home')
  };

  async function handlePasswordReset() {
    if (!resetEmail) return;
    setLoading(true);
    setResetError('');
    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://biocycle.app',
    });
    setLoading(false);
    if (err) setResetError(err.message);
    else setResetSent(true);
  }

  return (
    <div style={screenStyle}>
      <div style={cardStyle}>
        {showReset ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={headingStyle}>{isES ? 'Recuperar acceso' : 'Reset password'}</h2>
            <p style={bodyStyle}>
              {isES ? 'Ingresa tu correo para recibir un enlace de recuperación.' : 'Enter your email to receive a reset link.'}
            </p>
            {resetSent ? (
              <p style={{ color: '#00C896', fontSize: '0.9rem', margin: 0 }}>
                {isES ? 'Revisa tu correo.' : 'Check your email for a reset link.'}
              </p>
            ) : (
              <>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder={isES ? 'Correo electrónico' : 'Email address'}
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                />
                {resetError && <p style={errorStyle}>{resetError}</p>}
                <button style={btnStyle} onClick={handlePasswordReset} disabled={loading}>
                  {loading ? '...' : (isES ? 'Enviar enlace →' : 'Send reset link →')}
                </button>
              </>
            )}
            <button onClick={() => { setShowReset(false); setResetSent(false); setResetError(''); }} style={inlineLinkStyle}>
              {isES ? '← Volver' : '← Back to sign in'}
            </button>
          </div>
        ) : (
          <>
            <h2 style={headingStyle}>{isES ? 'Bienvenido de vuelta.' : 'Welcome back.'}</h2>
            <p style={bodyStyle}>{isES ? 'Inicia sesión en tu cuenta de BioCycle.' : 'Sign in to your BioCycle account.'}</p>

            <input
              style={inputStyle}
              type="email"
              placeholder={isES ? 'Correo electrónico' : 'Email address'}
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              autoComplete="email"
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
            />

            <div style={{ position: 'relative' }}>
              <input
                style={{ ...inputStyle, paddingRight: 48 }}
                type={showPassword ? 'text' : 'password'}
                placeholder={isES ? 'Contraseña' : 'Password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: colors.boneFaint,
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: 0,
                }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); }}
              style={{ ...inlineLinkStyle, fontSize: '0.82rem', textAlign: 'left' as const }}
            >
              {isES ? '¿Olvidaste tu contraseña?' : 'Forgot your password?'}
            </button>

            {error && <p style={errorStyle}>{error}</p>}

            <button style={btnStyle} onClick={handleLogin} disabled={loading}>
              {loading ? '...' : (isES ? 'Iniciar sesión →' : 'Sign in →')}
            </button>

            {onRegister && (
              <p style={{ ...bodyStyle, textAlign: 'center' }}>
                {isES ? '¿Nuevo aquí? ' : 'New here? '}
                <button onClick={onRegister} style={inlineLinkStyle}>
                  {isES ? 'Crear una cuenta' : 'Create an account'}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const screenStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  background: colors.midnight,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: fonts.body,
  overflowX: 'hidden',
  padding: '24px',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 430,
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const headingStyle: React.CSSProperties = {
  color: colors.bone,
  fontSize: '1.6rem',
  fontWeight: 300,
  margin: 0,
  fontFamily: fonts.display,
};

const bodyStyle: React.CSSProperties = {
  color: colors.boneFaint,
  fontSize: '0.9rem',
  lineHeight: 1.55,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '14px 16px',
  color: colors.bone,
  fontSize: '1rem',
  fontFamily: fonts.body,
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  background: colors.amber,
  border: 'none',
  borderRadius: 12,
  padding: '16px',
  color: colors.bone,
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  color: colors.amber,
  fontSize: '0.85rem',
  margin: 0,
};

const inlineLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.6)',
  fontSize: 'inherit',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  fontFamily: 'inherit',
};
