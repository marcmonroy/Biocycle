export type Tab = 'home' | 'forecast' | 'coach' | 'circle' | 'earnings';

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  idioma?: 'EN' | 'ES';
}

const tabs: { id: Tab; label: string; labelES: string; icon: string }[] = [
  { id: 'home',     label: 'Home',        labelES: 'Inicio',      icon: '⌂' },
  { id: 'forecast', label: 'Forecast',    labelES: 'Pronóstico',  icon: '◐' },
  { id: 'coach',    label: 'Coach',       labelES: 'Coach',       icon: '◎' },
  { id: 'circle',   label: 'Your Circle', labelES: 'Tu Círculo',  icon: '⚭' },
  { id: 'earnings', label: 'Data Value', labelES: 'Valor Datos', icon: '$' },
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
      background: '#0D0D1F',
      borderTop: '1px solid rgba(255,255,255,0.12)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 64,
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
              height: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#FF6B6B' : '#8A9BB0',
              transition: 'color 0.15s',
              padding: '0 2px',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: 9,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
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
