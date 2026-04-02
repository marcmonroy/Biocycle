import { useState } from 'react';
import { Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { computeAdhocGreeting } from '../utils/greetingUtils';
import { speakWithElevenLabs } from '../services/voiceService';
import { QuantumDNA } from './QuantumDNA';

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
      className="fixed bottom-28 right-4 z-40 rounded-full overflow-hidden hover:scale-105 transition-transform disabled:opacity-70"
      style={{ width: 64, height: 64, padding: 0, background: 'none', border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}
      aria-label="Open coach"
    >
      <QuantumDNA size={64} state={loading ? 'thinking' : 'idle'} />
    </button>
  );
}
