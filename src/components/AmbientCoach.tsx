import { useState } from 'react';
import { Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { computeAdhocGreeting } from '../utils/greetingUtils';
import { cancelSpeech } from '../services/voiceService';
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

  // When the coach screen is active: cancel any in-progress speech and render nothing.
  if (currentScreen === 'coach') {
    cancelSpeech();
    return null;
  }

  const handleTap = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const greeting = await computeAdhocGreeting(profile);
      // Store greeting for CoachScreen to display and speak.
      // Do NOT start speaking here — CoachScreen owns the voice for its session.
      sessionStorage.setItem('biocycle_adhoc_greeting', greeting);
      sessionStorage.removeItem('biocycle_adhoc_greeting_spoken');
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
