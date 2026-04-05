import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getLang } from '../lib/lang';

interface Props {
  onRegister?: () => void;
}

export function LoginScreen({ onRegister }: Props) {
  const isES = getLang() === 'ES';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError(isES ? 'Todos los campos son requeridos.' : 'All fields required.'); return; }
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    // On success, onAuthStateChange in App.tsx fires → loadProfile → setScreen('home')
  };

  return (
    <div style={screenStyle}>
      <div style={cardStyle}>
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
        <input
          style={inputStyle}
          type="password"
          placeholder={isES ? 'Contraseña' : 'Password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          autoComplete="current-password"
          onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
        />

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
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
const screenStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0A0A1A',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Inter, system-ui, sans-serif',
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
  color: 'white',
  fontSize: '1.6rem',
  fontWeight: 700,
  margin: 0,
  fontFamily: 'JetBrains Mono, monospace',
};

const bodyStyle: React.CSSProperties = {
  color: '#4A5568',
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
  color: 'white',
  fontSize: '1rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  width: '100%',
  background: '#FF6B6B',
  border: 'none',
  borderRadius: 12,
  padding: '16px',
  color: 'white',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const errorStyle: React.CSSProperties = {
  color: '#FF6B6B',
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
