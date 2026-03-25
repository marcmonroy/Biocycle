import { useState, useCallback } from 'react';
import { CARDS, CardData } from '../data/cards';
import { UI, Language } from '../data/translations';
import { captureCardAsImage } from '../utils/cardImageCapture';

interface UseBioCycleProps {
  userAge?: number;
  userGender?: 'female' | 'male';
  userCycleDay?: number;
  userName?: string;
  defaultLang?: 'auto' | Language;
}

export function useBioCycle({
  userAge = 25,
  userGender = 'female',
  userCycleDay = 14,
  userName = 'Sofia',
  defaultLang = 'auto',
}: UseBioCycleProps = {}) {
  const detectLang = useCallback((): Language => {
    if (defaultLang !== 'auto') return defaultLang;
    const browserLang = navigator.language?.toLowerCase() || 'en';
    return browserLang.startsWith('es') ? 'es' : 'en';
  }, [defaultLang]);

  const [lang, setLang] = useState<Language>(detectLang);
  const [picardiaMode, setPicardiaMode] = useState(false);
  const [showPicardiaPrompt, setShowPicardiaPrompt] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [sharedCards, setSharedCards] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<'today' | 'library' | 'settings'>('today');
  const [filterGender, setFilterGender] = useState<'all' | 'female' | 'male'>('all');

  const t = UI[lang];
  const isAdult = userAge >= 18;
  const hour = new Date().getHours();
  const dow = new Date().getDay();

  const todayCards = CARDS.filter((card) => {
    if (card.gender !== 'both' && card.gender !== userGender) return false;
    if (card.trigger.cycleDay)
      return userCycleDay >= card.trigger.cycleDay[0] && userCycleDay <= card.trigger.cycleDay[1];
    if (card.trigger.hours) return hour >= card.trigger.hours[0] && hour < card.trigger.hours[1];
    if (card.trigger.dayOfWeek) return card.trigger.dayOfWeek.includes(dow);
    return false;
  });

  const displayCards = todayCards.length > 0 ? todayCards : [CARDS[0]];

  const libraryCards = CARDS.filter(
    (c) => filterGender === 'all' || c.gender === filterGender || c.gender === 'both'
  );

  const getContent = useCallback(
    (card: CardData) => {
      const mode = isAdult && picardiaMode ? 'picardia' : 'clean';
      return card[mode]?.[lang] || card.clean.en;
    },
    [isAdult, picardiaMode, lang]
  );

  const toggleFlip = useCallback((id: string) => {
    setFlippedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleShare = useCallback(
    async (card: CardData) => {
      const content = getContent(card);
      const bannerText = card.bannerFeeling?.[lang]?.replace('{name}', userName) || '';
      const text = `${bannerText}\n\n${content.headline}\n\nbiocycle.app`;

      setSharedCards((prev) => ({ ...prev, [card.id]: true }));

      try {
        const imageFile = await captureCardAsImage({ card, content, userName, lang });

        if (imageFile && navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({
            title: 'BioCycle',
            text,
            files: [imageFile],
          });
        } else if (navigator.share) {
          await navigator.share({ title: 'BioCycle', text, url: 'https://biocycle.app' });
        } else {
          navigator.clipboard?.writeText(text);
        }
      } catch {
        if (navigator.share) {
          navigator.share({ title: 'BioCycle', text, url: 'https://biocycle.app' }).catch(() => {});
        } else {
          navigator.clipboard?.writeText(text);
        }
      }

      setTimeout(() => setSharedCards((prev) => ({ ...prev, [card.id]: false })), 2000);
    },
    [getContent, lang, userName]
  );

  const handlePicardiaToggle = useCallback(() => {
    if (!picardiaMode) {
      setShowPicardiaPrompt(true);
    } else {
      setPicardiaMode(false);
    }
  }, [picardiaMode]);

  const confirmPicardia = useCallback(() => {
    setPicardiaMode(true);
    setShowPicardiaPrompt(false);
  }, []);

  const cancelPicardia = useCallback(() => {
    setShowPicardiaPrompt(false);
  }, []);

  return {
    lang,
    setLang,
    picardiaMode,
    showPicardiaPrompt,
    activeCard,
    setActiveCard,
    flippedCards,
    sharedCards,
    view,
    setView,
    filterGender,
    setFilterGender,
    t,
    isAdult,
    displayCards,
    libraryCards,
    getContent,
    toggleFlip,
    handleShare,
    handlePicardiaToggle,
    confirmPicardia,
    cancelPicardia,
  };
}
