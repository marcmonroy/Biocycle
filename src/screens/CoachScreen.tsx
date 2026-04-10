// CoachScreen — Session 2 — Jules Deterministic State Machine
// Anthropic API called ONLY for ACK sentences and phase-specific openings.
// Every question is hardcoded. Every state is explicit. Jules never drifts.

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { QuantumDNA } from '../components/QuantumDNA';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';
import { setDebug } from '../components/DebugOverlay';
import { BottomNav } from '../components/BottomNav';
import type { Tab } from '../components/BottomNav';
import { getCurrentPhase } from '../lib/phaseEngine';
import { RelationshipCategorySelector } from '../components/RelationshipCategorySelector';

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
  | 'RELATIONSHIP_NAME_Q' | 'RELATIONSHIP_CATEGORY'
  | 'RELATIONSHIP_SCORE_Q' | 'RELATIONSHIP_SCORE_ACK'
  | 'INSTRUMENT_INTRO' | 'INSTRUMENT_Q' | 'INSTRUMENT_COMPLETE'
  | 'SESSION_COMPLETE'
  | 'INTERRUPTED_RECOVERY'
  | 'ADHOC';

type SessionSlot = 'morning' | 'afternoon' | 'night';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SessionScores {
  factor_energia: number | null;
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

// ── Session helpers ───────────────────────────────────────────────────────

function getSessionSlot(): 'morning' | 'afternoon' | 'night' {
  const h = new Date().getHours();
  if (h >= 17) return 'night';
  if (h >= 12) return 'afternoon';
  return 'morning'; // covers hours 0-11, no exceptions, no adhoc ever
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
      case 'ALCOHOL_Q':      return 'Última pregunta — ¿tomaste algo de alcohol hoy?';
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
    case 'ALCOHOL_Q':      return 'Last one — any alcohol today?';
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

type InputUI = 'numberpad' | 'choices' | 'text' | 'relationship_category' | 'instrument_pad' | 'none';

function getInputUI(state: ConversationState): InputUI {
  const NUMBERPAD_STATES = [
    'ENERGY_Q', 'COGNITIVE_Q', 'STRESS_Q', 'ANXIETY_Q',
    'EMOTIONAL_Q', 'SOCIAL_Q', 'SEXUAL_Q', 'DAY_RATING_Q',
    'RELATIONSHIP_SCORE_Q',
  ];
  if (NUMBERPAD_STATES.includes(state)) {
    const result: InputUI = 'numberpad';
    console.log('[getInputUI] state:', state, 'result:', result);
    setDebug('inputUI', result);
    return result;
  }
  if (state === 'MEMORABLE_Q') {
    console.log('[getInputUI] state:', state, 'result: text');
    setDebug('inputUI', 'text');
    return 'text';
  }
  if (state === 'RELATIONSHIP_NAME_Q') { setDebug('inputUI', 'text'); return 'text'; }
  if (state === 'RELATIONSHIP_CATEGORY') { setDebug('inputUI', 'relationship_category'); return 'relationship_category'; }
  if (state === 'INSTRUMENT_Q') { setDebug('inputUI', 'instrument_pad'); return 'instrument_pad'; }
  const choices: ConversationState[] = ['SLEEP_Q','CAFFEINE_Q','HYDRATION_Q','ALCOHOL_Q','EXPLAIN_OFFER','MONEY_OFFER'];
  const result: InputUI = choices.includes(state) ? 'choices' : 'none';
  // ADHOC and all ACK/transition states → 'none' (shows mic + text fallback)
  console.log('[getInputUI] state:', state, 'result:', result);
  setDebug('inputUI', result);
  return result;
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

// ── Score application ─────────────────────────────────────────────────────

function applyScore(state: ConversationState, raw: string, scores: SessionScores): void {
  const n = parseInt(raw, 10);
  switch (state) {
    case 'ENERGY_Q':    scores.factor_energia   = isNaN(n) ? null : Math.min(10, Math.max(1, n)); break;
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

// ── Validated Instrument Data ─────────────────────────────────────────────

const INSTRUMENT_QUESTIONS: Record<string, { en: string[]; es: string[] }> = {
  PHQ9: {
    en: [
      'Little interest or pleasure in doing things — 0 to 3.',
      'Feeling down, depressed, or hopeless — 0 to 3.',
      'Trouble falling or staying asleep, or sleeping too much — 0 to 3.',
      'Feeling tired or having little energy — 0 to 3.',
      'Poor appetite or overeating — 0 to 3.',
      'Feeling bad about yourself — or that you are a failure — 0 to 3.',
      'Trouble concentrating on things — 0 to 3.',
      'Moving or speaking so slowly that others noticed — or the opposite — 0 to 3.',
      'Thoughts of being better off dead or of hurting yourself — 0 to 3.',
    ],
    es: [
      'Poco interés o placer en hacer las cosas — del 0 al 3.',
      'Sentirse decaído, deprimido o sin esperanza — del 0 al 3.',
      'Problemas para dormir o dormir demasiado — del 0 al 3.',
      'Sentirse cansado o con poca energía — del 0 al 3.',
      'Poco apetito o comer en exceso — del 0 al 3.',
      'Sentirse mal consigo mismo — del 0 al 3.',
      'Dificultad para concentrarse — del 0 al 3.',
      'Moverse o hablar lento que otros lo notaron — del 0 al 3.',
      'Pensamientos de que estarías mejor muerto — del 0 al 3.',
    ],
  },
  GAD7: {
    en: [
      'Feeling nervous, anxious, or on edge — 0 to 3.',
      'Not being able to stop or control worrying — 0 to 3.',
      'Worrying too much about different things — 0 to 3.',
      'Trouble relaxing — 0 to 3.',
      'Being so restless it is hard to sit still — 0 to 3.',
      'Becoming easily annoyed or irritable — 0 to 3.',
      'Feeling afraid as if something awful might happen — 0 to 3.',
    ],
    es: [
      'Sentirse nervioso, ansioso o al límite — del 0 al 3.',
      'No poder dejar de preocuparse — del 0 al 3.',
      'Preocuparse demasiado por diferentes cosas — del 0 al 3.',
      'Dificultad para relajarse — del 0 al 3.',
      'Estar tan inquieto que es difícil quedarse quieto — del 0 al 3.',
      'Irritarse o enojarse fácilmente — del 0 al 3.',
      'Sentir miedo como si algo terrible pudiera pasar — del 0 al 3.',
    ],
  },
  PSQI: {
    en: [
      'Rate your overall sleep quality this past month — 0 very good, 1 fairly good, 2 fairly bad, 3 very bad.',
      'How often could not fall asleep within 30 minutes — 0 not at all, 1 less than once a week, 2 once or twice, 3 three or more times.',
      'How often woke up in the middle of the night — 0 not at all to 3 three or more times a week.',
      'How often heat, cold, or bad dreams disrupted sleep — 0 not at all to 3 three or more times.',
      'How often had trouble staying awake during the day — 0 not at all to 3 three or more times.',
      'How much of a problem keeping enthusiasm for things — 0 no problem to 3 very big problem.',
      'Overall sleep quality this past month — 0 very good to 3 very bad.',
    ],
    es: [
      'Califica tu calidad de sueño del último mes — 0 muy buena, 1 bastante buena, 2 bastante mala, 3 muy mala.',
      'Con qué frecuencia tardaste más de 30 minutos en dormir — 0 nunca, 1 menos de una vez, 2 una o dos veces, 3 tres o más.',
      'Con qué frecuencia te despertaste en la noche — 0 nunca a 3 tres o más veces.',
      'Con qué frecuencia el calor, frío o malos sueños interrumpieron tu sueño — 0 nunca a 3 tres o más veces.',
      'Con qué frecuencia tuviste somnolencia de día — 0 nunca a 3 tres o más veces.',
      'Qué tan problemático fue mantener el entusiasmo — 0 ningún problema a 3 muy grande.',
      'En general calidad de sueño del último mes — 0 muy buena a 3 muy mala.',
    ],
  },
  PSS: {
    en: [
      'In the last month how often felt unable to control important things — 0 never to 4 very often.',
      'How often felt confident handling personal problems — 0 never to 4 very often.',
      'How often felt things were going your way — 0 never to 4 very often.',
      'How often felt difficulties were piling up so high you could not overcome them — 0 never to 4 very often.',
    ],
    es: [
      'En el último mes con qué frecuencia no podías controlar cosas importantes — 0 nunca a 4 muy seguido.',
      'Con qué frecuencia te sentiste seguro para manejar problemas — 0 nunca a 4 muy seguido.',
      'Con qué frecuencia sentiste que las cosas iban bien — 0 nunca a 4 muy seguido.',
      'Con qué frecuencia las dificultades se acumulaban tanto que no podías superarlas — 0 nunca a 4 muy seguido.',
    ],
  },
};

function calculateInstrumentScore(instrument: string, responses: number[]): number {
  switch (instrument) {
    case 'PHQ9': return responses.reduce((a, b) => a + b, 0);
    case 'GAD7': return responses.reduce((a, b) => a + b, 0);
    case 'PSQI': return responses.reduce((a, b) => a + b, 0);
    case 'PSS':  return responses[0] + responses[3] + (4 - responses[1]) + (4 - responses[2]);
    default:     return 0;
  }
}

function InstrumentPad({ maxValue, onSelect }: { maxValue: 3 | 4; onSelect: (n: number) => void }) {
  const options = Array.from({ length: maxValue + 1 }, (_, i) => i);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${maxValue + 1}, 1fr)`, gap: 8, padding: '8px 0' }}>
      {options.map(n => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          style={{
            background: 'rgba(0,200,150,0.1)',
            border: '1px solid rgba(0,200,150,0.25)',
            borderRadius: 10,
            padding: '14px 0',
            color: '#00C896',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1.1rem',
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

// ── Main Component ────────────────────────────────────────────────────────

interface Props {
  profile: Profile;
  onBack: () => void;
  onNavigate?: (tab: Tab) => void;
}

export function CoachScreen({ profile, onBack, onNavigate }: Props) {
  // Stable constants — derived from props once, never stale
  const idioma       = profile.idioma ?? 'EN';
  const isES         = idioma === 'ES';
  // Prepended to every system prompt so Jules never re-introduces herself
  const noIntro      = isES
    ? 'CRÍTICO: Ya te presentaste. NUNCA digas tu nombre. NUNCA digas "Soy Jules". NUNCA saludes. Empieza directamente con el contenido.\n\n'
    : 'CRITICAL: You have already introduced yourself. NEVER say your name. NEVER say "I\'m Jules". NEVER greet. Start every response directly with the content.\n\n';
  const picardiaMode = profile.picardia_mode ?? false;

  const name         = profile.nombre ?? '';

  // ── React state (display only) ───────────────────────────────────────────
  const [convState, setConvState]     = useState<ConversationState>('OPENING');
  const [messages, setMessages]       = useState<Message[]>([]);
  const [bioState, setBioState]       = useState<'idle'|'listening'|'thinking'|'speaking'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText]     = useState('');
  const [isMuted, setIsMuted]         = useState(false);

  // ── Refs (mutable — no stale-closure risk) ───────────────────────────────
  const isProcessingRef = useRef(false);
  const isMutedRef      = useRef(false);
  const liveDaysRef     = useRef(profile.days_of_data ?? 0);
  const recognitionRef  = useRef<any>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const convHistoryRef  = useRef<Message[]>([]);

  // Single ref for all mutable session state
  const sessionRef = useRef({
    id:                     crypto.randomUUID(),
    startTime:              Date.now(),
    slot:                   getSessionSlot(),
    state:                  'OPENING' as ConversationState,
    isGap:                  false,
    onboardingComplete:     !!(profile.onboarding_complete),
    sessionContext:         '',
    // Session 3 — Relationship Circle
    totalSessions:          0,
    relationshipsCollected: 0,
    collectedThisSession:   false,
    pendingRelationshipName:'',
    scoringRelationship:    null as { id: string; name: string; rank: number; intimacy: boolean } | null,
    // Session 5 — Validated Instruments
    instrumentPending:       null as string | null,
    instrumentResponses:     [] as number[],
    instrumentQuestionIndex: 0,
    instrumentSessionId:     '',
  });

  const scoresRef = useRef<SessionScores>({
    factor_energia: null, factor_cognitivo: null, factor_estres: null,
    factor_ansiedad: null, factor_sueno: null, factor_cafeina: null,
    factor_emocional: null, factor_social: null, factor_sexual: null,
    factor_hidratacion: null, factor_alcohol: null,
    day_rating: null, day_memory: null,
  });

  // Sync isMuted → ref
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Debug: track conversation state
  useEffect(() => { setDebug('coachState', convState); }, [convState]);

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
    const ctx = sessionRef.current.sessionContext
      ? `\n\nRecent session context:\n${sessionRef.current.sessionContext}`
      : '';
    const sys = isES
      ? `${noIntro}MODO RESPUESTA BREVE. Genera EXACTAMENTE UNA oración reconociendo lo que dijo el usuario. PROHIBIDO hacer preguntas. PROHIBIDO dar consejos. PROHIBIDO decir tu nombre. Solo una oración de reconocimiento cálido y para. El usuario dijo que su ${dimLabel} es: ${userValue}.${ctx}`
      : `${noIntro}BRIEF ACKNOWLEDGMENT MODE. Generate EXACTLY ONE sentence acknowledging what the user said. FORBIDDEN to ask questions. FORBIDDEN to give advice. FORBIDDEN to say your name. One warm acknowledgment sentence and stop. The user said their ${dimLabel} is: ${userValue}.${ctx}`;
    // For ACK calls, use minimal context — just the user's answer
    const ackMessages: Message[] = [{ role: 'user', content: userValue }];
    const text = await callCoachAPI(ackMessages, sys, 40);
    return text || (isES ? 'Anotado.' : 'Got it.');
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
        phase_at_session: `day_${liveDaysRef.current}`,
        personality_mode: picardiaMode ? 'sienna' : 'jules',
        session_complete: false,
        manual_entry: false,
        interrupted_at_state: state,
        factor_energia:     scoresRef.current.factor_energia     ?? null,
        factor_cognitivo:   scoresRef.current.factor_cognitivo   ?? null,
        factor_estres:      scoresRef.current.factor_estres      ?? null,
        factor_ansiedad:    scoresRef.current.factor_ansiedad    ?? null,
        factor_sueno:       scoresRef.current.factor_sueno       ?? null,
        factor_cafeina:     scoresRef.current.factor_cafeina     ?? null,
        factor_emocional:   scoresRef.current.factor_emocional   ?? null,
        factor_social:      scoresRef.current.factor_social      ?? null,
        factor_sexual:      scoresRef.current.factor_sexual      ?? null,
        factor_hidratacion: scoresRef.current.factor_hidratacion ?? null,
        factor_alcohol:     scoresRef.current.factor_alcohol     ?? null,
        day_rating:         scoresRef.current.day_rating         ?? null,
        day_memory:         scoresRef.current.day_memory         ?? null,
      });
    } catch { /* non-blocking */ }
  }

  async function saveSession() {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('[saveSession] saving for user:', profile.id, 'date:', today, 'slot:', sessionRef.current.slot);

      const { error } = await supabase.from('conversation_sessions').insert({
        user_id:           profile.id,
        session_date:      today,
        session_complete:  true,
        time_slot:         dbSlot(),
        factor_energia:    scoresRef.current.factor_energia     ?? null,
        factor_cognitivo:  scoresRef.current.factor_cognitivo  ?? null,
        factor_estres:     scoresRef.current.factor_estres     ?? null,
        factor_ansiedad:   scoresRef.current.factor_ansiedad   ?? null,
        factor_sueno:      scoresRef.current.factor_sueno      ?? null,
        factor_cafeina:    scoresRef.current.factor_cafeina    ?? null,
        factor_emocional:  scoresRef.current.factor_emocional  ?? null,
        factor_social:     scoresRef.current.factor_social     ?? null,
        factor_sexual:     scoresRef.current.factor_sexual     ?? null,
        factor_hidratacion:scoresRef.current.factor_hidratacion?? null,
        factor_alcohol:    scoresRef.current.factor_alcohol    ?? null,
        day_rating:        scoresRef.current.day_rating        ?? null,
        day_memory:        scoresRef.current.day_memory        ?? null,
      });

      if (error) {
        console.error('[saveSession] ERROR:', error.message, error.details);
        setDebug('lastError', error.message);
        return;
      }

      console.log('[saveSession] saved successfully');

      // Update last_response_date for all users; restore paused users to active_trader
      await supabase.from('user_state')
        .update({ last_response_date: new Date().toISOString() })
        .eq('user_id', profile.id);
      await supabase.from('user_state')
        .update({
          state: 'active_trader',
          returned_at: new Date().toISOString(),
          return_method: 'checkin',
          last_response_date: new Date().toISOString(),
        })
        .eq('user_id', profile.id)
        .eq('state', 'paused_trader');

      // Only increment days_of_data once per calendar day.
      // After insert, query returns 1 if this is the first session today.
      const { data: existingToday } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .eq('session_date', today);

      console.log('[saveSession] sessions today:', existingToday?.length);

      if (existingToday && existingToday.length === 1) {
        // Exactly 1 = the one we just inserted = first completed session today
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ days_of_data: (profile.days_of_data ?? 0) + 1 })
          .eq('id', profile.id);
        if (profileError) {
          console.error('[saveSession] profile update ERROR:', profileError.message);
        } else {
          console.log('[saveSession] days_of_data incremented');
        }
      }
    } catch (err) {
      console.error('[saveSession] unexpected error:', err);
      setDebug('lastError', (err as Error)?.message ?? String(err));
    }
  }

  // ── State machine: question display ───────────────────────────────────────

  function showQuestion(state: ConversationState) {
    const text = getQuestionText(state, name, sessionRef.current.slot, isES);
    sessionRef.current.state = state;
    setConvState(state);
    addJulesMsg(text);
    speak(text, state === 'MEMORABLE_Q' ? () => {
      // Auto-listen after Jules finishes speaking the memorable question
      setTimeout(() => startListening(), 1500);
    } : undefined);
  }

  // ── Validated Instruments ────────────────────────────────────────────────

  function startInstrumentSession() {
    const introText = isES
      ? 'Cada 30 días te hago un conjunto de preguntas validadas clínicamente junto con nuestro check-in regular. Me ayudan a entender tus patrones con más precisión.'
      : 'Every 30 days I ask you a set of clinically validated questions alongside our regular check-in. These help me understand your patterns more accurately.';

    sessionRef.current.state = 'INSTRUMENT_INTRO';
    setConvState('INSTRUMENT_INTRO');
    sessionRef.current.instrumentResponses = [];
    sessionRef.current.instrumentQuestionIndex = 0;
    addJulesMsg(introText);

    speak(introText, () => {
      showInstrumentQuestion();
    });
  }

  function showInstrumentQuestion() {
    const instrument = sessionRef.current.instrumentPending!;
    const idx = sessionRef.current.instrumentQuestionIndex;
    const questions = INSTRUMENT_QUESTIONS[instrument];
    const qList = isES ? questions.es : questions.en;

    if (idx >= qList.length) {
      void finishInstrument();
      return;
    }

    const qText = qList[idx];
    sessionRef.current.state = 'INSTRUMENT_Q';
    setConvState('INSTRUMENT_Q');
    addJulesMsg(qText);
    speak(qText);
  }

  async function handleInstrumentAnswer(value: number) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      addUserMsg(String(value));

      sessionRef.current.instrumentResponses.push(value);
      sessionRef.current.instrumentQuestionIndex++;

      // PHQ-9 Q9 safety check (index 8)
      if (
        sessionRef.current.instrumentPending === 'PHQ9' &&
        sessionRef.current.instrumentQuestionIndex - 1 === 8 &&
        value >= 2
      ) {
        void logSafetyEvent(profile.id, `PHQ9 Q9 score: ${value}`, 'phq9_q9');
        handleCrisis();
        isProcessingRef.current = false;
        return;
      }

      const ackOptions = isES
        ? ['Anotado.', 'Gracias.', 'Entendido.', 'Bien.']
        : ['Got it.', 'Thank you.', 'Noted.', 'Understood.'];
      const ackText = ackOptions[Math.floor(Math.random() * ackOptions.length)];

      addJulesMsg(ackText);
      speak(ackText, () => {
        setTimeout(() => { showInstrumentQuestion(); }, 300);
      });
    } finally {
      isProcessingRef.current = false;
    }
  }

  async function finishInstrument() {
    const instrument = sessionRef.current.instrumentPending!;
    const responses = sessionRef.current.instrumentResponses;
    const score = calculateInstrumentScore(instrument, responses);
    const today = new Date().toISOString().split('T')[0];

    try {
      await supabase.from('validation_scores').insert({
        user_id:      profile.id,
        session_date: today,
        instrument,
        score,
        responses,
        session_id:   sessionRef.current.id,
      });
    } catch (err) {
      console.error('[finishInstrument] save error:', err);
    }

    const sequence = ['PHQ9', 'GAD7', 'PSQI', 'PSS'];
    const currentIdx = sequence.indexOf(instrument);
    const nextInstrument = currentIdx < sequence.length - 1 ? sequence[currentIdx + 1] : null;

    if (nextInstrument) {
      sessionRef.current.instrumentPending = nextInstrument;
      sessionRef.current.instrumentResponses = [];
      sessionRef.current.instrumentQuestionIndex = 0;

      const bridgeText = isES ? 'Perfecto. Ahora el siguiente conjunto.' : 'Perfect. Now the next set.';
      addJulesMsg(bridgeText);
      speak(bridgeText, () => { showInstrumentQuestion(); });
    } else {
      sessionRef.current.instrumentPending = null;

      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30);
      await supabase.from('profiles')
        .update({ validation_due_date: nextDue.toISOString().split('T')[0] })
        .eq('id', profile.id);

      const completeText = isES
        ? 'Listo. Eso es todo para las preguntas de hoy. Ahora sigamos con tu check-in.'
        : "Done. That is all for today's clinical questions. Now let's continue with your check-in.";

      sessionRef.current.state = 'INSTRUMENT_COMPLETE';
      setConvState('INSTRUMENT_COMPLETE');
      addJulesMsg(completeText);
      speak(completeText, () => { enterFirstDimension(); });
    }
  }

  function enterFirstDimension() {
    const slot = sessionRef.current.slot;
    if (slot === 'afternoon') {
      showQuestion('EMOTIONAL_Q');
    } else if (slot === 'night') {
      showQuestion('DAY_RATING_Q');
    } else {
      showQuestion('ENERGY_Q'); // morning — always
    }
  }

  // ── State machine: session complete ───────────────────────────────────────

  // ── Session 3 — Relationship Circle ────────────────────────────────────────

  function enterSessionComplete() {
    void maybeScoreRelationship();
  }

  async function maybeScoreRelationship() {
    // Only score in morning or afternoon sessions
    if (sessionRef.current.slot === 'night') {
      _enterNameCollectionOrClose();
      return;
    }

    const { data: topRelationships } = await supabase
      .from('relationships')
      .select('id, name, rank, intimacy')
      .eq('user_id', profile.id)
      .order('rank', { ascending: true })
      .limit(2);

    if (!topRelationships || topRelationships.length === 0) {
      _enterNameCollectionOrClose();
      return;
    }

    const rel = topRelationships[0] as { id: string; name: string; rank: number; intimacy: boolean };
    sessionRef.current.scoringRelationship = rel;

    const questionText = isES
      ? `¿Cómo estuvo tu tiempo con ${rel.name} hoy? Del 1 al 10.`
      : `How was your time with ${rel.name} today? 1 to 10.`;

    sessionRef.current.state = 'RELATIONSHIP_SCORE_Q';
    setConvState('RELATIONSHIP_SCORE_Q');
    addJulesMsg(questionText);
    speak(questionText);
    // handleUserInput RELATIONSHIP_SCORE_Q case calls _enterNameCollectionOrClose()
  }

  function _enterNameCollectionOrClose() {
    if (shouldCollectRelationship()) {
      collectRelationshipName();
    } else {
      _doSessionComplete();
    }
  }

  function shouldCollectRelationship(): boolean {
    if (sessionRef.current.totalSessions < 2) return false;
    if (sessionRef.current.relationshipsCollected >= 7) return false;
    if (sessionRef.current.collectedThisSession) return false;
    return true;
  }

  function collectRelationshipName() {
    const questionText = isES
      ? `Antes de cerrar — ¿con quién pasas más tiempo? Solo su nombre.`
      : `Before we close — who do you spend the most time with? Just their first name.`;
    sessionRef.current.state = 'RELATIONSHIP_NAME_Q';
    setConvState('RELATIONSHIP_NAME_Q');
    addJulesMsg(questionText);
    speak(questionText);
  }

  async function handleRelationshipCategorySelect(category: string, intimacy: boolean) {
    const personName = sessionRef.current.pendingRelationshipName;
    const newRank = sessionRef.current.relationshipsCollected + 1;

    void supabase.from('relationships').insert({
      user_id: profile.id,
      rank: newRank,
      name: personName,
      category,
      intimacy,
    });

    sessionRef.current.relationshipsCollected = newRank;
    sessionRef.current.collectedThisSession = true;
    sessionRef.current.pendingRelationshipName = '';

    addUserMsg(`${category}${intimacy ? ' ♥' : ''}`);

    const thankMsg = isES
      ? `Gracias. Eso me ayuda a entender mejor tu vida.`
      : `Got it. That helps me understand your life better.`;
    addJulesMsg(thankMsg);

    sessionRef.current.state = 'SESSION_COMPLETE';
    setConvState('SESSION_COMPLETE');

    speak(thankMsg, () => {
      _doSessionComplete();
    });
  }

  function _doSessionComplete() {
    const text = getCompletionText(sessionRef.current.slot, name, isES);
    sessionRef.current.state = 'SESSION_COMPLETE';
    setConvState('SESSION_COMPLETE');
    addJulesMsg(text);
    speak(text, () => void saveSession());
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
        setTimeout(() => {
          if (nextQ === 'SESSION_COMPLETE') {
            enterSessionComplete();
          } else {
            showQuestion(nextQ as ConversationState);
          }
        }, 500);
      });
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
      const ctx = sessionRef.current.sessionContext
        ? `\n\nRecent session context:\n${sessionRef.current.sessionContext}`
        : '';
      const sys = isES
        ? `${noIntro}Eres Jules, compañera de IA cálida de BioCycle. MODO ADHOC.\nTemas permitidos: emociones y patrones emocionales, relaciones y correlación de fase, autopercepción y conciencia corporal, patrones de comportamiento, sueños y calidad del sueño, fuentes de estrés y respuesta física.\nSi el usuario se desvía del tema, reconoce y redirige: "Eso suena a mucho. Me pregunto — ¿cómo está respondiendo tu cuerpo a todo eso?"\nNUNCA: diagnósticos médicos, política, noticias, entretenimiento.\nResponde en 2-3 oraciones máximo. Sé cálida y directa.${ctx}`
        : `${noIntro}You are Jules, BioCycle's warm AI companion. ADHOC MODE.\nPermitted topics: emotions and emotional patterns, relationships and phase correlation, self-perception and body awareness, behavioral patterns across cycles, life events colored by biological state, dreams and sleep quality, stress sources and physical response.\nSteering technique: if user goes off-topic, acknowledge then bridge back: "That sounds like a lot. I am curious — how is your body responding to all of that?"\nNEVER: medical diagnoses, politics, news, entertainment, medical advice.\nRespond in 2-3 sentences maximum. Be warm and direct.${ctx}`;
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
        if (text === 'Yes' || text === 'Sí' || text === 'yes' || text === 'si') {
          const explainText = isES
            ? 'BioCycle aprende tus patrones biológicos a través de conversaciones diarias. Con el tiempo predigo cómo te sentirás antes de que suceda.'
            : 'BioCycle learns your biological patterns through daily conversations. Over time I predict how you will feel before it happens.';
          addJulesMsg(explainText);
          isProcessingRef.current = false;
          speak(explainText, () => {
            showQuestion('MONEY_OFFER');
          });
        } else {
          // NO — skip explanation, go to money offer
          showQuestion('MONEY_OFFER');
        }
        break;

      case 'MONEY_OFFER':
        if (text === 'Yes' || text === 'Sí' || text === 'yes' || text === 'si') {
          const moneyText = isES
            ? 'Tus registros diarios construyen un perfil biológico que los investigadores pagan por acceder. Cuanto más constante seas, más vale tu información.'
            : 'Your daily check-ins build a biological dataset that researchers pay to access. The more consistent you are, the more your data is worth.';
          addJulesMsg(moneyText);
          isProcessingRef.current = false;
          // Mark onboarding complete in Supabase
          void supabase.from('profiles').update({ onboarding_complete: true }).eq('id', profile.id);
          sessionRef.current.onboardingComplete = true;
          speak(moneyText, () => {
            enterFirstDimension();
          });
        } else {
          // NO — skip money, mark onboarding complete, go to first dimension
          void supabase.from('profiles').update({ onboarding_complete: true }).eq('id', profile.id);
          sessionRef.current.onboardingComplete = true;
          enterFirstDimension();
        }
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
      case 'RELATIONSHIP_NAME_Q': {
        const personName = text.trim();
        if (!personName) break;
        addUserMsg(personName);
        sessionRef.current.pendingRelationshipName = personName;
        sessionRef.current.state = 'RELATIONSHIP_CATEGORY';
        setConvState('RELATIONSHIP_CATEGORY');
        const ackMsg = isES
          ? `${personName}. ¿Cuál es tu relación con ${personName}?`
          : `${personName}. What's your relationship with ${personName}?`;
        addJulesMsg(ackMsg);
        speak(ackMsg);
        break;
      }

      case 'RELATIONSHIP_SCORE_Q': {
        const score = parseInt(text, 10);
        if (isNaN(score) || score < 1 || score > 10) break;
        addUserMsg(text);
        const rel = sessionRef.current.scoringRelationship;
        if (rel) {
          void supabase.from('relationship_interactions').insert({
            user_id: profile.id,
            relationship_id: rel.id,
            interaction_date: new Date().toISOString().split('T')[0],
            connection_score: score,
            phase: getCurrentPhase(profile).phase,
          });
        }
        const ackMsg = isES ? 'Anotado.' : 'Got it.';
        addJulesMsg(ackMsg);
        sessionRef.current.state = 'RELATIONSHIP_SCORE_ACK';
        setConvState('RELATIONSHIP_SCORE_ACK');
        speak(ackMsg, () => {
          _enterNameCollectionOrClose();
        });
        break;
      }

      case 'INSTRUMENT_Q': {
        const n = parseInt(text, 10);
        const maxVal = sessionRef.current.instrumentPending === 'PSS' ? 4 : 3;
        if (isNaN(n) || n < 0 || n > maxVal) break;
        await handleInstrumentAnswer(n);
        break;
      }

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

  // ── Mount: fresh session opening ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // ── 1. Clear screen
      setMessages([]);
      convHistoryRef.current = [];

      // ── 2. Load fresh profile data from Supabase
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('days_of_data, onboarding_complete, validation_due_date')
        .eq('id', profile.id)
        .single();

      if (cancelled) return;

      const liveDays = freshProfile?.days_of_data ?? 0;
      liveDaysRef.current = liveDays;
      const onboardingDone = freshProfile?.onboarding_complete === true;

      sessionRef.current.onboardingComplete = onboardingDone;

      // ── 3. Slot locking — if this slot already completed today, show locked
      const today = new Date().toISOString().split('T')[0];
      const { data: completedToday } = await supabase
        .from('conversation_sessions')
        .select('time_slot')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .eq('session_date', today);

      if (cancelled) return;

      const completedSlots = completedToday?.map((s: { time_slot: string }) => s.time_slot) ?? [];
      const currentSlot = sessionRef.current.slot;

      if (completedSlots.includes(currentSlot)) {
        const nextTime = currentSlot === 'morning'
          ? (isES ? 'esta tarde' : 'this afternoon')
          : currentSlot === 'afternoon'
          ? (isES ? 'esta noche' : 'tonight')
          : (isES ? 'mañana por la mañana' : 'tomorrow morning');
        const lockedMsg = isES
          ? `Ya completaste tu sesión de esta ${getSlotLabel(currentSlot, true)}, ${name}. Nos vemos ${nextTime}.`
          : `You already completed your ${getSlotLabel(currentSlot, false)} check-in, ${name}. See you ${nextTime}.`;
        setMessages([]);
        convHistoryRef.current = [];
        sessionRef.current.state = 'SESSION_COMPLETE';
        setConvState('SESSION_COMPLETE');
        addJulesMsg(lockedMsg);
        speak(lockedMsg);
        return;
      }

      // ── 4. Session memory — last 3 completed sessions with summaries
      const { data: recentSessions } = await supabase
        .from('conversation_sessions')
        .select('session_summary, session_date, time_slot')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .not('session_summary', 'is', null)
        .order('session_date', { ascending: false })
        .limit(3);

      if (cancelled) return;

      sessionRef.current.sessionContext = recentSessions
        ?.map((s: { session_date: string; time_slot: string; session_summary: string }) =>
          `[${s.session_date} ${s.time_slot}]: ${s.session_summary}`)
        .join('\n') ?? '';

      // ── 5. Check for gap (1-6 days since last completed session)
      const { data: lastSessions } = await supabase
        .from('conversation_sessions')
        .select('session_date')
        .eq('user_id', profile.id)
        .eq('session_complete', true)
        .order('session_date', { ascending: false })
        .limit(1);

      if (cancelled) return;

      let isGap = false;
      if (lastSessions && lastSessions.length > 0) {
        const diff = Math.floor(
          (Date.parse(today) - Date.parse(lastSessions[0].session_date)) / 86_400_000
        );
        if (diff >= 1 && diff <= 6) isGap = true;
      }

      sessionRef.current.isGap = isGap;

      // ── 6. Session count + relationship count (Session 3 features)
      const { count: sessCount } = await supabase
        .from('conversation_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('session_complete', true);

      const { count: relCount } = await supabase
        .from('relationships')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      if (cancelled) return;

      sessionRef.current.totalSessions = sessCount ?? 0;
      sessionRef.current.relationshipsCollected = relCount ?? 0;

      // ── 7. Check if validated instruments are due
      const validationDue = freshProfile?.validation_due_date;
      if (validationDue && validationDue <= today && liveDays >= 30) {
        sessionRef.current.instrumentPending = 'PHQ9';
      }

      // Debug snapshot after all data is loaded
      setDebug('daysOfData', liveDays);
      setDebug('onboardingComplete', onboardingDone);
      setDebug('isGap', isGap);
      setDebug('slot', sessionRef.current.slot);
      setDebug('hour', new Date().getHours());
      setDebug('idioma', profile.idioma);
      setDebug('picardia', profile.picardia_mode);

      // ── 4. Build opening message
      const slot = sessionRef.current.slot;
      const slotWord = isES
        ? (slot === 'morning' ? 'días' : slot === 'afternoon' ? 'tardes' : 'noches')
        : (slot === 'morning' ? 'morning' : slot === 'afternoon' ? 'afternoon' : 'evening');

      let openingText = '';

      if (isGap) {
        openingText = isES
          ? `Hola ${name} — qué bueno verte. Han pasado unos días.`
          : `Hey ${name} — good to have you back. It's been a few days.`;
      } else if (liveDays === 0 && !onboardingDone) {
        // Day 1 — first ever session
        openingText = isES
          ? `Hola ${name}, soy Jules — me alegra mucho que estés aquí.`
          : `Hi ${name}, I'm Jules — really glad you're here.`;
      } else if (liveDays < 30) {
        openingText = isES
          ? `Hola ${name}, buenos ${slotWord}. Día ${liveDays} — estás construyendo algo real.`
          : `Hey ${name}, good ${slotWord}. Day ${liveDays} — you're building something real.`;
      } else if (liveDays < 90) {
        openingText = isES
          ? `Hola ${name}. He notado algunos patrones — hagamos el check-in.`
          : `Hey ${name}. I've been noticing some patterns — let's check in.`;
      } else {
        openingText = isES
          ? `Hola ${name}. Buenos ${slotWord}.`
          : `Hey ${name}. Good ${slotWord}.`;
      }

      // ── 5. Show opening and speak it
      sessionRef.current.state = 'OPENING';
      setConvState('OPENING');
      addJulesMsg(openingText);

      speak(openingText, () => {
        if (cancelled) return;

        // ── 6. After opening — decide what comes next
        if (isGap) {
          // Gap: abbreviated check-in, just energy
          showQuestion('ENERGY_Q');
          return;
        }

        if (liveDays === 0 && !onboardingDone) {
          // Day 1: show onboarding
          showQuestion('EXPLAIN_OFFER');
          return;
        }

        // Instruments due — deliver before regular check-in
        if (sessionRef.current.instrumentPending) {
          startInstrumentSession();
          return;
        }

        // All other cases: go straight to first dimension
        enterFirstDimension();
      });
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived render values ─────────────────────────────────────────────────

  const inputUI    = getInputUI(convState);
  const choiceOpts = getChoiceOptions(convState, isES);
  const isBusy     = bioState === 'speaking' || bioState === 'thinking';

  const phase      = liveDaysRef.current < 30 ? 'LEARNING' : liveDaysRef.current < 90 ? 'CALIBRATION' : 'COMPANION';
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
        <button
          onClick={() => setIsMuted(m => !m)}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50%', width: 40, height: 40,
            cursor: 'pointer', fontSize: 18, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          <div style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 14, padding: '16px', textAlign: 'center', marginBottom: 80 }}>
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

      {/* INPUT AREA — only renders when there is actual input needed */}
      {(inputUI === 'numberpad' || inputUI === 'choices' || inputUI === 'text' || inputUI === 'relationship_category' || inputUI === 'instrument_pad' || convState === 'ADHOC') && (
        <div style={{
          flexShrink: 0, background: '#0A0A1A',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
        }}>

          {/* NUMBER PAD — only for numeric Q states */}
          {inputUI === 'numberpad' && (
            <NumberPad onSelect={(n) => void handleUserInput(String(n))} />
          )}

          {/* CHOICE BUTTONS — only for choice Q states */}
          {inputUI === 'choices' && (
            <ChoiceButtons options={choiceOpts} onSelect={v => void handleUserInput(v)} />
          )}

          {/* TEXT INPUT — MEMORABLE_Q only */}
          {inputUI === 'text' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder={
                  convState === 'RELATIONSHIP_NAME_Q'
                    ? (isES ? 'Escribe su nombre...' : 'Type their name...')
                    : (isES ? 'Escribe un momento de hoy...' : 'Type a moment from today...')
                }
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                style={{
                  flex: 1, background: '#1A1A2E', border: '1px solid #4A5568',
                  borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 15,
                  fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  background: '#FF6B6B', border: 'none', borderRadius: 8,
                  padding: '10px 16px', color: '#fff', fontSize: 18, cursor: 'pointer',
                }}
              >
                ↑
              </button>
            </div>
          )}

          {/* INSTRUMENT PAD — 0-3 or 0-4 for validated instruments */}
          {inputUI === 'instrument_pad' && (
            <InstrumentPad
              maxValue={sessionRef.current.instrumentPending === 'PSS' ? 4 : 3}
              onSelect={(n) => void handleInstrumentAnswer(n)}
            />
          )}

          {/* RELATIONSHIP CATEGORY — after name is entered */}
          {inputUI === 'relationship_category' && (
            <RelationshipCategorySelector
              name={sessionRef.current.pendingRelationshipName}
              isES={isES}
              onSelect={(category, intimacy) => void handleRelationshipCategorySelect(category, intimacy)}
            />
          )}

          {/* FALLBACK mic + text — ONLY for ADHOC free conversation */}
          {convState === 'ADHOC' && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => isListening ? stopListening() : startListening()}
                style={{
                  background: 'transparent', border: '1px solid #4A5568',
                  borderRadius: '50%', width: 40, height: 40,
                  color: isListening ? '#FF6B6B' : '#4A5568',
                  fontSize: 18, cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {isListening ? '⏹' : '🎤'}
              </button>
              <input
                type="text"
                placeholder={isES ? 'o escribe aquí...' : 'or type here...'}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                style={{
                  flex: 1, background: '#1A1A2E', border: '1px solid #4A5568',
                  borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 15,
                  fontFamily: 'Inter, system-ui, sans-serif', outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                style={{ background: '#FF6B6B', border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', fontSize: 18, cursor: 'pointer' }}
              >
                ↑
              </button>
            </div>
          )}

        </div>
      )}

      <BottomNav active="coach" onNavigate={(tab) => {
        cancelSpeech();
        if (onNavigate) onNavigate(tab);
        else onBack();
      }} />
    </div>
  );
}
