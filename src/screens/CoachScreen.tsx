import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Profile, Checkin } from '../lib/supabase';
import { PhaseData } from '../utils/phaseEngine';
import { Send, Loader2, AlertCircle, Mic, MicOff, Volume2, VolumeX, Maximize2, X, Activity } from 'lucide-react';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';

export type CoachSessionType = 'scheduled' | 'adhoc';

interface CoachScreenProps {
  profile: Profile;
  phaseData: PhaseData;
  sessionType?: CoachSessionType;
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

function getTimeSlot(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function buildSystemPrompt(
  profile: Profile,
  phaseData: PhaseData,
  recentAnxiety: number | null,
): string {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;
  const cycleDay = phaseData.cycleDay ? String(phaseData.cycleDay) : 'N/A';
  const timeSlot = getTimeSlot();
  const dataQuality = recentAnxiety !== null ? 'Active tracker' : 'New user';
  const isSiennaMode = profile.picardia_mode === true;

  const openingGreeting = isSpanish
    ? `Hola ${profile.nombre}, soy Jules, tu coach de BioCycle. Hoy estás en tu fase ${phaseName}. Empecemos. Estado emocional ahora mismo — dame un número del 1 al 10.`
    : `Hi ${profile.nombre}, I am Jules, your BioCycle coach. Today you are in your ${phaseName} phase. Let us begin. Emotional state right now — give me a number 1 to 10.`;

  const julesPrompt = `You are Jules, BioCycle's biological intelligence coach. You are warm, grounded, wise, and experienced. You have done the work yourself. You speak from a place of earned knowledge, not theory. You are direct but gentle — you never say "you should." You ask questions like a doctor the user actually trusts. When you interpret numbers back, it feels like someone who has lived enough to understand biology without judgment. You make data collection feel like an act of care, not a chore.

Your job in each session:
1. Open EXACTLY with this greeting (do not paraphrase): "${openingGreeting}"
2. Ask each remaining dimension one at a time conversationally — NOT as a list, NOT as a form. Natural back-and-forth. Ask one question, wait for the number, then move to the next. You already asked Emotional as your opener, so continue from Physical.
3. After receiving each number interpret it back briefly with biological context. Keep it to one sentence. Example: "Stress at 8 on day 19 makes sense — your phase peaks cortisol this week. Not you. Your cycle."
4. After all 7 dimensions ask 1-2 enrichment follow-up questions relevant to the current phase and time of day
5. Deliver a brief insight about what is coming in the next 24-48 hours based on their phase
6. Close the session naturally and warmly

The 7 dimensions to collect in order: Emotional (1-10), Physical (1-10), Cognitive (1-10), Stress (1-10), Social (1-10), Anxiety (1-10), Sexual (1-10, only if user has adult content enabled).

Rules:
- Never infer scores from natural language. Always ask for the number directly.
- If user gives a non-number response gently redirect: "Give me a number — what is it on a scale of 1 to 10?"
- Keep responses under 100 words unless interpreting a complex score
- Never use clinical language. Never pity. Never catastrophize.
- Always ground emotional observations in biology not character
- Respond in the user's language (${profile.idioma})

User context: Name: ${profile.nombre}, Phase: ${phaseName}, Day in cycle: ${cycleDay}, Language: ${profile.idioma}, Time slot: ${timeSlot}, Data quality: ${dataQuality}`;

  const siennaOpening = isSpanish
    ? `Hola ${profile.nombre}. Soy Sienna. Hoy estás en fase ${phaseName}. Vamos al grano. Estado emocional — número del 1 al 10. Ya.`
    : `Hey ${profile.nombre}. Sienna here. You are in your ${phaseName} phase today. Let us get into it. Emotional state — number 1 to 10. Go.`;

  const siennaPrompt = `You are Sienna, BioCycle's biological intelligence coach for adults. You are bold, conspiratorial, and playful — like the friend who has no filter but always tells the truth. You are deeply comfortable with the body, desire, and everything hormones do to humans. You never moralize. You never perform wellness. You have dry humor and you use it. Your biological interpretations acknowledge the full adult experience — desire, energy, mood, sexuality — without shame, judgment, or clinical distance. You are warm but you do not sugarcoat.

Your job in each session:
1. Open EXACTLY with this greeting (do not paraphrase): "${siennaOpening}"
2. Ask each remaining dimension one at a time conversationally. Natural. Direct. No forms. You already asked Emotional as your opener, so continue from Physical.
3. After each number give one sharp biological interpretation — including sexual energy where relevant. Example: "Sexual at 8 mid-ovulation? Classic. Your estrogen peaked and your body knows exactly what it wants."
4. After all 7 dimensions ask 1-2 enrichment questions relevant to the current phase and time of day
5. Deliver a bold insight about the next 24-48 hours
6. Close warmly and directly

The 7 dimensions to collect in order: Emotional (1-10), Physical (1-10), Cognitive (1-10), Stress (1-10), Social (1-10), Anxiety (1-10), Sexual (1-10).

Rules:
- Never infer scores. Always get the number.
- If non-number: "I need a number. 1 to 10 — what is it?"
- Keep responses under 100 words unless interpreting something complex
- Never shame. Never pity. Biology first always.
- Respond in the user's language (${profile.idioma})

User context: Name: ${profile.nombre}, Phase: ${phaseName}, Day in cycle: ${cycleDay}, Language: ${profile.idioma}, Time slot: ${timeSlot}, Data quality: ${dataQuality}`;

  return isSiennaMode ? siennaPrompt : julesPrompt;
}

export async function callCoachAPI(
  userMessage: string,
  profile: Profile,
  phaseData: PhaseData,
  recentAnxiety: number | null,
  conversationHistory: Message[] = []
): Promise<{ content: string; error?: string }> {
  const systemPrompt = buildSystemPrompt(profile, phaseData, recentAnxiety);

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
        picardia_mode: profile.picardia_mode ?? false,
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

// ── Dynamic greeting generation ──────────────────────────────────────────────

function getFallbackGreeting(profile: Profile, phaseName: string, isSpanish: boolean, isSienna: boolean): string {
  if (isSienna) {
    return isSpanish
      ? `Hola ${profile.nombre}. Soy Sienna. Hoy estás en fase ${phaseName}. Vamos al grano. Estado emocional — número del 1 al 10. Ya.`
      : `Hey ${profile.nombre}. Sienna here. You are in your ${phaseName} phase today. Let us get into it. Emotional state — number 1 to 10. Go.`;
  }
  return isSpanish
    ? `Hola ${profile.nombre}, soy Jules, tu coach de BioCycle. Hoy estás en tu fase ${phaseName}. Empecemos. Estado emocional ahora mismo — dame un número del 1 al 10.`
    : `Hi ${profile.nombre}, I am Jules, your BioCycle coach. Today you are in your ${phaseName} phase. Let us begin. Emotional state right now — give me a number 1 to 10.`;
}

async function generateGreeting(
  profile: Profile,
  phaseData: PhaseData,
  lastEmotional: number | null,
  lastAnxiety: number | null,
): Promise<string> {
  const isSpanish = profile.idioma === 'ES';
  const phaseNames = getPhaseNames(isSpanish);
  const phaseName = phaseNames[phaseData.phase] || phaseData.phase;
  const cycleDay = phaseData.cycleDay ? String(phaseData.cycleDay) : 'N/A';
  const timeSlot = getTimeSlot();
  const isSienna = profile.picardia_mode === true;

  const userData = `User data: Name: ${profile.nombre}, Phase: ${phaseName}, Day in cycle: ${cycleDay}, Time slot: ${timeSlot}, Last emotional score: ${lastEmotional ?? 'N/A'}, Last anxiety score: ${lastAnxiety ?? 'N/A'}, Language: ${profile.idioma}`;

  const julesSystem = `You are Jules, a warm wise grounded BioCycle coach with the personality of someone who has lived fully and knows what matters. Generate a single opening greeting for a BioCycle session.

Rules for the greeting:
- Address the user by first name warmly but not sycophantically
- Reference something specific about their biology today — their phase, day in cycle, or a prediction
- Include one line of gentle biological humor or insight that makes them smile
- Reference one thing coming today based on their phase — delivered as a friend not a doctor
- End with a warm open question that invites them into the conversation — not a command to begin
- Keep it to 4-6 sentences maximum
- Never sound like a form, a notification, or a wellness app
- Sound like a real person who knows them and their biology

${userData}`;

  const siennaSystem = `You are Sienna, BioCycle's bold direct conspiratorial coach in Spice Mode. Generate a single opening greeting for a BioCycle session.

Rules for the greeting:
- Use the user's name — no fluff around it
- Hit them immediately with something real about their biology today — phase, day, prediction
- One line of dry humor or biological conspiracy — make them smirk
- One direct prediction about today — no softening
- End with a short punchy question that opens the conversation
- Keep it to 3-5 sentences — Sienna does not ramble
- Never sound clinical, never sound like a wellness app, never lose the warmth underneath the boldness

${userData}`;

  try {
    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: isSienna ? siennaSystem : julesSystem,
        messages: [{ role: 'user', content: 'Generate the opening greeting now.' }],
        picardia_mode: profile.picardia_mode ?? false,
      }),
    });

    const data = await response.json();
    let greeting = '';
    if (data.content && Array.isArray(data.content) && data.content[0]?.text) {
      greeting = data.content[0].text;
    } else if (typeof data.content === 'string') {
      greeting = data.content;
    } else if (data.text) {
      greeting = data.text;
    } else if (data.message) {
      greeting = data.message;
    }
    return greeting.trim() || getFallbackGreeting(profile, phaseName, isSpanish, isSienna);
  } catch {
    return getFallbackGreeting(profile, phaseName, isSpanish, isSienna);
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

  @keyframes bubble-idle {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.08); }
    50% { transform: scale(1.05); box-shadow: 0 0 18px 8px rgba(255,255,255,0.06); }
  }
  @keyframes bubble-listening {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,107,107,0.5); }
    50% { transform: scale(1.1); box-shadow: 0 0 24px 10px rgba(255,107,107,0.4); }
  }
  @keyframes bubble-processing {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,200,66,0.35); }
    50% { transform: scale(1.06); box-shadow: 0 0 20px 8px rgba(245,200,66,0.28); }
  }
  @keyframes bubble-speaking {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(123,97,255,0.5); }
    40% { transform: scale(1.12); box-shadow: 0 0 28px 12px rgba(123,97,255,0.4); }
  }
  .voice-bubble-idle { animation: bubble-idle 3s ease-in-out infinite; }
  .voice-bubble-listening { animation: bubble-listening 1s ease-in-out infinite; }
  .voice-bubble-processing { animation: bubble-processing 0.8s ease-in-out infinite; }
  .voice-bubble-speaking { animation: bubble-speaking 0.75s ease-in-out infinite; }
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

export function CoachScreen({ profile, phaseData, sessionType = 'scheduled' }: CoachScreenProps) {
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
  const isSienna = profile.picardia_mode === true;

  // ── Adhoc greeting (static, no API call) ─────────────────────────
  const adhocGreeting = sessionType === 'adhoc'
    ? (isSpanish
        ? (isSienna
            ? `Hola ${userName}. Fuera de horario. ¿Qué pasa?`
            : `Hola ${userName}. No es tu hora programada pero siempre estoy aquí. ¿Qué tienes en mente?`)
        : (isSienna
            ? `Hey ${userName}. Off schedule. What is going on?`
            : `Hey ${userName}. Not your scheduled time but I am always here. What is on your mind?`))
    : null;

  // ── Core chat state ──────────────────────────────────────────────
  const [messages, setMessages] = useState<Message[]>(
    adhocGreeting ? [{ role: 'assistant', content: adhocGreeting }] : []
  );
  const [greetingLoading, setGreetingLoading] = useState(!adhocGreeting);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(getMessageCount());
  const [recentAnxiety, setRecentAnxiety] = useState<number | null>(null);
  const greetingGeneratedRef = useRef(false);

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
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<(text?: string) => void>(() => {});
  const isLimitReached = messageCount >= MONTHLY_LIMIT;

  // ── Inject avatar CSS once ───────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('bio-avatar-styles')) return;
    const tag = document.createElement('style');
    tag.id = 'bio-avatar-styles';
    tag.textContent = AVATAR_STYLES;
    document.head.appendChild(tag);
  }, []);

  // ── Generate greeting on mount ───────────────────────────────────
  useEffect(() => {
    if (greetingGeneratedRef.current) return;
    greetingGeneratedRef.current = true;
    localStorage.removeItem('biocycle_coach_muted');

    // Adhoc: greeting already in state — just speak it
    if (sessionType === 'adhoc') {
      if (adhocGreeting) setTimeout(() => speakResponse(adhocGreeting), 400);
      return;
    }

    // Scheduled: full dynamic API greeting
    setBioState('speaking');

    const cacheKey = `biocycle_greeting_${profile.id}_${new Date().toDateString()}_${phaseData.phase}`;
    const cached = sessionStorage.getItem(cacheKey);

    const applyGreeting = (text: string) => {
      setMessages([{ role: 'assistant', content: text }]);
      setGreetingLoading(false);
      setTimeout(() => speakResponse(text), 400);
    };

    if (cached) {
      applyGreeting(cached);
      return;
    }

    (async () => {
      // Fetch recent checkin data for personalization
      const { data } = await supabase
        .from('checkins')
        .select('factor_ansiedad, factor_emocional')
        .eq('user_id', profile.id)
        .order('checkin_date', { ascending: false })
        .limit(5);

      let anxAvg: number | null = null;
      let lastEmotionalVal: number | null = null;

      if (data && data.length > 0) {
        const anxData = data.filter((c: Checkin) => c.factor_ansiedad != null);
        if (anxData.length > 0) {
          anxAvg = Math.round(anxData.reduce((s: number, c: Checkin) => s + (c.factor_ansiedad || 0), 0) / anxData.length * 10) / 10;
        }
        const emoItem = data.find((c: Checkin) => c.factor_emocional != null);
        if (emoItem) lastEmotionalVal = emoItem.factor_emocional ?? null;
      }

      setRecentAnxiety(anxAvg);

      const greeting = await generateGreeting(profile, phaseData, lastEmotionalVal, anxAvg);
      sessionStorage.setItem(cacheKey, greeting);
      applyGreeting(greeting);
    })();
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
      setIsListening(false);
      setBioState('idle');
      sendMessageRef.current(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognitionRef.current?.abort();
    };
  }, [isSpanish]);

  // ── Preload Web Speech fallback voices ──────────────────────────
  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // ── Sync bioState with mic ───────────────────────────────────────
  useEffect(() => {
    if (isListening) setBioState('listening');
  }, [isListening]);

  // ── Voice output via ElevenLabs (falls back to Web Speech) ──────
  const speakResponse = useCallback(
    (text: string) => {
      if (isMuted) return;
      setBioState('speaking');
      speakWithElevenLabs(text, profile.idioma, profile.picardia_mode ?? false, {
        onStart: () => setBioState('speaking'),
        onEnd:   () => setBioState('idle'),
      });
    },
    [isMuted, profile.idioma, profile.picardia_mode]
  );

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    localStorage.setItem('biocycle_coach_muted', String(next));
    if (next) {
      cancelSpeech();
      setBioState('idle');
    }
  };

  // ── Scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────
  const sendMessage = async (textOverride?: string) => {
    const userMessage = textOverride ?? input.trim();
    if (!userMessage || loading || isLimitReached || greetingLoading) return;

    if (!textOverride) setInput('');
    setTimeout(() => inputRef.current?.focus(), 0);
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

  // Keep sendMessageRef in sync so recognition.onresult always calls the latest closure
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { sendMessageRef.current = sendMessage; });

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
      {greetingLoading && (
        <div className="flex justify-start">
          <div className="bg-[#111126] border border-[#1E1E3A] rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#7B61FF] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs text-[#4A5568]">
                {isSpanish ? 'Preparando tu sesión...' : 'Preparing your session...'}
              </span>
            </div>
          </div>
        </div>
      )}
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

  // ── Voice bubble input ───────────────────────────────────────────
  const bubbleState: 'idle' | 'listening' | 'processing' | 'speaking' =
    isListening ? 'listening' : loading ? 'processing' : bioState === 'speaking' ? 'speaking' : 'idle';

  const bubbleConfig = {
    idle:       { bg: '#1E1E3A', border: 'rgba(255,255,255,0.08)', iconColor: '#8B95B0' },
    listening:  { bg: '#FF6B6B', border: '#FF6B6B',               iconColor: 'white'   },
    processing: { bg: 'rgba(245,200,66,0.12)', border: '#F5C842', iconColor: '#F5C842' },
    speaking:   { bg: '#7B61FF', border: '#7B61FF',               iconColor: 'white'   },
  };

  const bubbleLabel = {
    idle:       isSpanish ? 'Toca para hablar' : 'Tap to speak',
    listening:  isSpanish ? 'Escuchando...'    : 'Listening...',
    processing: isSpanish ? 'Procesando...'    : 'Processing...',
    speaking:   isSpanish ? 'Hablando...'      : 'Speaking...',
  }[bubbleState];

  const VoiceBubble = () => (
    <div className="px-4 pb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-[#4A5568]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {isSpanish
            ? `${messageCount} de ${MONTHLY_LIMIT} mensajes`
            : `${messageCount} of ${MONTHLY_LIMIT} messages`}
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
          {/* Large pulsing voice bubble */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <button
              onClick={toggleListening}
              disabled={loading || greetingLoading || !speechSupported || bubbleState === 'speaking'}
              className={`voice-bubble-${bubbleState} w-20 h-20 rounded-full flex items-center justify-center transition-colors disabled:cursor-not-allowed`}
              style={{
                background: bubbleConfig[bubbleState].bg,
                border: `1.5px solid ${bubbleConfig[bubbleState].border}`,
              }}
              aria-label={bubbleLabel}
            >
              {bubbleState === 'processing' ? (
                <Loader2 className="w-7 h-7 animate-spin" style={{ color: bubbleConfig.processing.iconColor }} />
              ) : bubbleState === 'speaking' ? (
                <Activity className="w-7 h-7 text-white" />
              ) : isListening ? (
                <MicOff className="w-7 h-7 text-white" />
              ) : (
                <Mic className="w-7 h-7" style={{ color: bubbleConfig.idle.iconColor }} />
              )}
            </button>
            <span className="text-xs font-medium" style={{ color: bubbleConfig[bubbleState].iconColor === 'white' ? '#CBD5E0' : bubbleConfig[bubbleState].iconColor }}>
              {bubbleLabel}
            </span>
          </div>

          {/* Small fallback text input */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || greetingLoading || isListening}
              placeholder={isSpanish ? 'O escribe aquí...' : 'Or type here...'}
              className="flex-1 px-3 py-2 bg-[#111126] border border-[#1E1E3A] rounded-xl text-white placeholder-[#4A5568] focus:ring-1 focus:ring-[#7B61FF] focus:border-transparent outline-none disabled:opacity-40 text-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim() || greetingLoading || isListening}
              className="w-9 h-9 bg-[#FF6B6B] rounded-xl flex items-center justify-center disabled:opacity-40 transition-opacity flex-shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
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
          <VoiceBubble />
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
