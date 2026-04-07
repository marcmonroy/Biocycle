// CoachScreen — Session 1 shell
// Jules greeting, first-time flow, phase badge, learning mode indicator
// Full conversation engine wired via Netlify function /api/coach

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';
import { getCurrentPhase, getDaysOfData, getCurrentTimeSlot } from '../lib/phaseEngine';
import { QuantumDNA } from '../components/QuantumDNA';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';


// ── Safety ────────────────────────────────────────────────────────────────
const CRISIS_KEYWORDS = [
  'suicide', 'suicidio', 'kill myself', 'matarme', 'end my life',
  'self-harm', 'autolesión', 'overdose', 'sobredosis',
  'cutting myself', 'cortarme', 'want to die', 'quiero morir',
];

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(k => lower.includes(k));
}

async function logSafetyEvent(userId: string, triggerText: string, context: string) {
  try {
    await supabase.from('safety_events').insert({
      user_id: userId,
      trigger_text: triggerText.slice(0, 500),
      context,
      created_at: new Date().toISOString(),
    });
  } catch { /* never throw */ }
}

const SAFETY_SUFFIX_EN = '\n\nIMPORTANT: If the user expresses any thoughts of self-harm, suicide, or crisis, immediately respond with warmth and provide: "Please reach out to a crisis line — Crisis Text Line: text HOME to 741741, or call 988 (US/Canada)." Do not continue the biological coaching conversation until safety is confirmed.';
const SAFETY_SUFFIX_ES = '\n\nIMPORTANTE: Si el usuario expresa pensamientos de autolesión, suicidio o crisis, responde con calidez y proporciona: "Por favor comunícate con una línea de crisis — Línea de Crisis: llama al 988 o visita crisistextline.org." No continúes la conversación de coaching biológico hasta confirmar la seguridad.';

// ── Coaching modes ────────────────────────────────────────────────────────
type CoachingMode = 'LEARNING' | 'CALIBRATION' | 'COMPANION';

function getCoachingMode(days: number): CoachingMode {
  if (days < 7) return 'LEARNING';
  if (days < 30) return 'CALIBRATION';
  return 'COMPANION';
}

// ── Message types ─────────────────────────────────────────────────────────
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ── Number pad detection ──────────────────────────────────────────────────
const NUMBER_TRIGGERS = [
  'scale of 1 to 10', 'scale of 1-10', '1 to 10', '1-10',
  'escala del 1 al 10', 'del 1 al 10', '1 al 10',
  'rate your', 'califica tu', 'how would you rate',
];

function asksForNumber(text: string): boolean {
  const lower = text.toLowerCase();
  return NUMBER_TRIGGERS.some(t => lower.includes(t));
}

// ── Build system prompt ───────────────────────────────────────────────────
function buildSystemPrompt(
  profile: Profile,
  daysOfData: number,
  idioma: 'EN' | 'ES'
): string {
  const mode = getCoachingMode(daysOfData);
  const phase = getCurrentPhase(profile);
  const slot = getCurrentTimeSlot();
  const phaseName = idioma === 'ES' ? phase.displayNameES : phase.displayName;
  const phaseDesc = idioma === 'ES' ? phase.descriptionES : phase.description;

  const modeDesc: Record<CoachingMode, string> = {
    LEARNING: idioma === 'ES'
      ? (daysOfData === 0
        ? `MODO PRIMERA VEZ: Tu mensaje de apertura es UNA SOLA oración de bienvenida cálida a ${profile.nombre}. Máximo 15 palabras. No expliques BioCycle. No menciones hormonas ni biología. No hagas preguntas. Solo saluda con calidez.`
        : `Modo APRENDIZAJE (Días 0–6): Estás conociendo a ${profile.nombre}. Haz preguntas de descubrimiento cálidas y abiertas. Explica brevemente por qué sus datos tienen valor.`)
      : (daysOfData === 0
        ? `FIRST-TIME MODE: Your opening message is ONE warm welcome sentence to ${profile.nombre}. Maximum 15 words. Do not explain BioCycle. Do not mention hormones or biology. Do not ask any questions. Just greet them warmly.`
        : `LEARNING mode (Days 0–6): You are getting to know ${profile.nombre}. Ask warm, open-ended discovery questions. Briefly explain why their data has value.`),
    CALIBRATION: idioma === 'ES'
      ? `Modo CALIBRACIÓN (Días 7–29): Recopila dimensiones específicas puntuadas del 1 al 10: energía física, cognición, estrés, ansiedad, emocional, social, sueño, libido. Pregunta de 1 a 2 a la vez.`
      : `CALIBRATION mode (Days 7–29): Collect specific 1–10 scored dimensions: physical energy, cognition, stress, anxiety, emotional, social, sleep, libido. Ask 1–2 at a time.`,
    COMPANION: idioma === 'ES'
      ? `Modo COMPAÑERO (Día 30+): Tienes suficientes datos para hacer observaciones. Nombra patrones reales. Predice cómo se sentirán mañana basado en sus datos históricos.`
      : `COMPANION mode (Day 30+): You have enough data to make observations. Name real patterns. Predict how they'll feel tomorrow based on their historical data.`,
  };

  const lang = idioma === 'ES'
    ? 'Respond entirely in Spanish. Be warm, direct, never clinical.'
    : 'Respond entirely in English. Be warm, direct, never clinical.';

  const safety = idioma === 'ES' ? SAFETY_SUFFIX_ES : SAFETY_SUFFIX_EN;

  return `You are Jules, a warm and perceptive biological intelligence coach inside BioCycle. You help users understand their hormonal rhythms and build valuable health data.

User: ${profile.nombre ?? 'User'} | Gender: ${profile.genero ?? 'unknown'} | Days of data: ${daysOfData} | Time: ${slot} | Phase: ${phaseName} (${phaseDesc})

${modeDesc[mode]}

Keep responses to 2–3 sentences maximum. Short, warm, and inviting. Less is more.
IMPORTANT: Never introduce yourself again after the first message. Never say "Hi", "Hello", or "Welcome" after the opening. Never repeat your name after the first message.
When collecting data, always ask closed questions with explicit options. For yes/no questions end with "— yes or no?". For sleep quality end with "— restful or restless?". For overall state end with "— good, average, or poor?".
${lang}${safety}`;
}

// ── NumberPad ─────────────────────────────────────────────────────────────
function NumberPad({ onSelect }: { onSelect: (n: number) => void }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: 8,
      padding: '12px 0',
    }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
        <button
          key={n}
          onClick={() => onSelect(n)}
          style={{
            background: 'rgba(123,97,255,0.12)',
            border: '1px solid rgba(123,97,255,0.25)',
            borderRadius: 10,
            padding: '12px 0',
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


// ── Main component ────────────────────────────────────────────────────────
interface Props {
  profile: Profile;
  sessionType: 'scheduled' | 'adhoc';
  onBack: () => void;
}

export function CoachScreen({ profile, sessionType, onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [bioState, setBioState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [showNumberPad, setShowNumberPad] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [daysOfData, setDaysOfData] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const sessionStartedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const onboardingRef = useRef<'greeting' | 'biocycle' | 'money' | 'done'>('done');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const showNumberPadRef = useRef(false);
  const dimensionScoresRef = useRef<Record<string, number>>({});

  const [pendingYesNo, setPendingYesNo] = useState<'biocycle' | 'money' | null>(null);
  const [pendingChoices, setPendingChoices] = useState<string[] | null>(null);

  const idioma = profile.idioma ?? 'EN';

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync showNumberPad ref
  useEffect(() => {
    showNumberPadRef.current = showNumberPad;
  }, [showNumberPad]);

  // ── speak ────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (isMuted) return;
    cancelSpeech();
    setBioState('speaking');
    speakWithElevenLabs(text, idioma, false, {
      onStart: () => setBioState('speaking'),
      onEnd: () => setBioState('idle'),
    });
  }, [isMuted, idioma]);

  // ── startListening ───────────────────────────────────────────────────────
  const startListeningFn = useCallback(() => {
    if (bioState === 'speaking' || bioState === 'thinking') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition: any = new SR();
    recognition.lang = idioma === 'ES' ? 'es-ES' : 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          const transcript = e.results[i][0].transcript.trim();
          if (transcript) {
            recognition.stop();
            setIsListening(false);
            setBioState('idle');
            // Populate input for user review — do NOT auto-send
            setInputText(transcript);
          }
        }
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setBioState('idle');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setBioState('listening');
  }, [bioState, idioma]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── callAPI ──────────────────────────────────────────────────────────────
  async function callAPI(msgs: Message[], systemPrompt: string, maxTokens = 200): Promise<string> {
    // Strip leading assistant messages — Anthropic requires first message to be user
    const firstUserIdx = msgs.findIndex(m => m.role === 'user');
    const safeMessages = firstUserIdx >= 0 ? msgs.slice(firstUserIdx) : msgs;

    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        messages: safeMessages,
        system: systemPrompt,
        max_tokens: maxTokens,
      }),
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text ?? '';
  }

  // ── sendMessage ──────────────────────────────────────────────────────────
  const sendMessageFn = useCallback(async (userText: string, daysOverride?: number) => {
    // Block concurrent API calls — only one Jules response in flight at a time
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    const days = daysOverride ?? daysOfData ?? 0;

    setShowNumberPad(false);
    showNumberPadRef.current = false;
    setPendingChoices(null);

    const isStart = userText === '__START__';
    // Silent triggers don't add a user message to the chat
    const isSilent = ['__BIOCYCLE_EXPLAIN__', '__MONEY_EXPLAIN__', '__FIRST_QUESTION__'].includes(userText);

    // Extract score + safety check — only for real user messages
    if (!isStart && !isSilent) {
      const scoreMatch = userText.match(/\b([1-9]|10)\b/);
      if (scoreMatch) {
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          dimensionScoresRef.current[lastAssistant.content.slice(0, 60)] = parseInt(scoreMatch[0], 10);
        }
      }
      if (hasCrisisContent(userText)) {
        await logSafetyEvent(profile.id, userText, 'user_input');
      }
    }

    // Build message list
    let updatedMessages: Message[];
    if (isStart) {
      updatedMessages = [];
    } else if (isSilent) {
      updatedMessages = messages; // use current messages without adding trigger text
    } else {
      updatedMessages = [...messages, { role: 'user', content: userText }];
      setMessages(updatedMessages);
    }

    setBioState('thinking');

    try {
      const systemPrompt = buildSystemPrompt(profile, days, idioma);
      const slot = getCurrentTimeSlot();
      let apiMessages: Message[];

      if (isStart) {
        if (days === 0) {
          // First-time: strict one-sentence welcome, 150 tokens
          onboardingRef.current = 'greeting';
          const welcome = idioma === 'ES'
            ? `Di exactamente UNA oración de bienvenida cálida a ${profile.nombre ?? 'el usuario'}. Máximo 15 palabras. Nada más.`
            : `Say exactly ONE warm welcome sentence to ${profile.nombre ?? 'the user'}. Maximum 15 words. Nothing else.`;
          apiMessages = [{ role: 'user', content: welcome }];
        } else {
          const mode = getCoachingMode(days);
          const initMsg = idioma === 'ES'
            ? `Inicia la sesión de ${sessionType === 'scheduled' ? 'check-in programado' : 'conversación'} del ${slot}. Modo: ${mode}. Días de datos: ${days}. Saluda y haz tu primera pregunta.`
            : `Start the ${sessionType === 'scheduled' ? 'scheduled check-in' : 'conversation'} session for ${slot}. Mode: ${mode}. Days of data: ${days}. Greet them and ask your first question.`;
          apiMessages = [{ role: 'user', content: initMsg }];
        }
      } else if (userText === '__BIOCYCLE_EXPLAIN__') {
        const prompt = idioma === 'ES'
          ? 'Explica BioCycle en exactamente 2 oraciones: qué aprende sobre el usuario con el tiempo y cómo predice su estado biológico futuro. Solo 2 oraciones, nada más.'
          : 'Explain BioCycle in exactly 2 sentences: what it learns about the user over time, and how it predicts their future biological state. Exactly 2 sentences, nothing else.';
        apiMessages = [{ role: 'user', content: prompt }];
      } else if (userText === '__MONEY_EXPLAIN__') {
        const prompt = idioma === 'ES'
          ? `Responde con exactamente 1 oración explicando cómo los Data Traders de BioCycle ganan dinero con sus datos biológicos. Luego inmediatamente haz tu primera pregunta de dimensión para el check-in del ${slot}. Máximo 100 tokens en total.`
          : `Respond with exactly 1 sentence explaining how BioCycle Data Traders earn money from their biological data. Then immediately ask your first dimension check-in question for the ${slot} session. Maximum 100 tokens total.`;
        apiMessages = [{ role: 'user', content: prompt }];
      } else if (userText === '__FIRST_QUESTION__') {
        const prompt = idioma === 'ES'
          ? `Haz tu primera pregunta de dimensión para el check-in del ${slot}. Solo la pregunta, sin introducción ni explicación.`
          : `Ask your first dimension check-in question for the ${slot} session. Just the question, no preamble.`;
        apiMessages = [{ role: 'user', content: prompt }];
      } else {
        apiMessages = updatedMessages;
      }

      const isOnboarding = days === 0 && onboardingRef.current !== 'done';
      const reply = await callAPI(apiMessages, systemPrompt, isOnboarding ? 150 : 200);
      if (!reply) return;

      if (hasCrisisContent(reply)) {
        await logSafetyEvent(profile.id, reply, 'ai_response');
      }

      const newMessages: Message[] = [...updatedMessages, { role: 'assistant', content: reply }];
      setMessages(newMessages);
      setBioState('idle');

      if (asksForNumber(reply)) {
        setShowNumberPad(true);
        showNumberPadRef.current = true;
      }

      const completeTriggers = ['session complete', 'sesión completa', 'great session', 'buena sesión', 'talk tomorrow', 'hasta mañana'];
      if (completeTriggers.some(t => reply.toLowerCase().includes(t))) {
        setSessionComplete(true);
        await saveSession(days, newMessages);
      }

      speak(reply);

      // ── Auto choice buttons for closed questions ────────────────────────
      if (!pendingYesNo && onboardingRef.current === 'done') {
        const lower = reply.toLowerCase();
        if (/— yes or no[?!.]?|yes or no\?/i.test(lower)) {
          setPendingChoices(idioma === 'ES' ? ['Sí', 'No'] : ['Yes', 'No']);
        } else if (/restful or restless/i.test(lower)) {
          setPendingChoices(['Restful', 'Restless']);
        } else if (/good,?\s*average,?\s*or\s*poor/i.test(lower)) {
          setPendingChoices(['Good', 'Average', 'Poor']);
        }
      }

      // ── Onboarding state machine ────────────────────────────────────────
      if (days === 0 && onboardingRef.current !== 'done') {
        if (onboardingRef.current === 'greeting') {
          // After welcome, append biocycle question and show YES/NO
          const q = idioma === 'ES'
            ? '¿Te gustaría una explicación rápida de cómo funciona BioCycle antes de empezar?'
            : 'Would you like a quick explanation of how BioCycle works before we start?';
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: q }]);
            onboardingRef.current = 'biocycle';
            setPendingYesNo('biocycle');
          }, 700);
        } else if (userText === '__BIOCYCLE_EXPLAIN__') {
          // After BioCycle explanation, append money question and show YES/NO
          const q = idioma === 'ES'
            ? '¿Quieres saber cómo tus datos pueden generarte dinero?'
            : 'Want to know about how your data can earn you money?';
          setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: q }]);
            onboardingRef.current = 'money';
            setPendingYesNo('money');
          }, 700);
        } else if (userText === '__MONEY_EXPLAIN__') {
          // Money explanation already includes the first dimension question (combined prompt)
          onboardingRef.current = 'done';
        } else if (userText === '__FIRST_QUESTION__') {
          onboardingRef.current = 'done';
        }
      }
    } catch (err) {
      console.error('Coach API error:', err);
      setBioState('idle');
    } finally {
      isProcessingRef.current = false;
    }
  }, [daysOfData, messages, profile, idioma, sessionType, speak]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── saveSession ──────────────────────────────────────────────────────────
  async function saveSession(days: number, msgs: Message[]) {
    const slot = getCurrentTimeSlot();
    const phase = getCurrentPhase(profile);
    const scores = dimensionScoresRef.current;

    const summary = msgs
      .filter(m => m.role === 'assistant')
      .map(m => m.content)
      .join(' ')
      .slice(0, 500);

    try {
      await supabase.from('conversation_sessions').insert({
        user_id: profile.id,
        session_date: new Date().toISOString().split('T')[0],
        time_slot: slot,
        phase_at_session: phase.phase,
        personality_mode: 'jules',
        session_complete: true,
        integrity_score: Math.min(100, 60 + Object.keys(scores).length * 5),
        session_duration_seconds: null,
        manual_entry: false,
        session_summary: summary,
        factor_fisico: extractScore(scores, ['energy', 'energía', 'physical']),
        factor_cognitivo: extractScore(scores, ['cognit', 'focus', 'mental']),
        factor_estres: extractScore(scores, ['stress', 'estrés']),
        factor_ansiedad: extractScore(scores, ['anxiet', 'ansiedad']),
        factor_emocional: extractScore(scores, ['emotion', 'emocional']),
        factor_social: extractScore(scores, ['social']),
        factor_sueno: extractScore(scores, ['sleep', 'sueño']),
        factor_sexual: extractScore(scores, ['libido', 'sexual']),
      });

      // Update days_of_data
      await supabase
        .from('profiles')
        .update({ days_of_data: days + 1 })
        .eq('id', profile.id);
    } catch (err) {
      console.error('Save session error:', err);
    }
  }

  function extractScore(scores: Record<string, number>, keywords: string[]): number | null {
    for (const [key, val] of Object.entries(scores)) {
      const lower = key.toLowerCase();
      if (keywords.some(k => lower.includes(k))) return val;
    }
    return null;
  }

  // ── Mount effect — load days, fire __START__ exactly once ────────────────
  useEffect(() => {
    if (sessionStartedRef.current) return;
    sessionStartedRef.current = true;

    let timer: ReturnType<typeof setTimeout>;

    async function init() {
      const { count } = await supabase
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const days = count ?? getDaysOfData(profile);
      setDaysOfData(days);
      timer = setTimeout(() => sendMessageFn('__START__', days), 600);
    }

    init();
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Onboarding YES / NO handler ──────────────────────────────────────────
  const handleYesNo = useCallback(async (answer: 'yes' | 'no') => {
    setPendingYesNo(null);
    const userMsg = answer === 'yes' ? (idioma === 'ES' ? 'Sí' : 'Yes') : 'No';
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    const phase = onboardingRef.current;

    if (phase === 'biocycle') {
      if (answer === 'yes') {
        await sendMessageFn('__BIOCYCLE_EXPLAIN__');
      } else {
        // Skip explanation — go directly to money question
        const q = idioma === 'ES'
          ? '¿Quieres saber cómo tus datos pueden generarte dinero?'
          : 'Want to know about how your data can earn you money?';
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: q }]);
          onboardingRef.current = 'money';
          setPendingYesNo('money');
        }, 400);
      }
    } else if (phase === 'money') {
      if (answer === 'yes') {
        await sendMessageFn('__MONEY_EXPLAIN__');
      } else {
        // Skip money — go directly to first dimension question
        await sendMessageFn('__FIRST_QUESTION__');
      }
    }
  }, [idioma, sendMessageFn]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle mic ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (bioState === 'speaking' || bioState === 'thinking') return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setBioState('idle');
    } else {
      startListeningFn();
    }
  };

  // ── Send text message ─────────────────────────────────────────────────────
  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    sendMessageFn(text);
  };

  // ── Mode label ────────────────────────────────────────────────────────────
  const mode = getCoachingMode(daysOfData ?? 0);
  const modeLabel = {
    LEARNING: idioma === 'ES' ? '● APRENDIENDO' : '● LEARNING',
    CALIBRATION: idioma === 'ES' ? '● CALIBRANDO' : '● CALIBRATING',
    COMPANION: idioma === 'ES' ? '● COMPAÑERO' : '● COMPANION',
  }[mode];
  const modeColor = { LEARNING: '#FFD93D', CALIBRATION: '#7B61FF', COMPANION: '#00C896' }[mode];

  const phase = getCurrentPhase(profile);
  const phaseLabel = idioma === 'ES' ? phase.displayNameES : phase.displayName;

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      maxWidth: '100vw',
      background: '#0A0A1A',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '52px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: '#4A5568',
            cursor: 'pointer',
            fontSize: 20,
            padding: '4px 8px',
          }}
        >
          ←
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <QuantumDNA size={44} state={bioState} />
          <span style={{
            fontSize: 9,
            letterSpacing: '0.1em',
            color: modeColor,
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            {modeLabel}
          </span>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#4A5568', letterSpacing: '0.05em' }}>
            {phase.emoji} {phaseLabel}
          </div>
          <button
            onClick={() => setIsMuted(m => !m)}
            style={{
              background: 'none',
              border: 'none',
              color: '#4A5568',
              cursor: 'pointer',
              fontSize: 14,
              padding: '2px 0',
            }}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 && bioState === 'thinking' && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 0',
          }}>
            <QuantumDNA size={80} state="thinking" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {msg.role === 'assistant' && (
              <div style={{ flexShrink: 0, marginBottom: 2 }}>
                <QuantumDNA size={28} state="idle" />
              </div>
            )}
            <div style={{
              maxWidth: '80%',
              background: msg.role === 'user'
                ? 'rgba(255,107,107,0.12)'
                : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user'
                ? '1px solid rgba(255,107,107,0.2)'
                : '1px solid rgba(255,255,255,0.07)',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              padding: '10px 14px',
            }}>
              <p style={{
                color: msg.role === 'user' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.9)',
                fontSize: '0.9rem',
                lineHeight: 1.55,
                margin: 0,
              }}>
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Number pad */}
        {showNumberPad && (
          <div style={{
            background: 'rgba(123,97,255,0.06)',
            border: '1px solid rgba(123,97,255,0.15)',
            borderRadius: 14,
            padding: '12px 16px',
          }}>
            <p style={{ color: '#7B61FF', fontSize: 11, margin: '0 0 8px', letterSpacing: '0.08em' }}>
              {idioma === 'ES' ? 'TAP UN NÚMERO' : 'TAP A NUMBER'}
            </p>
            <NumberPad onSelect={n => {
              setShowNumberPad(false);
              showNumberPadRef.current = false;
              sendMessageFn(String(n));
            }} />
          </div>
        )}

        {/* Auto choice buttons */}
        {pendingChoices && (
          <div style={{
            background: 'rgba(123,97,255,0.06)',
            border: '1px solid rgba(123,97,255,0.15)',
            borderRadius: 14,
            padding: '12px 16px',
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            {pendingChoices.map(choice => (
              <button
                key={choice}
                onClick={() => {
                  setPendingChoices(null);
                  sendMessageFn(choice);
                }}
                style={{
                  flex: 1,
                  minWidth: 80,
                  background: 'rgba(123,97,255,0.12)',
                  border: '1px solid rgba(123,97,255,0.3)',
                  borderRadius: 10,
                  padding: '12px 8px',
                  color: '#7B61FF',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Session complete */}
        {sessionComplete && (
          <div style={{
            background: 'rgba(0,200,150,0.08)',
            border: '1px solid rgba(0,200,150,0.2)',
            borderRadius: 14,
            padding: '16px',
            textAlign: 'center',
          }}>
            <p style={{ color: '#00C896', fontSize: '0.9rem', margin: 0, fontWeight: 600 }}>
              {idioma === 'ES' ? '✓ Sesión guardada' : '✓ Session saved'}
            </p>
            <p style={{ color: '#4A5568', fontSize: 12, margin: '4px 0 0' }}>
              {idioma === 'ES' ? 'Tus datos se han registrado.' : 'Your data has been recorded.'}
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* YES / NO onboarding choice buttons */}
      {pendingYesNo && (
        <div style={{
          flexShrink: 0,
          padding: '10px 16px',
          paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 10px)',
          display: 'flex',
          gap: 10,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: '#0A0A1A',
        }}>
          <button
            onClick={() => handleYesNo('yes')}
            style={{
              flex: 1,
              background: 'rgba(0,200,150,0.12)',
              border: '1px solid rgba(0,200,150,0.3)',
              borderRadius: 12,
              padding: '14px',
              color: '#00C896',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {idioma === 'ES' ? 'Sí' : 'Yes'}
          </button>
          <button
            onClick={() => handleYesNo('no')}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '14px',
              color: 'rgba(255,255,255,0.5)',
              fontSize: '0.95rem',
              fontWeight: 400,
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            No
          </button>
        </div>
      )}

      {/* Input area — hidden during YES/NO onboarding prompts */}
      {!pendingYesNo && <div style={{
        flexShrink: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(56px + env(safe-area-inset-bottom) + 12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: '#0A0A1A',
      }}>
        {/* Mic button */}
        <button
          onClick={toggleMic}
          disabled={bioState === 'speaking' || bioState === 'thinking'}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: isListening
              ? 'rgba(255,107,107,0.2)'
              : 'rgba(255,255,255,0.06)',
            border: isListening
              ? '1px solid rgba(255,107,107,0.5)'
              : '1px solid rgba(255,255,255,0.1)',
            cursor: (bioState === 'speaking' || bioState === 'thinking') ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
            opacity: (bioState === 'speaking' || bioState === 'thinking') ? 0.4 : 1,
          }}
        >
          {isListening ? '⏹' : '🎤'}
        </button>

        {/* Text input */}
        <input
          type="text"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
          placeholder={idioma === 'ES' ? 'Escribe algo...' : 'Type something...'}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '12px 14px',
            color: 'white',
            fontSize: '0.9rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            outline: 'none',
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim()}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: inputText.trim() ? '#FF6B6B' : 'rgba(255,255,255,0.06)',
            border: 'none',
            cursor: inputText.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
            color: 'white',
          }}
        >
          ↑
        </button>
      </div>}
    </div>
  );
}
