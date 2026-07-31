import React from 'react';
import { colors, fonts } from '../lib/tokens';

export type Tab = 'home' | 'forecast' | 'coach' | 'circle' | 'compatibility' | 'earnings';

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  idioma?: 'EN' | 'ES';
}

const tabs: { id: Tab; label: string; labelES: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'home', label: 'Today', labelES: 'Hoy',
    icon: (a) => (<svg width="24" height="24" viewBox="0 0 26 26"><circle cx="13" cy="13" r="9" fill={a ? '#e0b23a' : '#aab2c5'} /></svg>),
  },
  {
    id: 'forecast', label: 'Tomorrow', labelES: 'Mañana',
    icon: (a) => { const c = a ? '#e0b23a' : '#aab2c5'; return (<svg width="24" height="24" viewBox="0 0 26 26"><circle cx="8" cy="8" r="3" fill={c} /><circle cx="18" cy="8" r="3" fill={c} /><circle cx="8" cy="18" r="3" fill={c} /><circle cx="18" cy="18" r="3" fill={c} /></svg>); },
  },
  {
    id: 'coach', label: 'Coach', labelES: 'Coach',
    icon: (a) => { const c = a ? '#e0b23a' : '#aab2c5'; return (<svg width="24" height="24" viewBox="0 0 26 26"><circle cx="13" cy="13" r="9" fill="none" stroke={c} strokeWidth="2.5" /><circle cx="13" cy="13" r="3.5" fill={c} /></svg>); },
  },
  {
    id: 'circle', label: 'Círculo', labelES: 'Círculo',
    icon: (a) => { const c = a ? '#e0b23a' : '#aab2c5'; return (<svg width="24" height="24" viewBox="0 0 26 26"><circle cx="13" cy="13" r="4" fill={c} /><circle cx="13" cy="4" r="2.2" fill={c} /><circle cx="22" cy="15" r="2.2" fill={c} /><circle cx="5" cy="17" r="2.2" fill={c} /></svg>); },
  },
  {
    id: 'compatibility', label: 'Compat.', labelES: 'Compatib.',
    icon: (a) => { const c = a ? '#e0b23a' : '#aab2c5'; return (<svg width="24" height="24" viewBox="0 0 26 26"><circle cx="9" cy="13" r="5.5" fill="none" stroke={c} strokeWidth="2.5" /><circle cx="17" cy="13" r="5.5" fill="none" stroke={c} strokeWidth="2.5" /></svg>); },
  },
];

export function BottomNav({ active, onNavigate, idioma = 'EN' }: Props) {
  return (
    <nav style={{
      width: '100%',
      maxWidth: 430,
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      background: colors.midnightDeep,
      borderTop: `1px solid ${colors.surfaceBorderHi}`,
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 72,
      zIndex: 100,
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const label = idioma === 'ES' ? tab.labelES : tab.label;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: 64,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? colors.amber : colors.boneFaint,
              transition: 'color 0.15s',
              padding: '0 2px',
            }}
          >
            <span style={{ lineHeight: 1, display: 'flex' }}>{tab.icon(isActive)}</span>
            <span style={{
              fontSize: 10,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: fonts.body,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
