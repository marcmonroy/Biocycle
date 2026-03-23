import { useState, useEffect, useRef } from 'react';
import { Profile } from '../lib/supabase';
import { PhaseData, ForecastDay } from '../utils/phaseEngine';
import { MessageCircle, X, Send, Loader2, AlertCircle } from 'lucide-react';
import { callCoachAPI, getMessageCount, incrementMessageCount, getPhaseNames } from '../screens/CoachScreen';

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
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
};

const MONTHLY_LIMIT = 30;
const SESSION_KEY = 'biocycle_ambient_session';

function getSessionFlags(): Record<string, boolean> {
  const stored = sessionStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : {};
}

function setSessionFlag(key: string) {
  const flags = getSessionFlags();
  flags[key] = true;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(flags));
}

function hasShownContextual(key: string): boolean {
  return getSessionFlags()[key] === true;
}

export function AmbientCoach({
  profile,
  phaseData,
  forecast,
  currentScreen,
  lastCheckinData,
  recentAnxiety,
}: AmbientCoachProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(getMessageCount());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const isLimitReached = messageCount >= MONTHLY_LIMIT;

  const upcomingHighAnxiety = forecast.slice(1, 3).find(day => day.anxiety >= 70);
  const hoursUntilHighAnxiety = upcomingHighAnxiety
    ? Math.round((upcomingHighAnxiety.date.getTime() - new Date().getTime()) / (1000 * 60 * 60))
    : null;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      generateContextualOpener();
    }
  }, [isOpen]);

  const generateContextualOpener = () => {
    let contextualMessage = '';
    const phaseName = phaseNames[phaseData.phase] || phaseData.phase;

    if (currentScreen === 'home' && !hasShownContextual('home_phase')) {
      const phaseDescEs: Record<string, string> = {
        menstrual: 'Tu cuerpo esta en modo de descanso y regeneracion.',
        follicular: 'Tu energia esta en aumento y tu mente esta aguda.',
        ovulatory: 'Estas en tu pico de energia y carisma social.',
        luteal: 'Es momento de introspección y completar proyectos.',
        weekly_peak: 'Tu testosterona esta en su pico semanal.',
        morning_peak: 'Tu enfoque mental esta en su mejor momento.',
        afternoon_dip: 'Es natural sentir menos energia a esta hora.',
        evening_balanced: 'Tu cuerpo encuentra equilibrio al atardecer.',
        night_rest: 'Tu sistema se prepara para el descanso.',
      };
      const phaseDescEn: Record<string, string> = {
        menstrual: 'Your body is in rest and regeneration mode.',
        follicular: 'Your energy is rising and your mind is sharp.',
        ovulatory: 'You are at your peak of energy and social charisma.',
        luteal: 'It is time for introspection and completing projects.',
        weekly_peak: 'Your testosterone is at its weekly peak.',
        morning_peak: 'Your mental focus is at its best.',
        afternoon_dip: 'It is natural to feel less energy at this time.',
        evening_balanced: 'Your body finds balance at sunset.',
        night_rest: 'Your system is preparing for rest.',
      };
      const desc = isSpanish ? phaseDescEs[phaseData.phase] : phaseDescEn[phaseData.phase];
      contextualMessage = isSpanish
        ? `Estas en tu ${phaseName} hoy. ${desc || ''} Que preguntas tienes?`
        : `You are in your ${phaseName} today. ${desc || ''} What questions do you have?`;
      setSessionFlag('home_phase');
    } else if (lastCheckinData && !hasShownContextual('checkin_feedback')) {
      const dimLabelsEs: Record<string, string> = {
        emotional: 'emocional',
        physical: 'fisico',
        cognitive: 'cognitivo',
        stress: 'estres',
        social: 'social',
        sexual: 'sexual',
        anxiety: 'ansiedad',
      };
      const dimLabelsEn: Record<string, string> = {
        emotional: 'emotional',
        physical: 'physical',
        cognitive: 'cognitive',
        stress: 'stress',
        social: 'social',
        sexual: 'sexual',
        anxiety: 'anxiety',
      };
      const dimLabel = isSpanish
        ? dimLabelsEs[lastCheckinData.lowestDimension] || lastCheckinData.lowestDimension
        : dimLabelsEn[lastCheckinData.lowestDimension] || lastCheckinData.lowestDimension;

      contextualMessage = isSpanish
        ? `Note que tu nivel ${dimLabel} esta en ${lastCheckinData.lowestScore} hoy. Quieres hablar sobre lo que podria estar afectandolo?`
        : `I noticed your ${dimLabel} level is at ${lastCheckinData.lowestScore} today. Want to talk about what might be affecting it?`;
      setSessionFlag('checkin_feedback');
    } else if (hoursUntilHighAnxiety && !hasShownContextual('anxiety_warning')) {
      contextualMessage = isSpanish
        ? `Veo una ventana de alta vulnerabilidad en ${hoursUntilHighAnxiety} horas. Quieres prepararte juntos?`
        : `I see a high vulnerability window in ${hoursUntilHighAnxiety} hours. Want to prepare for it together?`;
      setSessionFlag('anxiety_warning');
    }

    if (contextualMessage) {
      setMessages([{ role: 'assistant', content: contextualMessage }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || isLimitReached) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    const result = await callCoachAPI(userMessage, profile, phaseData, recentAnxiety);

    if (result.error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.error!, isError: true },
      ]);
    } else {
      setMessages((prev) => [...prev, { role: 'assistant', content: result.content }]);
      const newCount = incrementMessageCount();
      setMessageCount(newCount);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setMessageCount(getMessageCount());
    setIsOpen(true);
  };

  if (currentScreen === 'coach') {
    return null;
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="fixed bottom-28 right-4 w-14 h-14 bg-[#2D1B69] rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 transition-transform"
        aria-label="Open coach"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-[430px] h-[70vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-gray-900">
                  {isSpanish ? 'Tu Coach' : 'Your Coach'}
                </h2>
                <p className="text-xs text-gray-500">
                  {messageCount} / {MONTHLY_LIMIT} {isSpanish ? 'mensajes' : 'messages'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      message.role === 'user'
                        ? 'bg-[#2D1B69] text-white rounded-br-sm'
                        : message.isError
                        ? 'bg-red-50 border border-red-100 text-red-700 rounded-bl-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" />
                        <span className="text-xs">Error</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2D1B69]" />
                      <span className="text-sm text-gray-500">
                        {isSpanish ? 'Pensando...' : 'Thinking...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-gray-100">
              {isLimitReached ? (
                <div className="bg-orange-50 rounded-xl p-3 text-center">
                  <p className="text-orange-700 text-sm">
                    {isSpanish ? 'Limite mensual alcanzado' : 'Monthly limit reached'}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    placeholder={isSpanish ? 'Escribe...' : 'Type...'}
                    className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl focus:ring-2 focus:ring-[#2D1B69] focus:bg-white outline-none text-sm"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="w-10 h-10 bg-[#2D1B69] rounded-xl flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
