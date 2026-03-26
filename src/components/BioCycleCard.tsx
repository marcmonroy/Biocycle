import { CardData, CardContent } from '../data/cards';
import { UI, Language } from '../data/translations';

interface BioCycleCardProps {
  card: CardData;
  isToday?: boolean;
  isFlipped: boolean;
  isShared: boolean;
  content: CardContent;
  lang: Language;
  isAdult: boolean;
  picardiaMode: boolean;
  userName: string;
  onFlip: () => void;
  onShare: () => void;
}

export function BioCycleCard({
  card,
  isToday,
  isFlipped,
  isShared,
  content,
  lang,
  isAdult,
  picardiaMode,
  userName,
  onFlip,
  onShare,
}: BioCycleCardProps) {
  const t = UI[lang] ?? UI.en;
  const bannerText = card.bannerFeeling?.[lang]?.replace('{name}', userName) || '';

  return (
    <div
      className="w-full mb-2 cursor-pointer"
      style={{ perspective: 1000 }}
      onClick={onFlip}
    >
      <div
        className="relative w-full min-h-[620px] transition-transform duration-600"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0)',
          transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div
          className="absolute w-full min-h-[620px] rounded-[20px] p-5 pb-4 flex flex-col gap-3"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: card.gradient,
          }}
        >
          {isToday && (
            <div className="absolute -top-2.5 left-5 bg-white text-[#050508] text-[9px] font-black tracking-[2px] py-[3px] px-2.5 rounded-full">
              {lang === 'es' ? 'HOY' : 'TODAY'}
            </div>
          )}
          <div
            className="self-start text-[10px] font-bold rounded-full py-1 px-3 tracking-wider mt-2 flex items-center gap-1.5"
            style={{
              background: card.accentColor + '33',
              color: card.accentColor,
            }}
          >
            {card.badge[lang]}
            {isAdult && picardiaMode && <span className="text-xs">🌶️</span>}
          </div>
          {card.image ? (
            <div className="w-full relative rounded-[12px] overflow-hidden" style={{ paddingBottom: '100%' }}>
              <img
                src={card.image}
                alt={card.visual[lang]}
                className="absolute top-0 left-0 w-full h-full object-cover object-center"
              />
              {bannerText && (
                <div
                  className="absolute bottom-0 left-0 right-0 py-2.5 px-3 text-white font-bold text-[16px] text-center"
                  style={{ backgroundColor: card.accentColor + 'CC' }}
                >
                  {bannerText}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-black/25 rounded-[14px] py-3.5 px-3 text-center">
              <div className="text-4xl mb-1.5 tracking-wider">{card.scene}</div>
              <div className="text-[11px] text-white/55 italic leading-relaxed">
                {card.visual[lang]}
              </div>
            </div>
          )}
          <div
            className="text-[21px] font-black text-white leading-tight -tracking-[0.5px]"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
          >
            {content.headline}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {content.copy.split('\n\n').map((p, i) => (
              <p key={i} className="text-sm text-white/90 leading-relaxed m-0">
                {p}
              </p>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/15 mt-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="bg-white/20 border border-white/30 rounded-full py-1.5 px-3.5 text-white text-xs font-bold cursor-pointer font-[Georgia,serif]"
            >
              {isShared ? t.copied : t.shareCard}
            </button>
            <span className="text-[11px] text-white/45 italic">{t.tapToFlip}</span>
          </div>
        </div>

        <div
          className="absolute w-full min-h-[620px] rounded-[20px] p-5 pb-4 flex flex-col gap-3"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: card.darkBg,
            border: `2px solid ${card.accentColor}33`,
          }}
        >
          <div
            className="text-[11px] font-bold tracking-[1.5px] mt-2"
            style={{ color: card.accentColor }}
          >
            {t.theScience}
          </div>
          {card.image ? (
            <div className="w-full relative rounded-[12px] overflow-hidden" style={{ paddingBottom: '100%' }}>
              <img
                src={card.image}
                alt={card.visual[lang]}
                className="absolute top-0 left-0 w-full h-full object-cover object-center opacity-60"
              />
            </div>
          ) : (
            <div className="text-3xl tracking-wider text-center">{card.scene}</div>
          )}
          <div className="text-[15px] font-extrabold text-[#f0f4ff] leading-snug italic">
            {content.headline}
          </div>
          <div className="text-[13px] text-[#9ca3af] leading-relaxed flex-1">
            {content.science}
          </div>
          <div className="flex items-center gap-2 text-sm">
            {'🔥'.repeat(card.shareability)}
            <span className="text-[11px] text-[#4a5280]">{t.viralPotential}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#1a1a2e]">
            <span className="text-[11px] italic" style={{ color: card.accentColor }}>
              {t.tapBack}
            </span>
            <span className="text-xs text-[#374151]">🧬 BioCycle</span>
          </div>
        </div>
      </div>
    </div>
  );
}
