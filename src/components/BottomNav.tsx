export type Tab = 'home' | 'coach' | 'data' | 'profile';

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; labelES: string; icon: string }[] = [
  { id: 'home',    label: 'Home',    labelES: 'Inicio',  icon: '⌂' },
  { id: 'coach',   label: 'Coach',   labelES: 'Coach',   icon: '◎' },
  { id: 'data',    label: 'Data',    labelES: 'Datos',   icon: '▦' },
  { id: 'profile', label: 'Profile', labelES: 'Perfil',  icon: '◯' },
];

export function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: '#0A0A1A',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      display: 'flex',
      zIndex: 40,
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
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
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#FF6B6B' : '#4A5568',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
