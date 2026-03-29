import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import { Send, Loader2, AlertCircle, Mic, MicOff, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

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

  const systemPrompt = `You are Bio, BioCycle's biological intelligence coach. Help users understand their hormonal patterns before they happen. Speak with warmth and scientific grounding. Never judge. Extract emotional, physical, cognitive, stress, social, anxiety and sexual energy scores from natural language responses. Keep responses under 150 words. End every response with one specific prediction about the next 24-48 hours based on current phase. User context: Name: ${profile.nombre}, Phase: ${phaseName}, Gender: ${profile.genero}, Language: ${profile.idioma}, Current anxiety: ${phaseData.anxiety}, Recent anxiety avg: ${recentAnxiety}`;

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

// CSS keyframe animations injected once
const AVATAR_STYLES = `
  @keyframes bio-breathe {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(45,27,105,0.3); }
    50% { transform: scale(1.04); box-shadow: 0 0 18px 6px rgba(45,27,105,0.25); }
  }
  @keyframes bio-speaking {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(100,60,220,0.7); }
    40% { transform: scale(1.12); box-shadow: 0 0 32px 14px rgba(100,60,220,0.5); }
  }
  @keyframes bio-listening {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,107,0.7); }
    50% { transform: scale(1.08); box-shadow: 0 0 24px 10px rgba(255,107,107,0.5); }
  }
  .bio-avatar-idle { animation: bio-breathe 3.5s ease-in-out infinite; }
  .bio-avatar-speaking { animation: bio-speaking 0.75s ease-in-out infinite; }
  .bio-avatar-listening { animation: bio-listening 1s ease-in-out infinite; }
`;

const DNAHelixIcon = ({ size = 28 }: { size?: number }) => (
  <svg
    width={size}
    height={Math.round(size * 1.3)}
    viewBox="0 0 28 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <line x1="9" y1="2" x2="9" y2="34" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="19" y1="2" x2="19" y2="34" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
    <path d="M9 3 Q14 7 19 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 9 Q14 13 19 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 15 Q14 19 19 15" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 21 Q14 25 19 21" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 27 Q14 31 19 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M9 33 Q14 37 19 33" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
  </svg>
);

function BioAvatar({
  state,
  size,
}: {
  state: 'idle' | 'speaking' | 'listening';
  size: number;
}) {
  const iconSize = Math.round(size * 0.35);
  return (
    <div
      className={`bio-avatar-${state}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1a0a3e 0%, #2D1B69 55%, #4a2090 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <DNAHelixIcon size={iconSize} />
    </div>
  );
}

export function CoachScreen({ profile, phaseData }: CoachScreenProps) {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);

  const getDayName = (isSpanish: boolean): string => {
    const days = isSpanish
      ? ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getDimensionLabels = (isSpanish: boolean) => ({
    emotional: isSpanish ? 'energia emocional' : 'emotional energy',
    physical: isSpanish ? 'energia fisica' : 'physical energy',
    cognitive: isSpanish ? 'claridad cognitiva' : 'cognitive clarity',
    stress: isSpanish ? 'tolerancia al estres' : 'stress tolerance',
    social: isSpanish ? 'energia social' : 'social energy',
    anxiety: isSpanish ? 'nivel de ansiedad' : 'anxiety level',
    libido: isSpanish ? 'libido' : 'libido',
  });

  const dimensionLabels = getDimensionLabels(isSpanish);

  const dimensions = [
    { key: 'emotional', value: phaseData.emotional, label: dimensionLabels.emotional },
    { key: 'physical', value: phaseData.physical, label: dimensionLabels.physical },
    { key: 'cognitive', value: phaseData.cognitive, label: dimensionLabels.cognitive },
    { key: 'stress', value: phaseData.stress, label: dimensionLabels.stress },
    { key: 'social', value: phaseData.social, label: dimensionLabels.social },
    { key: 'anxiety', value: phaseData.anxiety, label: dimensionLabels.anxiety },
    { key: 'libido', value: phaseData.libido, label: dimensionLabels.libido },
  ];

  const sortedDimensions = [...dimensions].sort((a, b) => b.value - a.value);
  const highest = sortedDimensions[0];
  const lowest = sortedDimensions[sortedDimensions.length - 1];

  const userName = profile.nombre || (isSpanish ? 'amigo' : 'friend');
  const dayName = getDayName(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;

  const greetingMessage = isSpanish
    ? `Hola ${userName}. Soy Bio, tu coach de inteligencia biologica. Hoy es ${dayName}. Estas en tu fase ${phaseName}. Tu ${highest.label} esta fuerte hoy y tu ${lowest.label} necesita atencion. Que te gustaria saber sobre ti?`
    : `Hi ${userName}. I am Bio, your biological intelligence coach. Today is ${dayName}. You are in your ${phaseName} phase. Your ${highest.label} is strong today and your ${lowest.label} needs attention. What would you like to know about yourself?`;

  // ── Core chat state ──────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: greetingMessage },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(getMessageCount());
  const [recentAnxiety, setRecentAnxiety] = useState<number | null>(null);

  // ── Speech input state ───────────────────────────────────────────
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // ── Voice output state ───────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(false);

  // ── Bio avatar state ─────────────────────────────────────────────
  const [bioState, setBioState] = useState<'idle' | 'speaking' | 'listening'>('idle');

  // ── Full screen state ────────────────────────────────────────────
  const [isFullScreen, setIsFullScreen] = useState(false);
  const touchStartY = useRef<number>(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLimitReached = messageCount >= MONTHLY_LIMIT;

  // ── Inject avatar CSS once ───────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('bio-avatar-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'bio-avatar-styles';
    tag.textContent = AVATAR_STYLES;
    document.head.appendChild(tag);
  }, []);

  // ── Clear any persisted mute state and speak greeting ────────────
  useEffect(() => {
    localStorage.removeItem('biocycle_coach_muted');
    const timer = setTimeout(() => {
      speakResponse(greetingMessage);
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Speech RECOGNITION setup ─────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = isSpanish ? 'es-ES' : 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isSpanish]);

  // ── Preload TTS voices ───────────────────────────────────────────
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  // ── Sync bioState with mic ───────────────────────────────────────
  useEffect(() => {
    if (isListening) {
      setBioState('listening');
    } else if (!window.speechSynthesis?.speaking) {
      setBioState('idle');
    }
  }, [isListening]);

  // ── Voice output helpers ─────────────────────────────────────────
  const speakResponse = useCallback(
    (text: string) => {
      if (isMuted || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const targetLocale = isSpanish ? 'es-ES' : 'en-US';
      const targetLang = isSpanish ? 'es' : 'en';
      const voice =
        voices.find(v => v.lang.toLowerCase() === targetLocale.toLowerCase()) ??
        voices.find(v => v.lang.toLowerCase().startsWith(targetLang)) ??
        null;
      if (voice) utterance.voice = voice;
      utterance.lang = targetLocale;

      utterance.onstart = () => setBioState('speaking');
      utterance.onend = () => setBioState('idle');
      utterance.onerror = () => setBioState('idle');

      window.speechSynthesis.speak(utterance);
    },
    [isMuted, isSpanish]
  );

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('biocycle_coach_muted', String(next));
    if (next) {
      window.speechSynthesis?.cancel();
      setBioState('idle');
    }
  };

  // ── Scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load recent anxiety ──────────────────────────────────────────
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
      const avg =
        data.reduce((sum: number, c: Checkin) => sum + (c.factor_ansiedad || 0), 0) /
        data.length;
      setRecentAnxiety(Math.round(avg * 10) / 10);
    }
  };

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading || isLimitReached) return;

    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(updatedMessages);
    setLoading(true);

    const result = await callCoachAPI(
      userMessage,
      profile,
      phaseData,
      recentAnxiety,
      messages
    );

    if (result.error) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.error!, isError: true },
      ]);
    } else {
      setMessages(prev => [...prev, { role: 'assistant', content: result.content }]);
      const newCount = incrementMessageCount();
      setMessageCount(newCount);
      speakResponse(result.content);
    }

    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleListening = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // ── Full screen swipe-down handler ───────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0].clientY - touchStartY.current > 80) {
      setIsFullScreen(false);
    }
  };

  // ── Shared sub-components ────────────────────────────────────────
  const SpeakerButton = ({ text }: { text: string }) => (
    <button
      onClick={() => speakResponse(text)}
      title={isSpanish ? 'Reproducir audio' : 'Replay audio'}
      className="mt-1 ml-1 text-gray-400 hover:text-[#2D1B69] transition-colors flex-shrink-0"
    >
      <Volume2 className="w-3.5 h-3.5" />
    </button>
  );

  const MessageList = () => (
    <>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div className={`flex items-end gap-1 max-w-[82%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-[#7B61FF] text-white rounded-br-sm'
                  : message.isError
                  ? 'bg-red-950/50 border border-red-900/50 text-red-400 rounded-bl-sm'
                  : 'bg-[#111126] border border-[#1E1E3A] text-white rounded-bl-sm'
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
            {message.role === 'assistant' && !message.isError && (
              <SpeakerButton text={message.content} />
            )}
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7B61FF]" />
              <span className="text-sm text-[#8B95B0]">
                {isSpanish ? 'Pensando...' : 'Thinking...'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </>
  );

  const InputBar = () => (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[#4A5568]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {isSpanish
            ? `${messageCount} de ${MONTHLY_LIMIT} mensajes usados`
            : `${messageCount} of ${MONTHLY_LIMIT} messages used`}
        </span>
        {isLimitReached && (
          <span className="text-xs text-[#FF6B6B] font-medium">
            {isSpanish ? 'Limite alcanzado' : 'Limit reached'}
          </span>
        )}
      </div>

      {isLimitReached ? (
        <div className="bg-[#FF6B6B]/10 border border-[#FF6B6B]/20 rounded-xl p-4 text-center">
          <p className="text-[#FF6B6B] text-sm font-medium mb-1">
            {isSpanish
              ? 'Has alcanzado tu limite mensual'
              : 'You have reached your monthly limit'}
          </p>
          <p className="text-[#8B95B0] text-xs">
            {isSpanish
              ? 'Actualiza tu plan para mensajes ilimitados'
              : 'Upgrade your plan for unlimited messages'}
          </p>
        </div>
      ) : (
        <>
          {!speechSupported && (
            <p className="text-xs text-[#F5C842] mb-2">
              {isSpanish
                ? 'Entrada de voz no soportada. Por favor usa Chrome.'
                : 'Voice input not supported. Please use Chrome.'}
            </p>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              placeholder={isSpanish ? 'Escribe tu mensaje...' : 'Type your message...'}
              className="flex-1 px-4 py-3 bg-[#111126] border border-[#1E1E3A] rounded-xl text-white placeholder-[#4A5568] focus:ring-2 focus:ring-[#7B61FF] focus:border-transparent outline-none disabled:opacity-50"
            />
            <button
              onClick={toggleListening}
              disabled={loading || !speechSupported}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                isListening ? 'bg-[#FF6B6B] animate-pulse' : 'bg-[#1E1E3A] hover:bg-[#2A2A45]'
              } disabled:opacity-50`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-[#8B95B0]" />
              )}
            </button>
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-[#FF6B6B] rounded-xl flex items-center justify-center disabled:opacity-50 transition-opacity"
            >
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  // ── Full screen view ─────────────────────────────────────────────
  if (isFullScreen) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col"
        style={{ background: '#0d0618' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Header row */}
        <div className="flex items-center justify-end px-5 pt-12 pb-2">
          <button
            onClick={() => setIsFullScreen(false)}
            className="text-white/60 hover:text-white transition-colors"
            title={isSpanish ? 'Salir' : 'Exit'}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center py-6">
          <BioAvatar state={bioState} size={160} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          <MessageList />
        </div>

        {/* Input */}
        <div
          className="pb-safe"
          style={{ background: 'rgba(13,6,24,0.95)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <InputBar />
        </div>
      </div>
    );
  }

  // ── Normal view ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0A1A] flex flex-col pb-24">
      {/* Header */}
      <div className="bg-[#0A0A1A] border-b border-[#1E1E3A] px-5 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Clash Display, system-ui, sans-serif' }}>
              {isSpanish ? 'Tu Coach' : 'Your Coach'}
            </h1>
            <p className="text-[#8B95B0] text-sm mt-1">
              {phaseNames[phaseData.phase] || phaseData.phase}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Mute toggle */}
            <button
              onClick={toggleMute}
              title={isMuted ? (isSpanish ? 'Activar voz' : 'Unmute') : (isSpanish ? 'Silenciar' : 'Mute')}
              className="w-9 h-9 rounded-full bg-[#1E1E3A] hover:bg-[#2A2A45] flex items-center justify-center transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
            {/* Full screen toggle */}
            <button
              onClick={() => setIsFullScreen(true)}
              title={isSpanish ? 'Pantalla completa' : 'Full screen'}
              className="w-9 h-9 rounded-full bg-[#1E1E3A] hover:bg-[#2A2A45] flex items-center justify-center transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-[#8B95B0]" />
            </button>
          </div>
        </div>
      </div>

      {/* Bio Avatar */}
      <div className="flex justify-center py-5 bg-[#0A0A1A]">
        <BioAvatar state={bioState} size={80} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        <MessageList />
      </div>

      {/* Input */}
      <InputBar />
    </div>
  );
}
