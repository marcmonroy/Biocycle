import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { colors, fonts } from '../lib/tokens';

interface Props {
  onDone: () => void;
}

export function ResetPasswordForm({ onDone }: Props) {
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  async function handleSubmit() {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(onDone, 1800);
  }

  const inputStyle = {
    width: '100%',
    background: colors.midnightDeep,
    border: `1px solid ${colors.surfaceBorderHi}`,
    borderRadius: 10,
    padding: '14px 16px',
    color: colors.bone,
    fontSize: 15,
    fontFamily: fonts.body,
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 12,
  };

  if (success) {
    return (
      <p style={{ color: colors.success, fontSize: 15, textAlign: 'center' }}>
        ✓ Password updated. Taking you to sign in…
      </p>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 360 }}>
      <input
        type="password"
        placeholder="New password (min 8 chars)"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle}
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        style={inputStyle}
      />
      {error && (
        <p style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%',
          background: colors.amber,
          border: 'none',
          borderRadius: 12,
          padding: '16px',
          color: colors.midnight,
          fontSize: 15,
          fontWeight: 500,
          fontFamily: fonts.body,
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'Updating…' : 'Set new password →'}
      </button>
    </div>
  );
}
