import { Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { MessageCircle } from 'lucide-react';

interface AmbientCoachProps {
  profile: Profile;
  phaseData: PhaseData;
  forecast: ForecastDay[];
  currentScreen: string;
  lastCheckinData?: {
    lowestDimension: string;
    lowestScore: number;
  } | null;
  recentAnxiety: number | null;
  onNavigate: (screen: string) => void;
}

export function AmbientCoach({
  currentScreen,
  onNavigate,
}: AmbientCoachProps) {
  // Hide when already on the coach screen
  if (currentScreen === 'coach') {
    return null;
  }

  return (
    <button
      onClick={() => onNavigate('coach')}
      className="fixed bottom-28 right-4 w-14 h-14 rounded-full bg-[#2D1B69] shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-all"
      aria-label="Open coach"
    >
      <MessageCircle className="w-6 h-6 text-white" />
    </button>
  );
}
