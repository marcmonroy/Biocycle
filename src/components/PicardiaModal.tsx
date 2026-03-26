import { UI, Language } from '../data/translations';

interface PicardiaModalProps {
  lang: Language;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PicardiaModal({ lang, onConfirm, onCancel }: PicardiaModalProps) {
  const t = UI[lang] ?? UI.en;

  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-6">
      <div className="bg-[#0a0a14] border border-[#7c3aed44] rounded-[20px] p-7 max-w-[340px] w-full text-center modal-in">
        <div className="text-4xl mb-3">🌶️</div>
        <div className="text-xl font-black text-[#f0f4ff] mb-2">{t.picardiaModeLabel}</div>
        <div className="text-sm text-[#9ca3af] leading-relaxed mb-2">{t.picardiaDescription}</div>
        <div className="text-xs text-[#6b7280] italic mb-5">{t.picardiaWarning}</div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#1a1a2e] border-none rounded-[10px] py-3 text-[#6b7280] text-sm cursor-pointer font-[Georgia,serif]"
          >
            {t.noThanks}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-gradient-to-br from-[#7c3aed] to-[#c026d3] border-none rounded-[10px] py-3 text-white text-sm font-bold cursor-pointer font-[Georgia,serif]"
          >
            {t.activate} 🌶️
          </button>
        </div>
      </div>
    </div>
  );
}
