import { useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { MessageCircle, Loader2 } from 'lucide-react';

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

// Scheduled slot definitions matching DEFAULT_CHECKIN_TIMES
const SCHEDULED_SLOTS = [
  { key: 'morning',   hour: 7,  minute: 30, labelEn: 'morning',   labelEs: 'mañana' },
  { key: 'afternoon', hour: 14, minute: 0,  labelEn: 'afternoon', labelEs: 'tarde'  },
  { key: 'night',     hour: 21, minute: 30, labelEn: 'night',     labelEs: 'noche'  },
] as const;

function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function computeAdhocGreeting(profile: Profile): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const name = profile.nombre ?? 'friend';
  const isSpanish = profile.idioma === 'ES';
  const isSienna = profile.picardia_mode === true;

  // Fetch today's completed session slots
  const { data } = await supabase
    .from('conversation_sessions')
    .select('time_slot')
    .eq('user_id', profile.id)
    .eq('session_date', today)
    .eq('session_complete', true);

  const completedSlots = new Set((data ?? []).map((s: { time_slot: string }) => s.time_slot));

  // All three done?
  const allDone = SCHEDULED_SLOTS.every(s => completedSlots.has(s.key));

  // First missed slot (time has passed, not completed)
  const firstMissed = SCHEDULED_SLOTS.find(s => {
    const slotMin = s.hour * 60 + s.minute;
    return nowMinutes > slotMin && !completedSlots.has(s.key);
  });

  // Next upcoming slot within 2 hours
  const nextUpcoming = SCHEDULED_SLOTS.find(s => {
    const slotMin = s.hour * 60 + s.minute;
    const diff = slotMin - nowMinutes;
    return diff > 0 && diff <= 120 && !completedSlots.has(s.key);
  });

  if (allDone) {
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. Todos los depósitos hechos. ¿Qué necesitas?`
        : `Hey ${name}. All deposits done. What do you need?`;
    }
    return isSpanish
      ? `Hola ${name}. Ya completaste tus tres depósitos de hoy. ¿Hay algo en lo que pueda ayudarte?`
      : `Hi ${name}. You have completed all three deposits today. Is there something on your mind?`;
  }

  if (firstMissed) {
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. Te saltaste el depósito de ${firstMissed.labelEs}. ¿Lo registramos ahora?`
        : `Hey ${name}. You skipped the ${firstMissed.labelEn} deposit. Want to catch it now?`;
    }
    return isSpanish
      ? `Hola ${name}. Te perdiste tu depósito de ${firstMissed.labelEs}. ¿Quieres registrarlo ahora?`
      : `Hi ${name}. You missed your ${firstMissed.labelEn} deposit. Want to log it now?`;
  }

  if (nextUpcoming) {
    const timeStr = padTime(nextUpcoming.hour, nextUpcoming.minute);
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. Próximo depósito a las ${timeStr}. ¿Qué está pasando?`
        : `Hey ${name}. Next deposit at ${timeStr}. What is going on?`;
    }
    return isSpanish
      ? `Hola ${name}. Tu próximo depósito es a las ${timeStr}. ¿Quieres hablar de algo antes?`
      : `Hi ${name}. Your next deposit is at ${timeStr}. Anything you want to talk about before then?`;
  }

  // Default: between sessions, nothing pending
  if (isSienna) {
    return isSpanish
      ? `Hola ${name}. Todo al día. ¿Qué necesitas?`
      : `Hey ${name}. All caught up. What do you need?`;
  }
  return isSpanish
    ? `Hola ${name}. Todo al día. ¿Qué tienes en mente?`
    : `Hi ${name}. All caught up. What is on your mind?`;
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
    } catch {
      // On error fall back to CoachScreen's generic greeting
      sessionStorage.removeItem('biocycle_adhoc_greeting');
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
