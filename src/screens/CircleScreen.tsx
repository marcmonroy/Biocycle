import type { Profile } from '../lib/supabase';

interface Props {
  profile: Profile;
}

export function CircleScreen({ profile }: Props) {
  const idioma = profile.idioma ?? 'EN';
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}>
        {idioma === 'ES' ? 'CÍRCULO — PRÓXIMAMENTE' : 'CIRCLE — COMING SOON'}
      </div>
    </div>
  );
}
