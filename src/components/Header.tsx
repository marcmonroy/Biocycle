import { UI, Language } from '../data/translations';

interface HeaderProps {
  lang: Language;
  isAdult: boolean;
  picardiaMode: boolean;
  onPicardiaToggle: () => void;
}

export function Header({ lang, isAdult, picardiaMode, onPicardiaToggle }: HeaderProps) {
  const t = UI[lang];

  return (
    <div className="flex justify-between items-center px-4 pt-4 pb-2.5 border-b border-[#1a1a2e]">
      <div>
        <div
          className="font-black text-xl -tracking-[0.5px]"
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t.appName}
        </div>
        <div className="text-[11px] text-[#4a5280] italic mt-0.5">{t.tagline}</div>
      </div>
      <div className="flex items-center gap-2">
        {isAdult && (
          <button
            onClick={onPicardiaToggle}
            className="text-[11px] font-bold border rounded-full py-1 px-3 cursor-pointer font-[Georgia,serif] tracking-wider"
            style={{
              background: picardiaMode ? '#7c3aed22' : '#1a1a2e',
              borderColor: picardiaMode ? '#7c3aed' : '#374151',
              color: picardiaMode ? '#c084fc' : '#6b7280',
            }}
          >
            {picardiaMode ? t.picardiaOn : t.picardiaOff}
          </button>
        )}
        {!isAdult && (
          <div className="text-[11px] text-[#374151] bg-[#1a1a2e] rounded-full py-1 px-2.5">
            🔒 {lang === 'es' ? '-18' : 'U18'}
          </div>
        )}
      </div>
    </div>
  );
}
