import { UI, Language } from '../data/translations';

type ViewType = 'today' | 'library' | 'settings';

interface NavigationProps {
  lang: Language;
  view: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Navigation({ lang, view, onViewChange }: NavigationProps) {
  const t = UI[lang];

  const navItems: { key: ViewType; label: string }[] = [
    { key: 'today', label: `🎴 ${t.today}` },
    { key: 'library', label: `📚 ${t.library}` },
    { key: 'settings', label: t.settings },
  ];

  return (
    <div className="flex border-b border-[#1a1a2e]">
      {navItems.map((item) => (
        <button
          key={item.key}
          onClick={() => onViewChange(item.key)}
          className={`flex-1 bg-transparent border-none border-b-2 py-2.5 text-[11px] font-bold cursor-pointer font-[Georgia,serif] ${
            view === item.key
              ? 'text-[#f0f4ff] border-b-[#f59e0b]'
              : 'text-[#4a5280] border-b-transparent'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
