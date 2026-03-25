import { Language, UI } from '../data/translations';

interface SettingsViewProps {
  lang: Language;
  isAdult: boolean;
  picardiaMode: boolean;
  onLangChange: (lang: Language) => void;
  onPicardiaToggle: () => void;
}

export function SettingsView({
  lang,
  isAdult,
  picardiaMode,
  onLangChange,
  onPicardiaToggle,
}: SettingsViewProps) {
  const t = UI[lang];

  return (
    <div className="fade-up py-2">
      <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-[14px] p-4 mb-3">
        <div className="text-[11px] font-bold text-[#4a5280] tracking-[1.5px] uppercase mb-1.5">
          {t.language}
        </div>
        <div className="flex gap-2">
          {(['en', 'es'] as Language[]).map((l) => (
            <button
              key={l}
              onClick={() => onLangChange(l)}
              className="border-none rounded-lg py-2 px-4 text-[13px] font-bold cursor-pointer font-[Georgia,serif]"
              style={{
                background: lang === l ? '#6366f1' : '#1a1a2e',
                color: lang === l ? '#fff' : '#6b7280',
              }}
            >
              {l === 'en' ? '🇺🇸 English' : '🇪🇸 Espanol'}
            </button>
          ))}
        </div>
      </div>

      {isAdult && (
        <div
          className="bg-[#0a0a14] border rounded-[14px] p-4 mb-3"
          style={{ borderColor: picardiaMode ? '#7c3aed44' : '#1a1a2e' }}
        >
          <div className="text-[11px] font-bold text-[#4a5280] tracking-[1.5px] uppercase mb-1.5">
            {t.picardiaModeLabel}
          </div>
          <div className="text-[13px] text-[#6b7280] leading-relaxed mb-2.5">
            {t.picardiaDescription}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onPicardiaToggle}
              className="border-none rounded-lg py-2 px-4 text-[13px] font-bold cursor-pointer font-[Georgia,serif]"
              style={{
                background: picardiaMode ? '#7c3aed' : '#1a1a2e',
                color: picardiaMode ? '#fff' : '#6b7280',
              }}
            >
              {picardiaMode ? t.picardiaOn : `${t.activate} 🌶️`}
            </button>
          </div>
          <div className="text-[11px] text-[#374151] italic mt-2">{t.picardiaWarning}</div>
        </div>
      )}

      {!isAdult && (
        <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-[14px] p-5 text-center">
          <div className="text-[28px] mb-2">🔒</div>
          <div className="text-[13px] text-[#6b7280] leading-relaxed">{t.under18Notice}</div>
        </div>
      )}

      {/* Legal links */}
      <div className="bg-[#0a0a14] border border-[#1a1a2e] rounded-[14px] p-4">
        <div className="text-[11px] font-bold text-[#4a5280] tracking-[1.5px] uppercase mb-3">
          {lang === 'en' ? 'Legal' : 'Legal'}
        </div>
        <div className="flex flex-col gap-2">
          <a
            href="/privacy"
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a3e] transition-colors"
          >
            <span className="text-[13px] text-[#c0c0d0]">
              {lang === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
            </span>
            <span className="text-[#4a5280] text-lg leading-none">›</span>
          </a>
          <a
            href="/terms"
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1a1a2e] hover:bg-[#2a2a3e] transition-colors"
          >
            <span className="text-[13px] text-[#c0c0d0]">
              {lang === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
            </span>
            <span className="text-[#4a5280] text-lg leading-none">›</span>
          </a>
        </div>
      </div>
    </div>
  );
}
