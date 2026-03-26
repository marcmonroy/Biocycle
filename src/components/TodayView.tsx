import { CardData, CardContent } from '../data/cards';
import { Language, UI } from '../data/translations';
import { BioCycleCard } from './BioCycleCard';

interface TodayViewProps {
  lang: Language;
  cards: CardData[];
  activeCard: number;
  flippedCards: Record<string, boolean>;
  sharedCards: Record<string, boolean>;
  isAdult: boolean;
  picardiaMode: boolean;
  userName: string;
  getContent: (card: CardData) => CardContent;
  onCardChange: (index: number) => void;
  onFlip: (id: string) => void;
  onShare: (card: CardData) => void;
}

export function TodayView({
  lang,
  cards,
  activeCard,
  flippedCards,
  sharedCards,
  isAdult,
  picardiaMode,
  userName,
  getContent,
  onCardChange,
  onFlip,
  onShare,
}: TodayViewProps) {
  const t = UI[lang] ?? UI.en;
  const currentCard = cards[activeCard] || cards[0];

  return (
    <div className="fade-up">
      <div className="mb-3">
        <div className="text-lg font-black text-[#f0f4ff] -tracking-[0.5px]">{t.todaysCards}</div>
        <div className="text-xs text-[#4a5280] mt-0.5">
          {cards.length} {t.cardsFor}
        </div>
      </div>

      {cards.length > 1 && (
        <div className="flex gap-1.5 justify-center mb-3">
          {cards.map((_, i) => (
            <div
              key={i}
              onClick={() => onCardChange(i)}
              className="h-1.5 rounded-full cursor-pointer transition-all duration-300"
              style={{
                background: i === activeCard ? '#f0f4ff' : '#374151',
                width: i === activeCard ? 20 : 6,
              }}
            />
          ))}
        </div>
      )}

      <BioCycleCard
        card={currentCard}
        isToday
        isFlipped={flippedCards[currentCard.id] || false}
        isShared={sharedCards[currentCard.id] || false}
        content={getContent(currentCard)}
        lang={lang}
        isAdult={isAdult}
        picardiaMode={picardiaMode}
        userName={userName}
        onFlip={() => onFlip(currentCard.id)}
        onShare={() => onShare(currentCard)}
      />

      {cards.length > 1 && (
        <div className="flex justify-between items-center pt-2.5">
          <button
            onClick={() => onCardChange(Math.max(0, activeCard - 1))}
            disabled={activeCard === 0}
            className="bg-transparent border border-[#1a1a2e] rounded-lg py-2 px-3.5 text-[#6b7280] text-xs cursor-pointer font-[Georgia,serif] disabled:opacity-50"
          >
            {t.prev}
          </button>
          <span className="text-xs text-[#4a5280]">
            {activeCard + 1} / {cards.length}
          </span>
          <button
            onClick={() => onCardChange(Math.min(cards.length - 1, activeCard + 1))}
            disabled={activeCard === cards.length - 1}
            className="bg-transparent border border-[#1a1a2e] rounded-lg py-2 px-3.5 text-[#6b7280] text-xs cursor-pointer font-[Georgia,serif] disabled:opacity-50"
          >
            {t.next}
          </button>
        </div>
      )}
    </div>
  );
}
