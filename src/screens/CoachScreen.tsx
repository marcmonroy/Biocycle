// CoachScreen — Session 2 — Jules Deterministic State Machine
// Anthropic API called ONLY for ACK sentences and phase-specific openings.
// Every question is hardcoded. Every state is explicit. Jules never drifts.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { QuantumDNA } from '../components/QuantumDNA';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';

// ── Types ─────────────────────────────────────────────────────────────────

type ConversationState =
  | 'OPENING'
  | 'EXPLAIN_OFFER' | 'EXPLAINING' | 'MONEY_OFFER' | 'MONEY_EXPLAINING'
  | 'ENERGY_Q' | 'ENERGY_ACK'
  | 'COGNITIVE_Q' | 'COGNITIVE_ACK'
  | 'STRESS_Q' | 'STRESS_ACK'
  | 'ANXIETY_Q' | 'ANXIETY_ACK'
  | 'SLEEP_Q' | 'SLEEP_ACK'
  | 'CAFFEINE_Q' | 'CAFFEINE_ACK'
  | 'EMOTIONAL_Q' | 'EMOTIONAL_ACK'
  | 'SOCIAL_Q' | 'SOCIAL_ACK'
  | 'SEXUAL_Q' | 'SEXUAL_ACK'
  | 'HYDRATION_Q' | 'HYDRATION_ACK'
  | 'DAY_RATING_Q' | 'DAY_RATING_ACK'
  | 'MEMORABLE_Q' | 'MEMORABLE_ACK'
  | 'ALCOHOL_Q' | 'ALCOHOL_ACK'
  | 'SESSION_COMPLETE'
  | 'INTERRUPTED_RECOVERY'
  | 'ADHOC';

type SessionSlot = 'morning' | 'afternoon' | 'night' | 'adhoc';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionScores {
  factor_fisico: number | null;
  factor_cognitivo: number | null;
  factor_estres: number | null;
  factor_ansiedad: number | null;
  factor_sueno: number | null;
  factor_cafeina: number | null;
  factor_emocional: number | null;
  factor_social: number | null;
  factor_sexual: number | null;
  factor_hidratacion: string | null;
  factor_alcohol: boolean | null;
  day_rating: number | null;
  day_memory: string | null;
}

// ── Safety ────────────────────────────────────────────────────────────────

const CRISIS_KEYWORDS = [
  'suicide', 'suicidio', 'kill myself', 'matarme', 'end my life', 'end my existence',
  'self-harm', 'autolesión', 'overdose', 'sobredosis',
  'cutting myself', 'cortarme', 'want to die', 'quiero morir',
  'not worth living', 'no vale la pena vivir', 'hurt myself', 'hacerme daño',
  'no reason to live', 'sin razón para vivir',
];

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(k => lower.includes(k));
}

async function logSafetyEvent(userId: string, text: string, ctx: string) {
  try {
    await supabase.from('safety_events').insert({
      user_id: userId,
      trigger_text: text.slice(0, 500),
      context: ctx,
      created_at: new Date().toISOString(),
    });
  } catch { /* never throw */ }
}

// ── localStorage session persistence key ──────────────────────────────────
const LS_KEY           = 'biocycle_active_session';
const LS_RECOVERY_KEY  = 'biocycle_recovery_count';

// ── Session helpers ───────────────────────────────────────────────────────

function getSessionSlot(): SessionSlot {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 24) return 'night';
  return 'morning'; // midnight–5am fallback — never return adhoc from time detection
}

function getSlotLabel(slot: SessionSlot, isES: boolean): string {
  if (isES) {
    return slot === 'morning' ? 'mañana' : slot === 'afternoon' ? 'tarde' : 'noche';
  }
  return slot === 'morning' ? 'morning' : slot === 'afternoon' ? 'afternoon' : 'evening';
}

function getNextSessionSlot(slot: SessionSlot, isES: boolean): string {
  if (isES) {
    return slot === 'morning' ? 'esta tarde' : slot === 'afternoon' ? 'esta noche' : 'mañana por la mañana';
  }
  return slot === 'morning' ? 'this afternoon' : slot === 'afternoon' ? 'tonight' : 'tomorrow morning';
}

// ── Hardcoded question texts ──────────────────────────────────────────────

function getQuestionText(state: ConversationState, _name: string, _slot: SessionSlot, isES: boolean): string {
  if (isES) {
    switch (state) {
      case 'EXPLAIN_OFFER':  return '¿Te gustaría una explicación rápida de cómo funciona BioCycle antes de empezar?';
      case 'MONEY_OFFER':    return '¿Quieres saber cómo tus datos pueden generarte dinero?';
      case 'ENERGY_Q':       return '¿Cómo calificarías tu energía ahora mismo — del 1 al 10?';
      case 'COGNITIVE_Q':    return '¿Y tu claridad mental — qué tan enfocado/a te sientes? Del 1 al 10.';
      case 'STRESS_Q':       return 'Nivel de estrés — del 1 al 10.';
      case 'ANXIETY_Q':      return '¿Algo de ansiedad hoy? Del 1 al 10.';
      case 'SLEEP_Q':        return '¿Cómo dormiste anoche — bien o mal?';
      case 'CAFFEINE_Q':     return '¿Cuántos cafés o bebidas con cafeína has tomado hoy?';
      case 'EMOTIONAL_Q':    return '¿Cómo te sientes emocionalmente ahora — del 1 al 10?';
      case 'SOCIAL_Q':       return 'Energía social — ¿cuántas ganas tienes de estar con gente hoy? Del 1 al 10.';
      case 'SEXUAL_Q':       return 'Energía sexual hoy — del 1 al 10.';
      case 'HYDRATION_Q':    return '¿Cómo está tu hidratación hoy — bien, regular o mal?';
      case 'DAY_RATING_Q':   return '¿Cómo calificarías el día de hoy en general — del 1 al 10?';
      case 'MEMORABLE_Q':    return '¿Cuál fue un momento del día que te llamó la atención?';
      case 'ALCOHOL_Q':      return '¿Tomaste alcohol hoy — sí o no?';
      default: return '';
    }
  }
  switch (state) {
    case 'EXPLAIN_OFFER':  return 'Would you like a quick explanation of how BioCycle works before we start?';
    case 'MONEY_OFFER':    return 'Want to know about how your data can earn you money?';
    case 'ENERGY_Q':       return 'How would you rate your energy right now — on a scale of 1 to 10?';
    case 'COGNITIVE_Q':    return 'And your mental clarity — how sharp are you feeling? 1 to 10.';
    case 'STRESS_Q':       return 'Stress level — 1 to 10.';
    case 'ANXIETY_Q':      return 'Any anxiety today? 1 to 10.';
    case 'SLEEP_Q':        return 'How did you sleep last night — restful or restless?';
    case 'CAFFEINE_Q':     return 'How many coffees or caffeinated drinks so far today?';
    case 'EMOTIONAL_Q':    return 'How are you feeling emotionally right now — on a scale of 1 to 10?';
    case 'SOCIAL_Q':       return 'Social energy — how much do you feel like being around people today? 1 to 10.';
    case 'SEXUAL_Q':       return 'Sexual energy today — 1 to 10.';
    case 'HYDRATION_Q':    return 'How is your hydration today — good, average, or poor?';
    case 'DAY_RATING_Q':   return 'How would you rate today overall — 1 to 10?';
    case 'MEMORABLE_Q':    return "What's one moment from today that stood out?";
    case 'ALCOHOL_Q':      return 'Did you have any alcohol today — yes or no?';
    default: return '';
  }
}

function getCompletionText(slot: SessionSlot, name: string, isES: boolean): string {
  const slotLabel = getSlotLabel(slot, isES);
  const next      = getNextSessionSlot(slot, isES);
  if (isES) return `Eso es todo por esta ${slotLabel}, ${name}. Nos vemos ${next}.`;
  return `That's it for this ${slotLabel}, ${name}. See you ${next}.`;
}

// ── Input UI — driven by state, not text scanning ─────────────────────────

type InputUI = 'numberpad' | 'choices' | 'voice' | 'none';

function getInputUI(state: ConversationState): InputUI {
  const numpad:   ConversationState[] = ['ENERGY_Q','COGNITIVE_Q','STRESS_Q','ANXIETY_Q','EMOTIONAL_Q','SOCIAL_Q','SEXUAL_Q','DAY_RATING_Q'];
  const choices:  ConversationState[] = ['SLEEP_Q','CAFFEINE_Q','HYDRATION_Q','ALCOHOL_Q','EXPLAIN_OFFER','MONEY_OFFER'];
  if (numpad.includes(state))  return 'numberpad';
  if (choices.includes(state)) return 'choices';
  if (state === 'MEMORABLE_Q' || state === 'ADHOC') return 'voice';
  return 'none';
}

function getChoiceOptions(state: ConversationState, isES: boolean): string[] {
  switch (state) {
    case 'SLEEP_Q':       return isES ? ['Bien', 'Mal'] : ['Restful', 'Restless'];
    case 'CAFFEINE_Q':    return ['0', '1', '2', '3', '4+'];
    case 'HYDRATION_Q':   return isES ? ['Bien', 'Regular', 'Mal'] : ['Good', 'Average', 'Poor'];
    case 'ALCOHOL_Q':     return isES ? ['Sí', 'No'] : ['Yes', 'No'];
    case 'EXPLAIN_OFFER': return isES ? ['Sí', 'No'] : ['Yes', 'No'];
    case 'MONEY_OFFER':   return isES ? ['Sí', 'No'] : ['Yes', 'No'];
    default: return [];
  }
}

// ── State transition graph ────────────────────────────────────────────────

function getNextQState(qState: ConversationState, slot: SessionSlot, isGap: boolean): ConversationState | 'SESSION_COMPLETE' {
  if (isGap) {
    if (qState === 'ENERGY_Q') return 'STRESS_Q';
    return 'SESSION_COMPLETE';
  }
  switch (slot) {
    case 'morning':
      switch (qState) {
        case 'ENERGY_Q':    return 'COGNITIVE_Q';
        case 'COGNITIVE_Q': return 'STRESS_Q';
        case 'STRESS_Q':    return 'ANXIETY_Q';
        case 'ANXIETY_Q':   return 'SLEEP_Q';
        case 'SLEEP_Q':     return 'CAFFEINE_Q';
        case 'CAFFEINE_Q':  return 'SESSION_COMPLETE';
        default:            return 'SESSION_COMPLETE';
      }
    case 'afternoon':
      switch (qState) {
        case 'EMOTIONAL_Q': return 'SOCIAL_Q';
        case 'SOCIAL_Q':    return 'SEXUAL_Q';
        case 'SEXUAL_Q':    return 'HYDRATION_Q';
        case 'HYDRATION_Q': return 'SESSION_COMPLETE';
        default:            return 'SESSION_COMPLETE';
      }
    case 'night':
      switch (qState) {
        case 'DAY_RATING_Q': return 'MEMORABLE_Q';
        case 'MEMORABLE_Q':  return 'ALCOHOL_Q';
        case 'ALCOHOL_Q':    return 'SESSION_COMPLETE';
        default:             return 'SESSION_COMPLETE';
      }
    default:
      return 'SESSION_COMPLETE';
  }
}

function getFirstQForSlot(slot: SessionSlot): ConversationState {
  if (slot === 'afternoon') return 'EMOTIONAL_Q';
  if (slot === 'night')     return 'DAY_RATING_Q';
  return 'ENERGY_Q';
}

// ── Score application ─────────────────────────────────────────────────────

function applyScore(state: ConversationState, raw: string, scores: SessionScores): void {
  const n = parseInt(raw, 10);
  switch (state) {
    case 'ENERGY_Q':    scores.factor_fisico    = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'COGNITIVE_Q': scores.factor_cognitivo = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'STRESS_Q':    scores.factor_estres    = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'ANXIETY_Q':   scores.factor_ansiedad  = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'SLEEP_Q': {
      const lc = raw.toLowerCase();
      scores.factor_sueno = (lc === 'restful' || lc === 'bien') ? 7 : 3;
      break;
    }
    case 'CAFFEINE_Q':  scores.factor_cafeina   = raw === '4+' ? 4 : (isNaN(n) ? null : n); break;
    case 'EMOTIONAL_Q': scores.factor_emocional = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'SOCIAL_Q':    scores.factor_social    = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'SEXUAL_Q':    scores.factor_sexual    = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'HYDRATION_Q': {
      const lc = raw.toLowerCase();
      scores.factor_hidratacion = (lc === 'good' || lc === 'bien') ? 'good' : (lc === 'average' || lc === 'regular') ? 'average' : 'poor';
      break;
    }
    case 'DAY_RATING_Q': scores.day_rating  = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
    case 'MEMORABLE_Q':  scores.day_memory  = raw.trim(); break;
    case 'ALCOHOL_Q': {
      const lc = raw.toLowerCase();
      scores.factor_alcohol = lc === 'yes' || lc === 'sí' || lc === 'si';
      break;
    }
  }
}

function getDimLabel(state: ConversationState, isES: boolean): string {
  if (isES) {
    switch (state) {
      case 'ENERGY_Q':    return 'energía física';
      case 'COGNITIVE_Q': return 'claridad mental';
      case 'STRESS_Q':    return 'nivel de estrés';
      case 'ANXIETY_Q':   return 'nivel de ansiedad';
      case 'SLEEP_Q':     return 'calidad de sueño';
      case 'CAFFEINE_Q':  return 'consumo de cafeína';
      case 'EMOTIONAL_Q': return 'estado emocional';
      case 'SOCIAL_Q':    return 'energía social';
      case 'SEXUAL_Q':    return 'energía sexual';
      case 'HYDRATION_Q': return 'hidratación';
      case 'DAY_RATING_Q':return 'el día en general';
      case 'MEMORABLE_Q': return 'momento del día';
      case 'ALCOHOL_Q':   return 'consumo de alcohol';
      default: return 'respuesta';
    }
  }
  switch (state) {
    case 'ENERGY_Q':    return 'physical energy';
    case 'COGNITIVE_Q': return 'mental clarity';
    case 'STRESS_Q':    return 'stress level';
    case 'ANXIETY_Q':   return 'anxiety level';
    case 'SLEEP_Q':     return 'sleep quality';
    case 'CAFFEINE_Q':  return 'caffeine intake';
    case 'EMOTIONAL_Q': return 'emotional state';
    case 'SOCIAL_Q':    return 'social energy';
    case 'SEXUAL_Q':    return 'sexual energy';
    case 'HYDRATION_Q': return 'hydration';
    case 'DAY_RATING_Q':return 'overall day';
    case 'MEMORABLE_Q': return 'moment of the day';
    case 'ALCOHOL_Q':   return 'alcohol intake';
    default: return 'response';
  }
}

// ── UI Components ─────────────────────────────────────────────────────────

function NumberPad({ onSelect }: { onSelect: (n: number) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, padding: '8px 0' }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          style={{
            background: 'rgba(123,97,255,0.12)',
            border: '1px solid rgba(123,97,255,0.25)',
            borderRadius: 10,
            padding: '13px 0',
            color: '#7B61FF',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function ChoiceButtons({ options, onSelect }: { options: string[]; onSelect: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 0', flexWrap: 'wrap' }}>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          style={{
            flex: 1,
            minWidth: 72,
            background: 'rgba(255,107,107,0.12)',
            border: '1px solid rgba(255,107,107,0.35)',
            borderRadius: 12,
            padding: '13px 8px',
            color: '#FF6B6B',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.9rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────

interface Props {
  profile: Profile;
  sessionType: 'scheduled' | 'adhoc';
  onBack: () => void;
}

export function CoachScreen({ profile, sessionType, onBack }: Props) {
  // Stable constants — derived from props once, never stale
  const idioma       = profile.idioma ?? 'EN';
  const isES         = idioma === 'ES';
  // Prepended to every system prompt so Jules never re-introduces herself
  const noIntro      = isES
    ? 'CRÍTICO: Ya te presentaste. NUNCA digas tu nombre. NUNCA digas "Soy Jules". NUNCA saludes. Empieza directamente con el contenido.\n\n'
    : 'CRITICAL: You have already introduced yourself. NEVER say your name. NEVER say "I\'m Jules". NEVER greet. Start every response directly with the content.\n\n';
  const picardiaMode = profile.picardia_mode ?? false;
  const daysOfData   = profile.days_of_data ?? 0;
  const name         = profile.nombre ?? '';

  // ── React state (display only) ───────────────────────────────────────────
  const [convState, setConvState]     = useState<ConversationState>('OPENING');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [bioState, setBioState]       = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText]     = useState('');
  const [isMuted, setIsMuted]         = useState(false);

  // ── Refs (mutable — no stale-closure risk) ───────────────────────────────
  const mountedRef      = useRef(false);
  const isProcessingRef = useRef(false);
  const isMutedRef      = useRef(false);
  const recognitionRef  = useRef<any>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const convHistoryRef  = useRef<Message[]>([]);

  // Single ref for all mutable session state
  const sessionRef = useRef({
    id:                 crypto.randomUUID(),
    startTime:          Date.now(),
    slot:               (sessionType === 'adhoc' ? 'adhoc' : getSessionSlot()) as SessionSlot,
    state:              'OPENING' as ConversationState,
    isGap:              false,
    onboardingComplete: !!(profile.onboarding_complete),
  });

  const scoresRef = useRef<SessionScores>({
    factor_fisico: null, factor_cognitivo: null, factor_estres: null,
    factor_ansiedad: null, factor_sueno: null, factor_cafeina: null,
    factor_emocional: null, factor_social: null, factor_sexual: null,
    factor_hidratacion: null, factor_alcohol: null,
    day_rating: null, day_memory: null,
  });

  // Sync isMuted → ref
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Persist session to localStorage on every stable state change
  useEffect(() => {
    if (messages.length === 0) return;
    if (convState === 'SESSION_COMPLETE') {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_RECOVERY_KEY);
      return;
    }
    const stableStates: ConversationState[] = [
      'ENERGY_Q','COGNITIVE_Q','STRESS_Q','ANXIETY_Q','SLEEP_Q','CAFFEINE_Q',
      'EMOTIONAL_Q','SOCIAL_Q','SEXUAL_Q','HYDRATION_Q','DAY_RATING_Q','MEMORABLE_Q',
      'ALCOHOL_Q','ADHOC','EXPLAIN_OFFER','MONEY_OFFER',
    ];
    if (!stableStates.includes(sessionRef.current.state)) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        state: sessionRef.current.state,
        sessionId: sessionRef.current.id,
        slot: sessionRef.current.slot,
        scores: scoresRef.current,
        messages: messages.slice(-10),
        isGap: sessionRef.current.isGap,
        onboardingComplete: sessionRef.current.onboardingComplete,
      }));
    } catch { /* storage full */ }
  }, [convState, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Core utilities ────────────────────────────────────────────────────────

  function addJulesMsg(text: string) {
    const msg: Message = { role: 'assistant', content: text };
    convHistoryRef.current = [...convHistoryRef.current, msg];
    setMessages(prev => [...prev, msg]);
  }

  function addUserMsg(text: string) {
    const msg: Message = { role: 'user', content: text };
    convHistoryRef.current = [...convHistoryRef.current, msg];
    setMessages(prev => [...prev, msg]);
  }

  // Every Jules message plays voice. onEnd fires even when muted (enables auto-advance).
  function speak(text: string, onEnd?: () => void) {
    cancelSpeech();
    if (isMutedRef.current) {
      setBioState('idle');
      if (onEnd) setTimeout(onEnd, 400);
      return;
    }
    setBioState('speaking');
    speakWithElevenLabs(text, idioma, picardiaMode, {
      onStart: () => setBioState('speaking'),
      onEnd:   () => { setBioState('idle'); onEnd?.(); },
    });
  }

  // ── API calls ─────────────────────────────────────────────────────────────

  async function callCoachAPI(apiMsgs: Message[], systemPrompt: string, maxTokens = 80): Promise<string> {
    // Anthropic requires first message to be from 'user'
    const firstUser = apiMsgs.findIndex(m => m.role === 'user');
    const safe = firstUser >= 0 ? apiMsgs.slice(firstUser) : apiMsgs;
    try {
      const res  = await fetch('/.netlify/functions/coach', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ model: 'claude-sonnet-4-20250514', messages: safe, system: systemPrompt, max_tokens: maxTokens }),
      });
      const data = await res.json();
      return data.content?.[0]?.text?.trim() ?? '';
    } catch {
      return '';
    }
  }

  async function callAckAPI(qState: ConversationState, userValue: string): Promise<string> {
    const dimLabel = getDimLabel(qState, isES);
    const sys = isES
      ? `${noIntro}Eres Jules, una compañera de IA cálida. Genera EXACTAMENTE UNA oración cálida y breve reconociendo la respuesta del usuario. No hagas preguntas. No des consejos. Solo reconoce. El usuario acaba de decirte que su ${dimLabel} es: ${userValue}.`
      : `${noIntro}You are Jules, a warm AI companion. Generate exactly ONE warm, brief sentence acknowledging the user's response. Do not ask follow-up questions. Do not give advice. Just acknowledge. The user just told you their ${dimLabel} is: ${userValue}.`;
    const text = await callCoachAPI(convHistoryRef.current, sys, 60);
    return text || (isES ? 'Anotado.' : 'Got it.');
  }

  async function callOpeningAPI(): Promise<string> {
    if (daysOfData >= 90 && profile.pattern_summary) {
      const sys = isES
        ? `${noIntro}Eres Jules. Una oración de pronóstico biológico para los próximos 3–7 días basado en fase actual. Sé específica y confiada. Máximo 25 palabras. Patrones: ${profile.pattern_summary}`
        : `${noIntro}You are Jules. One biological forecast sentence for next 3–7 days based on current phase. Be specific and confident. Max 25 words. Patterns: ${profile.pattern_summary}`;
      return await callCoachAPI([{ role: 'user', content: 'Generate forecast.' }], sys, 50);
    }
    if (daysOfData >= 30) {
      const sys = isES
        ? `${noIntro}Eres Jules. El usuario tiene ${daysOfData} días de datos. Una oración de observación de patrón. Empieza con "He notado..." Máximo 20 palabras.`
        : `${noIntro}You are Jules. The user has ${daysOfData} days of data. One pattern observation sentence. Frame as "I've been noticing..." Max 20 words.`;
      return await callCoachAPI([{ role: 'user', content: 'Generate observation.' }], sys, 40);
    }
    return '';
  }

  // ── DB helpers ────────────────────────────────────────────────────────────

  function dbSlot(): 'morning' | 'afternoon' | 'night' {
    const s = sessionRef.current.slot;
    if (s === 'morning' || s === 'afternoon' || s === 'night') return s;
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'night';
  }

  async function saveInterrupted(state: ConversationState) {
    try {
      await supabase.from('conversation_sessions').upsert({
        id: sessionRef.current.id,
        user_id: profile.id,
        session_date: new Date().toISOString().split('T')[0],
        time_slot: dbSlot(),
        phase_at_session: `day_${daysOfData}`,
        personality_mode: picardiaMode ? 'sienna' : 'jules',
        session_complete: false,
        manual_entry: false,
        interrupted_at_state: state,
        ...scoresRef.current,
      });
    } catch { /* non-blocking */ }
  }

  async function saveComplete() {
    try {
      const duration = Math.floor((Date.now() - sessionRef.current.startTime) / 1000);
      await supabase.from('conversation_sessions').upsert({
        id: sessionRef.current.id,
        user_id: profile.id,
        session_date: new Date().toISOString().split('T')[0],
        time_slot: dbSlot(),
        phase_at_session: `day_${daysOfData}`,
        personality_mode: picardiaMode ? 'sienna' : 'jules',
        session_complete: true,
        manual_entry: false,
        session_duration_seconds: duration,
        interrupted_at_state: null,
        ...scoresRef.current,
      });
      await supabase.from('profiles').update({ days_of_data: daysOfData + 1 }).eq('id', profile.id);
    } catch (err) {
      console.error('saveComplete error:', err);
    }
  }

  async function markOnboardingComplete() {
    sessionRef.current.onboardingComplete = true;
    try {
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', profile.id);
    } catch { /* non-blocking */ }
  }

  // ── State machine: question display ───────────────────────────────────────

  function showQuestion(state: ConversationState) {
    const text = getQuestionText(state, name, sessionRef.current.slot, isES);
    sessionRef.current.state = state;
    setConvState(state);
    addJulesMsg(text);
    speak(text); // user answers — no onEnd advance
  }

  function enterFirstDimension() {
    const slot = sessionRef.current.slot;
    if (slot === 'adhoc') {
      sessionRef.current.state = 'ADHOC';
      setConvState('ADHOC');
    } else {
      showQuestion(getFirstQForSlot(slot));
    }
  }

  // ── State machine: session complete ───────────────────────────────────────

  function enterSessionComplete() {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_RECOVERY_KEY);
    const text = getCompletionText(sessionRef.current.slot, name, isES);
    sessionRef.current.state = 'SESSION_COMPLETE';
    setConvState('SESSION_COMPLETE');
    addJulesMsg(text);
    speak(text, () => void saveComplete());
  }

  // ── State machine: crisis ─────────────────────────────────────────────────

  function handleCrisis() {
    const line1 = isES
      ? 'Lo que compartes importa. Por favor comunícate con la Línea de Crisis: 988 (EE.UU.) o tu línea de emergencia local. No estás solo/a.'
      : 'What you are sharing matters. Please reach out to the Crisis Lifeline: 988 (US) or your local emergency line. You are not alone.';
    const line2 = isES
      ? 'Estoy aquí contigo en este momento. ¿Puedes contarme más sobre cómo te sientes?'
      : 'I am here with you right now. Can you tell me more about what you are feeling?';
    addJulesMsg(line1);
    speak(line1, () => {
      addJulesMsg(line2);
      speak(line2);
      sessionRef.current.state = 'ADHOC';
      setConvState('ADHOC');
    });
  }

  // ── State machine: dimension answer ───────────────────────────────────────

  async function processAnswer(qState: ConversationState, rawInput: string) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      applyScore(qState, rawInput, scoresRef.current);
      addUserMsg(rawInput);

      const ackState = (qState.replace('_Q', '_ACK')) as ConversationState;
      const nextQ    = getNextQState(qState, sessionRef.current.slot, sessionRef.current.isGap);

      sessionRef.current.state = ackState;
      setConvState(ackState); // shows 'none' input UI — no input while Jules responds
      await saveInterrupted(ackState);

      setBioState('thinking');
      const ackText = await callAckAPI(qState, rawInput);
      setBioState('idle');

      addJulesMsg(ackText);
      speak(ackText, () => {
        if (nextQ === 'SESSION_COMPLETE') {
          enterSessionComplete();
        } else {
          showQuestion(nextQ as ConversationState);
        }
      });
    } finally {
      isProcessingRef.current = false;
    }
  }

  // ── State machine: onboarding yes/no ──────────────────────────────────────

  async function handleOnboardingChoice(state: ConversationState, choice: string) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      const yes = choice === 'Yes' || choice === 'Sí' || choice === 'Si';
      addUserMsg(choice);

      if (state === 'EXPLAIN_OFFER') {
        if (yes) {
          sessionRef.current.state = 'EXPLAINING';
          setConvState('EXPLAINING');
          setBioState('thinking');
          const sys = isES
            ? `${noIntro}Eres Jules. Explica BioCycle en exactamente 2 oraciones: qué aprende sobre el usuario con el tiempo, y cómo predice su estado biológico futuro.`
            : `${noIntro}You are Jules. Explain BioCycle in exactly 2 sentences: what it learns about the user over time, and how it predicts their future biological state.`;
          const text = await callCoachAPI(convHistoryRef.current, sys, 80);
          setBioState('idle');
          const explanation = text || (isES
            ? 'BioCycle aprende tus patrones hormonales y biológicos únicos con el tiempo. Con esos datos, puede predecir cómo te sentirás antes de que lo sientas tú.'
            : "BioCycle learns your unique hormonal and biological patterns over time. With that data, it can predict how you'll feel before you feel it yourself.");
          addJulesMsg(explanation);
          speak(explanation, () => {
            // Auto-advance to money offer after explaining BioCycle
            const q = getQuestionText('MONEY_OFFER', name, sessionRef.current.slot, isES);
            sessionRef.current.state = 'MONEY_OFFER';
            setConvState('MONEY_OFFER');
            addJulesMsg(q);
            speak(q);
          });
        } else {
          // Skip → money offer
          const q = getQuestionText('MONEY_OFFER', name, sessionRef.current.slot, isES);
          sessionRef.current.state = 'MONEY_OFFER';
          setConvState('MONEY_OFFER');
          addJulesMsg(q);
          speak(q);
        }
      } else if (state === 'MONEY_OFFER') {
        if (yes) {
          const explanation = isES
            ? 'Tus registros diarios construyen un perfil biológico que los investigadores pagan por acceder. Cuanto más constante seas, más vale tu información.'
            : 'Your daily check-ins build a biological dataset that researchers pay to access. The more consistent you are, the more your data is worth.';
          sessionRef.current.state = 'MONEY_EXPLAINING';
          setConvState('MONEY_EXPLAINING');
          addJulesMsg(explanation);
          await markOnboardingComplete();
          isProcessingRef.current = false; // reset before callback so first question is answerable
          speak(explanation, () => enterFirstDimension());
          return; // skip finally-reset (already done above)
        } else {
          await markOnboardingComplete();
          isProcessingRef.current = false; // reset before entering dimension so answers aren't blocked
          enterFirstDimension();
          return; // skip finally-reset (already done above)
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  }

  // ── State machine: free ADHOC conversation ────────────────────────────────

  async function handleAdhocMessage(userText: string) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      addUserMsg(userText);
      setBioState('thinking');
      const sys = isES
        ? `${noIntro}Eres Jules, una compañera de IA cálida de BioCycle. Responde en español. Sé cálida, breve (2–3 oraciones máximo) y directa.`
        : `${noIntro}You are Jules, a warm AI companion inside BioCycle. Respond in English. Be warm, brief (2–3 sentences max), and direct.`;
      const text = await callCoachAPI(convHistoryRef.current, sys, 150);
      setBioState('idle');
      if (!text) return;
      if (hasCrisisContent(text)) {
        await logSafetyEvent(profile.id, text, 'ai_response');
        handleCrisis();
        return;
      }
      addJulesMsg(text);
      speak(text);
    } finally {
      isProcessingRef.current = false;
    }
  }

  // ── Main input dispatcher ─────────────────────────────────────────────────

  async function handleUserInput(raw: string) {
    const text = raw.trim();
    if (!text) return;
    const state = sessionRef.current.state;

    // Crisis check — intercepts all states
    if (hasCrisisContent(text)) {
      void logSafetyEvent(profile.id, text, 'user_input');
      addUserMsg(text);
      handleCrisis();
      return;
    }

    // "How does BioCycle work?" — works in any state
    const lc = text.toLowerCase();
    if (
      state !== 'EXPLAIN_OFFER' && state !== 'MONEY_OFFER' &&
      (lc.includes('how does biocycle work') || lc.includes('cómo funciona biocycle') || lc.includes('como funciona biocycle'))
    ) {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      try {
        addUserMsg(text);
        setBioState('thinking');
        const sys = isES
          ? `${noIntro}Eres Jules. Explica BioCycle en exactamente 2 oraciones.`
          : `${noIntro}You are Jules. Explain BioCycle in exactly 2 sentences.`;
        const reply = await callCoachAPI(convHistoryRef.current, sys, 80);
        setBioState('idle');
        if (reply) { addJulesMsg(reply); speak(reply); }
      } finally {
        isProcessingRef.current = false;
      }
      return;
    }

    switch (state) {
      case 'EXPLAIN_OFFER':
      case 'MONEY_OFFER':
        await handleOnboardingChoice(state, text);
        break;
      case 'ENERGY_Q':
      case 'COGNITIVE_Q':
      case 'STRESS_Q':
      case 'ANXIETY_Q':
      case 'SLEEP_Q':
      case 'CAFFEINE_Q':
      case 'EMOTIONAL_Q':
      case 'SOCIAL_Q':
      case 'SEXUAL_Q':
      case 'HYDRATION_Q':
      case 'DAY_RATING_Q':
      case 'MEMORABLE_Q':
      case 'ALCOHOL_Q':
        await processAnswer(state, text);
        break;
      case 'ADHOC':
        await handleAdhocMessage(text);
        break;
      default:
        // ACK / OPENING / transition states — ignore input until Jules finishes
        break;
    }
  }

  // ── Voice recognition ─────────────────────────────────────────────────────

  function startListening() {
    if (bioState === 'speaking' || bioState === 'thinking') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang           = isES ? 'es-ES' : 'en-US';
    rec.continuous     = true;
    rec.interimResults = true;
    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const t = e.results[i][0].transcript.trim();
          if (t) { rec.stop(); setIsListening(false); setBioState('idle'); setInputText(t); }
        }
      }
    };
    rec.onerror = () => { setIsListening(false); setBioState('idle'); };
    rec.onend   = () => { setIsListening(false); };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
    setBioState('listening');
  }

  function stopListening() {
    recognitionRef.current?.stop();
    setIsListening(false);
    setBioState('idle');
  }

  function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    void handleUserInput(text);
  }

  // ── Mount: interrupted recovery → gap check → opening ────────────────────

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    void (async () => {
      // 0. Fast restore from localStorage (skips DB round-trip on nav back)
      const savedRaw = localStorage.getItem(LS_KEY);
      if (savedRaw) {
        try {
          const saved    = JSON.parse(savedRaw);
          const todayStr = new Date().toISOString().split('T')[0];
          // Fix 3: date check runs FIRST — before any recovery message
          // Fix 2: never restore an adhoc session — not worth recovering
          const isStale  = saved.date !== todayStr
            || saved.state === 'SESSION_COMPLETE'
            || saved.state === 'ADHOC'
            || saved.slot  === 'adhoc'
            || !saved.sessionId
            || !saved.state;
          if (isStale) {
            localStorage.removeItem(LS_KEY);
            localStorage.removeItem(LS_RECOVERY_KEY);
            // fall through to fresh start
          } else {
            // Fix 1: loop detection — if recovery fires more than once, the save is corrupted
            const recoveryCount = parseInt(localStorage.getItem(LS_RECOVERY_KEY) ?? '0');
            if (recoveryCount > 1) {
              localStorage.removeItem(LS_KEY);
              localStorage.removeItem(LS_RECOVERY_KEY);
              // fall through to fresh start
            } else {
              localStorage.setItem(LS_RECOVERY_KEY, String(recoveryCount + 1));
              sessionRef.current.id = saved.sessionId;
              if (saved.slot) sessionRef.current.slot = saved.slot;
              sessionRef.current.isGap = !!saved.isGap;
              sessionRef.current.onboardingComplete = !!saved.onboardingComplete;
              if (saved.scores) scoresRef.current = saved.scores;
              if (saved.messages?.length > 0) {
                convHistoryRef.current = saved.messages;
                setMessages(saved.messages);
              }
              let restoreState = (saved.state as ConversationState) || 'ENERGY_Q';
              if (restoreState.endsWith('_ACK')) {
                restoreState = restoreState.replace('_ACK', '_Q') as ConversationState;
              }
              // Set a neutral state first so input is hidden while Jules speaks
              sessionRef.current.state = 'INTERRUPTED_RECOVERY';
              setConvState('INTERRUPTED_RECOVERY');
              const resumeMsg = isES ? 'Retomemos donde lo dejamos.' : "Let's pick up where we left off.";
              addJulesMsg(resumeMsg);
              speak(resumeMsg, () => showQuestion(restoreState));
              return; // skip DB queries
            }
          }
        } catch {
          localStorage.removeItem(LS_KEY);
          localStorage.removeItem(LS_RECOVERY_KEY);
        }
      }

      // Fetch onboarding_complete and days_of_data fresh — never trust potentially stale prop
      const { data: freshP } = await supabase
        .from('profiles')
        .select('onboarding_complete, days_of_data')
        .eq('id', profile.id)
        .single();
      if (freshP) {
        sessionRef.current.onboardingComplete = !!freshP.onboarding_complete;
      }
      const liveDaysOfData = freshP?.days_of_data ?? daysOfData;

      const today     = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

      // 1. Interrupted session recovery
      const { data: incomplete } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('session_complete', false)
        .gte('session_date', yesterday)
        .not('interrupted_at_state', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (incomplete && incomplete.length > 0) {
        const partial = incomplete[0];
        sessionRef.current.id = partial.id; // reuse so upsert updates rather than inserts
        scoresRef.current = {
          factor_fisico:      partial.factor_fisico      ?? null,
          factor_cognitivo:   partial.factor_cognitivo   ?? null,
          factor_estres:      partial.factor_estres      ?? null,
          factor_ansiedad:    partial.factor_ansiedad    ?? null,
          factor_sueno:       partial.factor_sueno       ?? null,
          factor_cafeina:     partial.factor_cafeina     ?? null,
          factor_emocional:   partial.factor_emocional   ?? null,
          factor_social:      partial.factor_social      ?? null,
          factor_sexual:      partial.factor_sexual      ?? null,
          factor_hidratacion: partial.factor_hidratacion ?? null,
          factor_alcohol:     partial.factor_alcohol     ?? null,
          day_rating:         partial.day_rating         ?? null,
          day_memory:         partial.day_memory         ?? null,
        };
        const savedState = (partial.interrupted_at_state as ConversationState) || 'ENERGY_Q';
        // If we saved an ACK state, resume from the corresponding Q (ACK not yet spoken)
        const resumeQ = savedState.endsWith('_ACK')
          ? (savedState.replace('_ACK', '_Q') as ConversationState)
          : savedState;
        const resumeText = isES
          ? 'Parece que nos cortamos. Sigamos donde quedamos.'
          : 'Looks like we got cut off. Let me pick up where we left off.';
        sessionRef.current.state = 'INTERRUPTED_RECOVERY';
        setConvState('INTERRUPTED_RECOVERY');
        addJulesMsg(resumeText);
        speak(resumeText, () => showQuestion(resumeQ));
        return;
      }

      // 2. Gap detection (1–6 days since last completed session)
      const { data: lastSessions } = await supabase
        .from('conversation_sessions')
        .select('session_date')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false })
        .limit(1);

      if (lastSessions && lastSessions.length > 0) {
        const last = lastSessions[0].session_date;
        const diff = Math.floor((Date.parse(today) - Date.parse(last)) / 86_400_000);
        if (diff >= 1 && diff <= 6) sessionRef.current.isGap = true;
      }

      // 3. Opening message — always start clean (no stale messages from prior sessions)
      setMessages([]);
      convHistoryRef.current = [];
      let openingText = '';
      const slot = sessionRef.current.slot;
      if (sessionRef.current.isGap) {
        openingText = isES
          ? `Hola ${name} — qué bueno verte. Han pasado unos días.`
          : `Hey ${name} — good to have you back. It's been a few days.`;
      } else if (liveDaysOfData === 0) {
        openingText = isES
          ? `Hola ${name}, soy Jules — me alegra mucho que estés aquí.`
          : `Hi ${name}, I'm Jules — really glad you're here.`;
      } else if (liveDaysOfData < 30) {
        const slotLabel = isES
          ? (slot === 'morning' ? 'días' : slot === 'afternoon' ? 'tardes' : 'noches')
          : (slot === 'morning' ? 'morning' : slot === 'afternoon' ? 'afternoon' : 'evening');
        openingText = isES
          ? `Hola ${name}, buenos ${slotLabel}. Día ${liveDaysOfData} — estás construyendo algo real.`
          : `Hey ${name}, good ${slotLabel}. Day ${liveDaysOfData} — you're building something real.`;
      } else {
        setBioState('thinking');
        const api = await callOpeningAPI();
        setBioState('idle');
        const greeting = isES ? `Hola ${name}. ` : `Hey ${name}. `;
        openingText = api
          ? `${greeting}${api}`
          : (isES
            ? `Hola ${name}. He estado notando algunos patrones — hagamos el check-in.`
            : `Hey ${name}. I've been noticing some patterns — let's check in.`);
      }

      sessionRef.current.state = 'OPENING';
      setConvState('OPENING');
      addJulesMsg(openingText);

      speak(openingText, () => {
        if (sessionRef.current.isGap) {
          // Gap session: just energy + stress
          showQuestion('ENERGY_Q');
        } else if (liveDaysOfData === 0 && !sessionRef.current.onboardingComplete) {
          // Day 1 onboarding
          showQuestion('EXPLAIN_OFFER');
        } else if (slot === 'adhoc') {
          // Free conversation — prompt the user so they know what to do
          const promptMsg = isES ? '¿Qué tienes en mente?' : "What's on your mind?";
          sessionRef.current.state = 'ADHOC';
          setConvState('ADHOC');
          addJulesMsg(promptMsg);
          speak(promptMsg);
        } else {
          enterFirstDimension();
        }
      });
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived render values ─────────────────────────────────────────────────

  const inputUI    = getInputUI(convState);
  const choiceOpts = getChoiceOptions(convState, isES);
  const isBusy     = bioState === 'speaking' || bioState === 'thinking';

  const phase      = daysOfData < 30 ? 'LEARNING' : daysOfData < 90 ? 'CALIBRATION' : 'COMPANION';
  const phaseColor = { LEARNING: '#FFD93D', CALIBRATION: '#7B61FF', COMPANION: '#00C896' }[phase];
  const phaseLabel = isES
    ? { LEARNING: '● APRENDIENDO', CALIBRATION: '● CALIBRANDO', COMPANION: '● COMPAÑERO' }[phase]
    : { LEARNING: '● LEARNING',    CALIBRATION: '● CALIBRATING', COMPANION: '● COMPANION'  }[phase];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      height: '100dvh', width: '100%', maxWidth: '100vw',
      background: '#0A0A1A', display: 'flex', flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden',
    }}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#4A5568', cursor: 'pointer', fontSize: 20, padding: '4px 8px' }}>
          ←
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <QuantumDNA size={44} state={bioState} />
          <span style={{ fontSize: 9, letterSpacing: '0.1em', color: phaseColor, fontFamily: 'JetBrains Mono, monospace' }}>
            {phaseLabel}
          </span>
        </div>
        <div style={{ width: 44 }} />
      </div>

      {/* Floating mute button — fixed so it's always accessible */}
      <button
        onClick={() => setIsMuted(m => !m)}
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 100,
          background: 'rgba(10,10,26,0.85)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '50%', width: 40, height: 40,
          cursor: 'pointer', fontSize: 18, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && isBusy && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
            <QuantumDNA size={80} state="thinking" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
            {msg.role === 'assistant' && (
              <div style={{ flexShrink: 0, marginBottom: 2 }}><QuantumDNA size={28} state="idle" /></div>
            )}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user' ? 'rgba(255,107,107,0.12)' : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user' ? '1px solid rgba(255,107,107,0.2)' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
            }}>
              <p style={{ color: msg.role === 'user' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.9)', fontSize: '0.9rem', lineHeight: 1.55, margin: 0 }}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Thinking indicator */}
        {isBusy && messages.length > 0 && bioState === 'thinking' && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <QuantumDNA size={28} state="thinking" />
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.9rem', margin: 0 }}>···</p>
            </div>
          </div>
        )}

        {/* Session complete card */}
        {convState === 'SESSION_COMPLETE' && (
          <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 14, padding: '16px', textAlign: 'center' }}>
            <p style={{ color: '#00C896', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
              {isES ? '✓ Sesión guardada' : '✓ Session saved'}
            </p>
            <p style={{ color: '#4A5568', fontSize: 12, margin: '4px 0 0' }}>
              {isES ? 'Tus datos se han registrado.' : 'Your data has been recorded.'}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      {convState !== 'SESSION_COMPLETE' && !isBusy && (
        <div style={{
          flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0A0A1A', padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
        }}>
          {inputUI === 'numberpad' && <NumberPad onSelect={n => void handleUserInput(String(n))} />}
          {inputUI === 'choices' && choiceOpts.length > 0 && <ChoiceButtons options={choiceOpts} onSelect={v => void handleUserInput(v)} />}

          {/* Text input row — always visible as fallback */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: inputUI !== 'none' && inputUI !== 'voice' ? 8 : 0 }}>
            <button
              onClick={() => isListening ? stopListening() : startListening()}
              disabled={isBusy}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: isListening ? 'rgba(255,107,107,0.2)' : 'rgba(255,255,255,0.06)',
                border: isListening ? '1px solid rgba(255,107,107,0.5)' : '1px solid rgba(255,255,255,0.1)',
                cursor: isBusy ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, opacity: isBusy ? 0.4 : 1,
              }}
            >
              {isListening ? '⏹' : '🎤'}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder={
                inputUI === 'numberpad' ? (isES ? 'o escribe un número...' : 'or type a number...') :
                inputUI === 'choices'   ? (isES ? 'o escribe aquí...'     : 'or type here...') :
                (isES ? 'Escribe algo...' : 'Type something...')
              }
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, padding: '11px 14px', color: 'white',
                fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              style={{
                width: 44, height: 44, borderRadius: '50%',
                background: inputText.trim() ? '#FF6B6B' : 'rgba(255,255,255,0.06)',
                border: 'none', cursor: inputText.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0, color: 'white',
                opacity: inputText.trim() ? 1 : 0.3,
              }}
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
