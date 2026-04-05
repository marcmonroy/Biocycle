import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  onComplete: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const COUNTRY_CODES = [
  { code: '+1', label: 'US/CA' },
  { code: '+44', label: 'UK' },
  { code: '+34', label: 'ES' },
  { code: '+52', label: 'MX' },
  { code: '+1809', label: 'DR' },
  { code: '+1829', label: 'DR' },
  { code: '+57', label: 'CO' },
  { code: '+54', label: 'AR' },
  { code: '+56', label: 'CL' },
  { code: '+58', label: 'VE' },
  { code: '+51', label: 'PE' },
  { code: '+55', label: 'BR' },
];

export function RegisterScreen({ onComplete }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2
  const [dob, setDob] = useState('');
  const [underAge, setUnderAge] = useState(false);

  // Step 3
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | 'nonbinary' | ''>('');
  const [language, setLanguage] = useState<'EN' | 'ES'>('EN');

  // Step 4
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');

  // Step 5
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [sentCode, setSentCode] = useState<string | null>(null);

  // Step 6
  const [cycleStartDate, setCycleStartDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isES = language === 'ES';
  const progress = (step / 6) * 100;

  // ── Step 1 ───────────────────────────────────────────────────────
  const handleStep1 = async () => {
    if (!email || !password) { setError('All fields required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError('');
    setLoading(true);
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    if (data.user) { setUserId(data.user.id); setStep(2); }
  };

  // ── Step 2 ───────────────────────────────────────────────────────
  const handleStep2 = async () => {
    if (!dob) { setError('Please enter your date of birth.'); return; }
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    if (age < 18) { setUnderAge(true); return; }
    setError('');
    setLoading(true);
    await supabase.from('profiles').update({
      date_of_birth: dob,
      age_verified: true,
    }).eq('id', userId);
    setLoading(false);
    setStep(3);
  };

  // ── Step 3 ───────────────────────────────────────────────────────
  const handleStep3 = async () => {
    if (!name || !gender) { setError('All fields required.'); return; }
    setError('');
    setLoading(true);
    await supabase.from('profiles').upsert({
      id: userId,
      nombre: name,
      gender,
      idioma: language,
    });
    setLoading(false);
    setStep(4);
  };

  // ── Step 4 ───────────────────────────────────────────────────────
  const handleStep4 = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 13) {
      setError(isES ? 'Número inválido.' : 'Invalid phone number.');
      return;
    }
    const fullPhone = `${countryCode}${digits}`;
    setError('');
    setLoading(true);

    // Check uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('whatsapp_phone', fullPhone)
      .neq('id', userId)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      setError(isES
        ? 'Este número de WhatsApp ya está asociado a una cuenta de BioCycle.'
        : 'This WhatsApp number is already associated with a BioCycle account.');
      return;
    }

    // Save phone to profile
    await supabase.from('profiles').update({ whatsapp_phone: fullPhone }).eq('id', userId);

    // Generate and send 6-digit code via Twilio
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);

    const teaserText = `Your BioCycle verification code is ${code}`;
    await fetch('/.netlify/functions/send-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: fullPhone, language, teaserText }),
    });

    setLoading(false);
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

  // ── Step 5 ───────────────────────────────────────────────────────
  const handleCodeInput = (val: string, idx: number) => {
    const d = val.replace(/\D/g, '').slice(0, 1);
    const next = [...verificationCode];
    next[idx] = d;
    setVerificationCode(next);
    // Auto-advance
    if (d && idx < 5) {
      const nextInput = document.getElementById(`code-${idx + 1}`);
      nextInput?.focus();
    }
  };

  const handleStep5 = async () => {
    const entered = verificationCode.join('');
    if (entered.length < 6) { setError('Enter all 6 digits.'); return; }
    if (entered !== sentCode) {
      setError(isES ? 'Código incorrecto. Intenta de nuevo.' : 'Incorrect code. Try again.');
      return;
    }
    setError('');
    setLoading(true);
    await supabase.from('profiles').update({ whatsapp_verified: true }).eq('id', userId);
    // Create user_state record
    await supabase.from('user_state').upsert({
      user_id: userId,
      state: 'active_trader',
    });
    setLoading(false);
    setStep(6);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setSentCode(code);
    const { data: profileData } = await supabase.from('profiles').select('whatsapp_phone').eq('id', userId).single();
    if (profileData?.whatsapp_phone) {
      const teaserText = `Your BioCycle verification code is ${code}`;
      await fetch('/.netlify/functions/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: profileData.whatsapp_phone, language, teaserText }),
      });
    }
    startResendCooldown();
  };

  // ── Step 6 ───────────────────────────────────────────────────────
  const handleStep6 = async () => {
    setLoading(true);
    if (gender === 'female' && cycleStartDate) {
      await supabase.from('profiles').update({ cycle_start_date: cycleStartDate }).eq('id', userId);
    }
    setLoading(false);
    onComplete();
  };

  // ── Under-age hard block ─────────────────────────────────────────
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
        <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#FF6B6B',
            borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
        <p style={{ color: '#4A5568', fontSize: 12, margin: '8px 0 0', letterSpacing: '0.08em' }}>
          {isES ? `Paso ${step} de 6` : `Step ${step} of 6`}
        </p>
      </div>

      <div style={cardStyle}>

        {/* STEP 1 */}
        {step === 1 && (<>
          <h2 style={headingStyle}>Create your account</h2>
          <input style={inputStyle} type="email" placeholder="Email address"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          <input style={inputStyle} type="password" placeholder="Password (min 8 chars)"
            value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
          {error && <p style={errorStyle}>{error}</p>}
          <button style={btnStyle} onClick={handleStep1} disabled={loading}>
            {loading ? '...' : 'Continue →'}
          </button>
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
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { val: 'female', label: isES ? 'Femenino' : 'Female' },
                { val: 'male', label: isES ? 'Masculino' : 'Male' },
                { val: 'nonbinary', label: isES ? 'No binario' : 'Non-binary' },
              ].map(opt => (
                <button key={opt.val} onClick={() => setGender(opt.val as typeof gender)}
                  style={pillStyle(gender === opt.val)}>{opt.label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ ...bodyStyle, margin: 0 }}>Language / Idioma</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['EN', 'ES'] as const).map(l => (
                <button key={l} onClick={() => setLanguage(l)}
                  style={pillStyle(language === l)}>{l === 'EN' ? 'English' : 'Español'}</button>
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
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '12px 0',
                }}
              />
            ))}
          </div>
          {error && <p style={errorStyle}>{error}</p>}
          <button style={btnStyle} onClick={handleStep5} disabled={loading}>
            {loading ? '...' : (isES ? 'Verificar →' : 'Verify →')}
          </button>
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: resendCooldown > 0 ? '#4A5568' : 'rgba(255,255,255,0.5)',
              fontSize: 13,
              cursor: resendCooldown > 0 ? 'default' : 'pointer',
              padding: '4px 0',
            }}
          >
            {resendCooldown > 0
              ? (isES ? `Reenviar en ${resendCooldown}s` : `Resend in ${resendCooldown}s`)
              : (isES ? 'Reenviar código' : 'Resend code')}
          </button>
        </>)}

        {/* STEP 6 */}
        {step === 6 && (<>
          <h2 style={headingStyle}>
            {isES ? 'Tu ciclo' : 'Your cycle'}
          </h2>
          {gender === 'female' ? (<>
            <p style={bodyStyle}>
              {isES
                ? '¿Cuándo comenzó tu último período?'
                : 'When did your last period start?'}
            </p>
            <input style={inputStyle} type="date" value={cycleStartDate}
              onChange={e => setCycleStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} />
          </>) : (
            <p style={bodyStyle}>
              {isES
                ? 'Jules rastreará tu ritmo hormonal diario automáticamente.'
                : 'Jules will track your daily hormonal rhythm automatically.'}
            </p>
          )}
          <button
            style={btnStyle}
            onClick={handleStep6}
            disabled={loading || (gender === 'female' && !cycleStartDate)}
          >
            {loading ? '...' : (isES ? 'Conoce a Jules →' : 'Meet Jules →')}
          </button>
        </>)}

      </div>
    </div>
  );
}

// ── Shared styles ────────────────────────────────────────────────────────
const screenStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0A0A1A',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  fontFamily: 'Inter, system-ui, sans-serif',
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
  color: 'white',
  fontSize: '1.4rem',
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

const pillStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '10px 8px',
  borderRadius: 10,
  border: active ? '1px solid #FF6B6B' : '1px solid rgba(255,255,255,0.1)',
  background: active ? 'rgba(255,107,107,0.15)' : 'rgba(255,255,255,0.04)',
  color: active ? '#FF6B6B' : '#4A5568',
  fontSize: '0.88rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
});
