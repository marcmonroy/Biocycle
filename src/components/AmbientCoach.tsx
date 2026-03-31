import { useState } from 'react';
import { Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { MessageCircle, Loader2 } from 'lucide-react';
import { computeAdhocGreeting } from '../utils/greetingUtils';
import { speakWithElevenLabs } from '../services/voiceService';

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
  profile,
  currentScreen,
  onNavigate,
}: AmbientCoachProps) {
  const [loading, setLoading] = useState(false);

  // Hide when already on the coach screen
  if (currentScreen === 'coach') return null;

  const handleTap = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const greeting = await computeAdhocGreeting(profile);
      sessionStorage.setItem('biocycle_adhoc_greeting', greeting);
      // Start speaking immediately so audio begins during navigation animation.
      // CoachScreen checks this flag and skips re-speaking.
      sessionStorage.setItem('biocycle_adhoc_greeting_spoken', 'true');
      speakWithElevenLabs(greeting, profile.idioma, profile.picardia_mode ?? false);
    } catch {
      sessionStorage.removeItem('biocycle_adhoc_greeting');
      sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
    }
    setLoading(false);
    onNavigate('coach');
  };

  return (
    <button
      onClick={handleTap}
      disabled={loading}
      className="fixed bottom-28 right-4 w-14 h-14 rounded-full bg-[#2D1B69] shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-all disabled:opacity-70"
      aria-label="Open coach"
    >
      {loading
        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
        : <MessageCircle className="w-6 h-6 text-white" />}
    </button>
  );
}
