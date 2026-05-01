import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getLang } from '../lib/lang';
import { colors, fonts } from '../lib/tokens';

type Step = 1 | 2 | 3 | 4 | 5;

interface Props {
  onComplete: () => void;
  onSignIn?: () => void;
  initialStep?: Step;
  initialUserId?: string;
  initialPhone?: string;
  initialEmail?: string;
}

const COUNTRY_CODES = [
  { code: '+1',    label: 'US/CA' },
  { code: '+44',   label: 'UK' },
  { code: '+34',   label: 'ES' },
  { code: '+52',   label: 'MX' },
  { code: '+1809', label: 'DR' },
  { code: '+1829', label: 'DR' },
  { code: '+57',   label: 'CO' },
  { code: '+54',   label: 'AR' },
  { code: '+56',   label: 'CL' },
  { code: '+58',   label: 'VE' },
  { code: '+51',   label: 'PE' },
  { code: '+55',   label: 'BR' },
];

export function RegisterScreen({ onComplete, onSignIn, initialStep, initialUserId, initialPhone, initialEmail }: Props) {
  const [step, setStep] = useState<Step>(() => initialStep ?? 1);
  // Authoritative userId — set only from the live signUp response (or explicitly in the resume effect).
  // Never initialized from props so a fresh registration always starts clean.
  const userIdRef = useRef<string | null>(null);

  // Step 1
  const [email, setEmail] = useState(() => initialEmail ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [existingAccount, setExistingAccount] = useState(false);

  // Step 2
  const [dob, setDob] = useState('');
  const [underAge, setUnderAge] = useState(false);

  // Step 3 — language read from localStorage (set on landing page)
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'nonbinary' | ''>('');
  const [language] = useState<'EN' | 'ES'>(() => getLang());

  // Step 4
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');
  const [savedPhone, setSavedPhone] = useState(() => initialPhone ?? '');

  // Step 5
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [codeExpired, setCodeExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isES = language === 'ES';
  const progress = (step / 5) * 100;

  // ── Auto-send code when resuming at step 5 after login ────────────────────
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (initialUserId) userIdRef.current = initialUserId;
    if (initialStep === 5 && userIdRef.current && savedPhone && !autoSentRef.current) {
      autoSentRef.current = true;
      setLoading(true);
      fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: savedPhone, userId: userIdRef.current, action: 'send_verification' }),
      })
        .then(res => {
          setLoading(false);
          if (res.ok) startResendCooldown();
          else setError(isES ? 'Error al enviar el código.' : 'Failed to send code.');
        })
        .catch(() => { setLoading(false); setError('Network error.'); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 1 ───────────────────────────────────────────────────────────────
  const handleStep1 = async () => {
    if (!email || !password) { setError('All fields required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setExistingAccount(false);
    // Clear any stale userId from a previous session before issuing a new signUp
    userIdRef.current = null;
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (authError) {
      if (authError.message?.toLowerCase().includes('already registered') ||
          authError.message?.toLowerCase().includes('already exists') ||
          (authError as any).code === 'user_already_exists') {
        // User exists — try to sign them in and continue registration
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!signInErr) {
          // Signed in successfully — check if they need to continue setup
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('whatsapp_verified')
              .eq('id', user.id)
              .maybeSingle();
            if (profileData && !profileData.whatsapp_verified) {
              setStep(4); // Send them to phone step
              setLoading(false);
              return;
            } else if (profileData?.whatsapp_verified) {
              onComplete(); // Already fully registered
              setLoading(false);
              return;
            }
          }
        }
        // Wrong password for existing account
        setError('An account with this email exists. Check your password or use "Sign in" below.');
        setLoading(false);
        return;
      }
      setError(authError.message);
      return;
    }

    // Supabase returns user with session=null for an already-registered email
    if (data.user && !data.session) {
      // Try to sign in with the provided credentials and continue setup
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInErr) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('whatsapp_verified')
            .eq('id', user.id)
            .maybeSingle();
          if (profileData && !profileData.whatsapp_verified) {
            setStep(4);
            setLoading(false);
            return;
          } else if (profileData?.whatsapp_verified) {
            onComplete();
            setLoading(false);
            return;
          }
        }
      }
      setExistingAccount(true);
      setError('An account with this email exists. Check your password or use "Sign in" below.');
      return;
    }

    if (data.user && data.session) {
      // Capture authoritative ID directly from signUp response — never from state or cache
      const freshUserId = data.user.id;
      console.log('[RegisterScreen] signUp success. authoritative user_id:', freshUserId);
      userIdRef.current = freshUserId;
      setStep(2);
    }
  };

  // ── Step 2 ───────────────────────────────────────────────────────────────
  const handleStep2 = () => {
    if (!dob) { setError('Please enter your date of birth.'); return; }
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    if (age < 18) { setUnderAge(true); return; }
    setError('');
    setStep(3);
  };

  // ── Step 3 ───────────────────────────────────────────────────────────────
  const handleStep3 = () => {
    if (!name || !gender) { setError('All fields required.'); return; }
    setError('');
    setStep(4);
  };

  // ── Step 4 ───────────────────────────────────────────────────────────────
  const handleStep4 = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 13) {
      setError(isES ? 'Número inválido.' : 'Invalid phone number.');
      return;
    }
    const fullPhone = `${countryCode}${digits}`;
    setError('');
    setLoading(true);

    const uid = userIdRef.current;
    console.log('[RegisterScreen] handleStep4 using user_id:', uid);

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_phone', fullPhone)
      .neq('id', uid)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      setError(isES
        ? 'Este número de WhatsApp ya está asociado a una cuenta de BioCycle.'
        : 'This WhatsApp number is already associated with a BioCycle account.');
      return;
    }

    // Try insert first; fall back to update if row already exists
    const { error: insertError } = await supabase.from('profiles').insert({
      id:                uid,
      nombre:            name,
      genero:            gender || null,
      idioma:            language,
      fecha_nacimiento:  dob || null,
      age_verified:      true,
      whatsapp_phone:    fullPhone,
      whatsapp_verified: false,
    });

    if (insertError && insertError.code === '23505') {
      const { error: updateError } = await supabase.from('profiles').update({
        nombre:            name,
        genero:            gender || null,
        idioma:            language,
        fecha_nacimiento:  dob || null,
        age_verified:      true,
        whatsapp_phone:    fullPhone,
        whatsapp_verified: false,
      }).eq('id', uid);

      if (updateError) {
        setError('Profile save failed: ' + updateError.message);
        setLoading(false);
        return;
      }
    } else if (insertError) {
      setError('Profile save failed: ' + insertError.message);
      setLoading(false);
      return;
    }

    console.log('[RegisterScreen] profile upsert success for user_id:', uid);
    setSavedPhone(fullPhone);

    // Create user_state row before verification code is inserted
    const { error: stateError } = await supabase.from('user_state').upsert({
      user_id:         uid,
      state:           'active_trader',
      founding_trader: false,
    }, { onConflict: 'user_id' });

    if (stateError) {
      console.error('[RegisterScreen] user_state upsert error:', stateError.message);
    }

    // Send verification code via Netlify function (code generated + stored server-side)
    const res = await fetch('/.netlify/functions/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: fullPhone, userId: uid, action: 'send_verification' }),
    });

    setLoading(false);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || (isES ? 'Error al enviar el código.' : 'Failed to send code.'));
      return;
    }

    startResendCooldown();
    setStep(5);
  };

  const startResendCooldown = () => {
    setResendCooldown(30);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Step 5 ───────────────────────────────────────────────────────────────
  const handleCodeInput = (val: string, idx: number) => {
    const d = val.replace(/\D/g, '').slice(0, 1);
    const next = [...verificationCode];
    next[idx] = d;
    setVerificationCode(next);
    if (d && idx < 5) {
      document.getElementById(`code-${idx + 1}`)?.focus();
    }
  };

  const handleStep5 = async () => {
    const entered = verificationCode.join('');
    if (entered.length < 6) { setError(isES ? 'Ingresa los 6 dígitos.' : 'Enter all 6 digits.'); return; }
    setError('');
    setCodeExpired(false);
    setLoading(true);

    // Query code from Supabase (server-generated, RLS: user can read own row)
    const { data: codeRow } = await supabase
      .from('whatsapp_verification_codes')
      .select('code, expires_at')
      .eq('user_id', userIdRef.current)
      .maybeSingle();

    if (!codeRow) {
      setLoading(false);
      setError(isES ? 'Código no encontrado. Reenvía el código.' : 'Code not found. Please resend.');
      return;
    }

    if (new Date() > new Date(codeRow.expires_at)) {
      setLoading(false);
      setCodeExpired(true);
      setError(isES ? 'El código expiró.' : 'Code expired.');
      return;
    }

    if (entered !== codeRow.code) {
      setLoading(false);
      setError(isES ? 'Código incorrecto. Intenta de nuevo.' : 'Incorrect code. Please try again.');
      return;
    }

    // Match — mark verified, delete code row, upsert user_state
    await supabase.from('profiles').update({ whatsapp_verified: true }).eq('id', userIdRef.current);
    await supabase.from('whatsapp_verification_codes').delete().eq('user_id', userIdRef.current);
    const { error: stateError5 } = await supabase.from('user_state').upsert({
      user_id:         userIdRef.current,
      state:           'active_trader',
      founding_trader: false,
    }, { onConflict: 'user_id' });

    if (stateError5) {
      console.error('[RegisterScreen] user_state upsert error (step 5):', stateError5.message);
    }

    const localToUTC = (localHour: number): number => {
      const d = new Date();
      d.setHours(localHour, 0, 0, 0);
      return d.getUTCHours();
    };

    await supabase.from('profiles').update({
      checkin_times: {
        morning:   { hour: localToUTC(8),  label: '8am' },
        afternoon: { hour: localToUTC(13), label: '1pm' },
        night:     { hour: localToUTC(20), label: '8pm' },
      },
    }).eq('id', userIdRef.current);

    setLoading(false);
    onComplete();
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setCodeExpired(false);
    setVerificationCode(['', '', '', '', '', '']);
    setLoading(true);

    const res = await fetch('/.netlify/functions/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: savedPhone, userId: userIdRef.current, action: 'send_verification' }),
    });

    setLoading(false);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      setError(errData.error || (isES ? 'Error al reenviar.' : 'Failed to resend.'));
      return;
    }

    startResendCooldown();
  };

  // ── Under-age hard block ──────────────────────────────────────────────────
  if (underAge) {
    return (
      <div style={screenStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 48, textAlign: 'center' }}>🔒</div>
          <h2 style={headingStyle}>
            {isES ? 'Acceso restringido' : 'Access restricted'}
          </h2>
          <p style={bodyStyle}>
            {isES
              ? 'BioCycle está disponible actualmente para usuarios de 18 años en adelante.'
              : 'BioCycle is currently available for users 18 and older.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={screenStyle}>
      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: 430, padding: '20px 24px 0' }}>
        <div style={{ height: 3, background: 'rgba(245, 242, 238,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: colors.amber,
            borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
        <p style={{ color: colors.boneFaint, fontSize: 12, margin: '8px 0 0', letterSpacing: '0.08em' }}>
          {isES ? `Paso ${step} de 5` : `Step ${step} of 5`}
        </p>
      </div>

      <div style={cardStyle}>

        {/* STEP 1 */}
        {step === 1 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Bienvenido, futuro Founding Trader' : 'Welcome, future Founding Trader'}
          </h2>
          <input style={inputStyle} type="email" placeholder="Email address"
            value={email} onChange={e => { setEmail(e.target.value); setError(''); setExistingAccount(false); }}
            autoComplete="email" />
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...inputStyle, paddingRight: 48 }}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password (min 8 chars)"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              autoComplete="new-password"
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
          {error && (
            <p style={errorStyle}>
              {error}
              {existingAccount && onSignIn && (
                <> <button onClick={onSignIn} style={inlineLinkStyle}>Sign in</button></>
              )}
            </p>
          )}
          <button style={btnStyle} onClick={handleStep1} disabled={loading}>
            {loading ? '...' : 'Continue →'}
          </button>
          <p style={{ ...bodyStyle, textAlign: 'center', marginTop: 4 }}>
            Already have an account?{' '}
            {onSignIn && (
              <button onClick={onSignIn} style={inlineLinkStyle}>Sign in</button>
            )}
          </p>
        </>)}

        {/* STEP 2 */}
        {step === 2 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Fecha de nacimiento' : 'Date of birth'}
          </h2>
          <p style={bodyStyle}>
            {isES ? 'BioCycle es para mayores de 18 años.' : 'BioCycle is for users 18 and older.'}
          </p>
          <input style={inputStyle} type="date" value={dob}
            onChange={e => setDob(e.target.value)}
            max={new Date(new Date().setFullYear(new Date().getFullYear() - 13)).toISOString().split('T')[0]}
          />
          {error && <p style={errorStyle}>{error}</p>}
          <button style={btnStyle} onClick={handleStep2} disabled={loading || !dob}>
            {loading ? '...' : (isES ? 'Continuar →' : 'Continue →')}
          </button>
        </>)}

        {/* STEP 3 */}
        {step === 3 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Tu perfil' : 'Your profile'}
          </h2>
          <input style={inputStyle} type="text"
            placeholder={isES ? 'Tu nombre' : 'First name'}
            value={name} onChange={e => setName(e.target.value)} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ ...bodyStyle, margin: 0 }}>{isES ? 'Género' : 'Gender'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: 'female',    label: isES ? 'Femenino' : 'Female' },
                { val: 'male',      label: isES ? 'Masculino' : 'Male' },
                { val: 'nonbinary', label: isES ? 'No binario' : 'Non-binary' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setGender(opt.val as typeof gender)}
                  style={pillStyle(gender === opt.val)}>{opt.label}</button>
              ))}
            </div>
          </div>

          {error && <p style={errorStyle}>{error}</p>}
          <button style={btnStyle} onClick={handleStep3} disabled={loading || !name || !gender}>
            {loading ? '...' : (isES ? 'Continuar →' : 'Continue →')}
          </button>
        </>)}

        {/* STEP 4 */}
        {step === 4 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Tu WhatsApp' : 'Your WhatsApp'}
          </h2>
          <p style={bodyStyle}>
            {isES
              ? 'Jules te enviará tus sesiones diarias por WhatsApp.'
              : "Jules will send your daily sessions via WhatsApp."}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
              style={{ ...inputStyle, width: 90, flexShrink: 0 }}>
              {COUNTRY_CODES.map(c => (
                <option key={c.code + c.label} value={c.code}>{c.code} {c.label}</option>
              ))}
            </select>
            <input style={{ ...inputStyle, flex: 1 }} type="tel"
              placeholder={isES ? 'Número de teléfono' : 'Phone number'}
              value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          {error && <p style={errorStyle}>{error}</p>}
          <button style={btnStyle} onClick={handleStep4} disabled={loading || !phone}>
            {loading ? '...' : (isES ? 'Enviar código →' : 'Send code →')}
          </button>
        </>)}

        {/* STEP 5 */}
        {step === 5 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Verifica tu WhatsApp' : 'Verify your WhatsApp'}
          </h2>
          <p style={bodyStyle}>
            {isES
              ? 'Enviamos un código de 6 dígitos a tu WhatsApp. Ingrésalo abajo.'
              : 'We sent a 6-digit code to your WhatsApp. Enter it below.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {verificationCode.map((digit, idx) => (
              <input
                key={idx}
                id={`code-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleCodeInput(e.target.value, idx)}
                onKeyDown={e => {
                  if (e.key === 'Backspace' && !digit && idx > 0) {
                    document.getElementById(`code-${idx - 1}`)?.focus();
                  }
                }}
                style={{
                  ...inputStyle,
                  width: 44,
                  textAlign: 'center',
                  fontSize: '1.4rem',
                  fontFamily: fonts.mono,
                  padding: '12px 0',
                }}
              />
            ))}
          </div>

          {error && (
            <p style={errorStyle}>
              {error}
              {codeExpired && (
                <> <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  style={inlineLinkStyle}
                >
                  {resendCooldown > 0
                    ? (isES ? `Reenviar en ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
                    : (isES ? 'Reenviar' : 'Resend')}
                </button></>
              )}
            </p>
          )}

          <button style={btnStyle} onClick={handleStep5} disabled={loading}>
            {loading ? '...' : (isES ? 'Verificar →' : 'Verify →')}
          </button>

          {!codeExpired && (
            <button
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              style={{
                background: 'none',
                border: 'none',
                color: resendCooldown > 0 ? colors.boneFaint : 'rgba(245, 242, 238,0.5)',
                fontSize: 13,
                cursor: (resendCooldown > 0 || loading) ? 'default' : 'pointer',
                padding: '4px 0',
              }}
            >
              {resendCooldown > 0
                ? (isES ? `Reenviar en ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
                : (isES ? 'Reenviar código' : 'Resend code')}
            </button>
          )}
        </>)}

      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────
const screenStyle: React.CSSProperties = {
  minHeight: '100vh',
  width: '100%',
  maxWidth: '100vw',
  background: colors.midnight,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  fontFamily: fonts.body,
  overflowX: 'hidden',
  paddingBottom: 40,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 430,
  padding: '32px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

const headingStyle: React.CSSProperties = {
  color: '#F5F2EE',
  fontSize: '1.5rem',
  fontWeight: 350,
  margin: 0,
  fontFamily: "'Fraunces', Georgia, serif",
};

const bodyStyle: React.CSSProperties = {
  color: colors.boneFaint,
  fontSize: '0.9rem',
  lineHeight: 1.55,
  margin: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: colors.midnightDeep,
  border: '1px solid rgba(245,242,238,0.12)',
  borderRadius: 12,
  padding: '14px 16px',
  color: '#F5F2EE',
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
  color: colors.midnight,
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: fonts.body,
};

const errorStyle: React.CSSProperties = {
  color: colors.amber,
  fontSize: '0.85rem',
  margin: 0,
};

const inlineLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(245, 242, 238,0.6)',
  fontSize: 'inherit',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  fontFamily: 'inherit',
};

const pillStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 8px',
  borderRadius: 10,
  border: active ? `1px solid ${colors.amber}` : '1px solid rgba(245, 242, 238,0.1)',
  background: active ? 'rgba(239, 159, 39,0.15)' : 'rgba(245, 242, 238,0.04)',
  color: active ? colors.amber : colors.boneFaint,
  fontSize: '0.88rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});
