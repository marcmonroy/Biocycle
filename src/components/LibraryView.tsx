import { CardData, CardContent } from '../data/cards';
import { Language, UI } from '../data/translations';
import { BioCycleCard } from './BioCycleCard';

type FilterGender = 'all' | 'female' | 'male';

interface LibraryViewProps {
  lang: Language;
  cards: CardData[];
  filterGender: FilterGender;
  flippedCards: Record<string, boolean>;
  sharedCards: Record<string, boolean>;
  isAdult: boolean;
  picardiaMode: boolean;
  userName: string;
  getContent: (card: CardData) => CardContent;
  onFilterChange: (filter: FilterGender) => void;
  onFlip: (id: string) => void;
  onShare: (card: CardData) => void;
}

export function LibraryView({
  lang,
  cards,
  filterGender,
  flippedCards,
  sharedCards,
  isAdult,
  picardiaMode,
  userName,
  getContent,
  onFilterChange,
  onFlip,
  onShare,
}: LibraryViewProps) {
  const t = UI[lang] ?? UI.en;

  const filters: { key: FilterGender; label: string }[] = [
    { key: 'all', label: t.allCards },
    { key: 'female', label: t.femaleCards },
    { key: 'male', label: t.maleCards },
  ];

  return (
    <div className="fade-up">
      <div className="flex gap-2 mb-3.5">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onFilterChange(filter.key)}
            className="border-none rounded-full py-1.5 px-4 text-xs font-bold cursor-pointer font-[Georgia,serif]"
            style={{
              background: filterGender === filter.key ? '#f0f4ff' : '#0a0a14',
              color: filterGender === filter.key ? '#050508' : '#6b7280',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {cards.map((card) => (
        <div key={card.id} className="mb-4">
          <BioCycleCard
            card={card}
            isFlipped={flippedCards[card.id] || false}
            isShared={sharedCards[card.id] || false}
            content={getContent(card)}
            lang={lang}
            isAdult={isAdult}
            picardiaMode={picardiaMode}
            userName={userName}
            onFlip={() => onFlip(card.id)}
            onShare={() => onShare(card)}
          />
        </div>
      ))}
    </div>
  );
}
