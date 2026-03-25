import { useBioCycle } from '../hooks/useBioCycle';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { TodayView } from './TodayView';
import { LibraryView } from './LibraryView';
import { SettingsView } from './SettingsView';
import { PicardiaModal } from './PicardiaModal';
import '../styles/biocycle.css';

interface BioCycleProps {
  userAge?: number;
  userGender?: 'female' | 'male';
  userCycleDay?: number;
  userName?: string;
  defaultLang?: 'auto' | 'en' | 'es';
}

export function BioCycle({
  userAge = 25,
  userGender = 'female',
  userCycleDay = 14,
  userName = 'Sofia',
  defaultLang = 'auto',
}: BioCycleProps) {
  const {
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
    isAdult,
    displayCards,
    libraryCards,
    getContent,
    toggleFlip,
    handleShare,
    handlePicardiaToggle,
    confirmPicardia,
    cancelPicardia,
  } = useBioCycle({ userAge, userGender, userCycleDay, userName, defaultLang });

  return (
    <div className="font-[Georgia,'Palatino_Linotype',serif] bg-[#050508] text-[#c8d0e8] min-h-screen max-w-[500px] mx-auto flex flex-col">
      {showPicardiaPrompt && (
        <PicardiaModal lang={lang} onConfirm={confirmPicardia} onCancel={cancelPicardia} />
      )}

      <Header
        lang={lang}
        isAdult={isAdult}
        picardiaMode={picardiaMode}
        onPicardiaToggle={handlePicardiaToggle}
      />

      <Navigation lang={lang} view={view} onViewChange={setView} />

      <div className="flex-1 overflow-y-auto p-3.5 pb-20">
        {view === 'today' && (
          <TodayView
            lang={lang}
            cards={displayCards}
            activeCard={activeCard}
            flippedCards={flippedCards}
            sharedCards={sharedCards}
            isAdult={isAdult}
            picardiaMode={picardiaMode}
            userName={userName}
            getContent={getContent}
            onCardChange={setActiveCard}
            onFlip={toggleFlip}
            onShare={handleShare}
          />
        )}

        {view === 'library' && (
          <LibraryView
            lang={lang}
            cards={libraryCards}
            filterGender={filterGender}
            flippedCards={flippedCards}
            sharedCards={sharedCards}
            isAdult={isAdult}
            picardiaMode={picardiaMode}
            userName={userName}
            getContent={getContent}
            onFilterChange={setFilterGender}
            onFlip={toggleFlip}
            onShare={handleShare}
          />
        )}

        {view === 'settings' && (
          <SettingsView
            lang={lang}
            isAdult={isAdult}
            picardiaMode={picardiaMode}
            onLangChange={setLang}
            onPicardiaToggle={handlePicardiaToggle}
          />
        )}
      </div>
    </div>
  );
}
