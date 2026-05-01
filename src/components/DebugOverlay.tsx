import { useEffect, useState } from 'react';
import { fonts } from '../lib/tokens';

interface DebugData {
  screen?: string;
  coachState?: string;
  slot?: string;
  daysOfData?: number;
  onboardingComplete?: boolean;
  isGap?: boolean;
  inputUI?: string;
  lastError?: string;
  hour?: number;
  picardia?: boolean;
  idioma?: string;
}

// Global debug store — any component can write to this
export const debugStore: DebugData = {};

export function setDebug(key: keyof DebugData, value: unknown) {
  (debugStore as Record<string, unknown>)[key] = value;
  window.dispatchEvent(new Event('biocycle-debug-update'));
}

export function DebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<DebugData>({});

  useEffect(() => {
    // Only show if ?debug=true in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('debug') === 'true') setVisible(true);

    const handler = () => setData({ ...debugStore });
    window.addEventListener('biocycle-debug-update', handler);
    return () => window.removeEventListener('biocycle-debug-update', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 8,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.85)',
      border: '1px solid #FFD93D',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: 11,
      fontFamily: fonts.mono,
      color: '#FFD93D',
      maxWidth: 260,
      pointerEvents: 'none',
    }}>
      <div style={{ color: '#00C896', fontWeight: 'bold', marginBottom: 4 }}>
        ⚙ BIOCYCLE DEBUG
      </div>
      {Object.entries(data).map(([k, v]) => (
        <div key={k}>
          <span style={{ color: '#7B61FF' }}>{k}:</span>{' '}
          <span style={{ color: v === false || v === null || v === undefined ? '#FF6B6B' : '#fff' }}>
            {String(v ?? '—')}
          </span>
        </div>
      ))}
    </div>
  );
}
