import { useState, useEffect, useRef } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import { Send, Loader2, Lock, AlertCircle } from 'lucide-react';

interface CoachScreenProps {
  profile: Profile;
  phaseData: PhaseData;
}

type Message = {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
};

const MONTHLY_LIMIT = 30;

function getStorageKey() {
  const now = new Date();
  return `biocycle_coach_count_${now.getFullYear()}${now.getMonth() + 1}`;
}

export function getMessageCount(): number {
  const key = getStorageKey();
  const stored = localStorage.getItem(key);
  return stored ? parseInt(stored, 10) : 0;
}

export function incrementMessageCount(): number {
  const key = getStorageKey();
  const current = getMessageCount();
  const newCount = current + 1;
  localStorage.setItem(key, newCount.toString());
  return newCount;
}

const phaseNamesEs: Record<string, string> = {
  menstrual: 'Fase Menstrual',
  follicular: 'Fase Folicular',
  ovulatory: 'Fase Ovulatoria',
  luteal: 'Fase Lutea',
  weekly_peak: 'Pico Semanal',
  morning_peak: 'Pico Matutino',
  afternoon_dip: 'Bajada Vespertina',
  evening_balanced: 'Equilibrio Nocturno',
  night_rest: 'Descanso Nocturno',
  circadian: 'Ciclo Circadiano',
};

const phaseNamesEn: Record<string, string> = {
  menstrual: 'Menstrual Phase',
  follicular: 'Follicular Phase',
  ovulatory: 'Ovulatory Phase',
  luteal: 'Luteal Phase',
  weekly_peak: 'Weekly Peak',
  morning_peak: 'Morning Peak',
  afternoon_dip: 'Afternoon Dip',
  evening_balanced: 'Evening Balance',
  night_rest: 'Night Rest',
  circadian: 'Circadian Cycle',
};

export function getPhaseNames(isSpanish: boolean) {
  return isSpanish ? phaseNamesEs : phaseNamesEn;
}

export async function callCoachAPI(
  userMessage: string,
  profile: Profile,
  phaseData: PhaseData,
  recentAnxiety: number | null,
  conversationHistory: Message[] = []
): Promise<{ content: string; error?: string }> {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;

  const systemPrompt = `You are BioCycle's AI coach. Speak with warmth and scientific grounding. Never judge. Keep responses under 150 words. User context: Name: ${profile.nombre}, Phase: ${phaseName}, Gender: ${profile.genero}, Language: ${profile.idioma}, Current anxiety: ${phaseData.anxiety}, Recent anxiety avg: ${recentAnxiety}`;

  const messages = [
    ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage }
  ];

  try {
    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorDetail = data.error?.message || data.error || data.message || JSON.stringify(data);
      const errorMsg = `Error ${response.status}: ${errorDetail}`;
      console.error('Coach API error response:', { status: response.status, data });
      return { content: '', error: errorMsg };
    }

    let assistantMessage = '';
    if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
      assistantMessage = data.content[0].text;
    } else if (typeof data.content === 'string') {
      assistantMessage = data.content;
    } else if (data.text) {
      assistantMessage = data.text;
    } else if (data.message) {
      assistantMessage = data.message;
    }

    if (!assistantMessage) {
      console.error('Empty coach response:', data);
      return { content: '', error: `Could not extract response: ${JSON.stringify(data)}` };
    }

    return { content: assistantMessage };
  } catch (error) {
    console.error('Coach API error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { content: '', error: `Connection error: ${errorMsg}` };
  }
}

export function CoachScreen({ profile, phaseData }: CoachScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(getMessageCount());
  const [recentAnxiety, setRecentAnxiety] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLimitReached = messageCount >= MONTHLY_LIMIT;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadRecentAnxietyData();
  }, [profile.id]);

  const loadRecentAnxietyData = async () => {
    const { data } = await supabase
      .from('checkins')
      .select('factor_ansiedad')
      .eq('user_id', profile.id)
      .not('factor_ansiedad', 'is', null)
      .order('checkin_date', { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      const avg = data.reduce((sum: number, c: Checkin) => sum + (c.factor_ansiedad || 0), 0) / data.length;
      setRecentAnxiety(Math.round(avg * 10) / 10);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || isLimitReached) return;

    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    const result = await callCoachAPI(userMessage, profile, phaseData, recentAnxiety, messages);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <div className="bg-gradient-to-r from-[#2D1B69] to-[#FF6B6B] px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold text-white">
          {isSpanish ? 'Tu Coach' : 'Your Coach'}
        </h1>
        <p className="text-white/70 text-sm mt-1">
          {phaseNames[phaseData.phase] || phaseData.phase}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">
              {isSpanish
                ? 'Hola! Soy tu coach de BioCycle. Preguntame sobre tu ciclo, energia o bienestar.'
                : "Hi! I'm your BioCycle coach. Ask me about your cycle, energy, or wellbeing."}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#2D1B69] text-white rounded-br-sm'
                  : message.isError
                  ? 'bg-red-50 border border-red-100 text-red-700 rounded-bl-sm'
                  : 'bg-white shadow-md text-gray-800 rounded-bl-sm'
              }`}
            >
              {message.isError && (
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-medium">Error</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white shadow-md rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#2D1B69]" />
                <span className="text-sm text-gray-500">
                  {isSpanish ? 'Pensando...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500">
            {isSpanish
              ? `${messageCount} de ${MONTHLY_LIMIT} mensajes usados`
              : `${messageCount} of ${MONTHLY_LIMIT} messages used`}
          </span>
          {isLimitReached && (
            <span className="text-xs text-orange-500 font-medium">
              {isSpanish ? 'Limite alcanzado' : 'Limit reached'}
            </span>
          )}
        </div>

        {isLimitReached ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-orange-700 text-sm font-medium mb-1">
              {isSpanish ? 'Has alcanzado tu limite mensual' : 'You have reached your monthly limit'}
            </p>
            <p className="text-orange-600 text-xs">
              {isSpanish
                ? 'Actualiza tu plan para mensajes ilimitados'
                : 'Upgrade your plan for unlimited messages'}
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
              placeholder={isSpanish ? 'Escribe tu mensaje...' : 'Type your message...'}
              className="flex-1 px-4 py-3 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2D1B69] focus:border-transparent outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-[#2D1B69] rounded-xl flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
