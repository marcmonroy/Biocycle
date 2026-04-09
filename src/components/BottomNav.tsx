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
      width: '100%',
      maxWidth: '100vw',
      background: '#0D0D1F',
      borderTop: '1px solid rgba(255,255,255,0.12)',
      display: 'flex',
      zIndex: 40,
      padding: '0 16px env(safe-area-inset-bottom) 16px',
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
              height: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#FF6B6B' : '#8A9BB0',
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
