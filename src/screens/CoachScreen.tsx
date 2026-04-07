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
      ? `Modo APRENDIZAJE (Días 0–6): Estás conociendo a ${profile.nombre}. Haz preguntas de descubrimiento cálidas y abiertas. Explica brevemente por qué sus datos tienen valor.`
      : `LEARNING mode (Days 0–6): You are getting to know ${profile.nombre}. Ask warm, open-ended discovery questions. Briefly explain why their data has value.`,
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

// ── SpeakerButton ─────────────────────────────────────────────────────────
function SpeakerButton({
  text,
  idioma,
  disabled,
}: {
  text: string;
  idioma: 'EN' | 'ES';
  disabled: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        cancelSpeech();
        setTimeout(() => {
          speakWithElevenLabs(text, idioma, false, {});
        }, 100);
      }}
      style={{
        background: 'none',
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 0.6,
        fontSize: 14,
        padding: '4px 6px',
        color: '#4A5568',
        flexShrink: 0,
      }}
    >
      🔊
    </button>
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

  const startedRef = useRef(false);
  const daysLoadedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const showNumberPadRef = useRef(false);
  const dimensionScoresRef = useRef<Record<string, number>>({});

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
      onEnd: () => {
        setBioState('idle');
        if (!showNumberPadRef.current) {
          startListeningFn();
        }
      },
    });
  }, [isMuted, idioma]); // eslint-disable-line react-hooks/exhaustive-deps

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
            sendMessageFn(transcript);
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
  async function callAPI(msgs: Message[], systemPrompt: string): Promise<string> {
    // Strip leading assistant messages — Anthropic requires first message to be user
    const firstUserIdx = msgs.findIndex(m => m.role === 'user');
    const safeMessages = firstUserIdx >= 0 ? msgs.slice(firstUserIdx) : msgs;

    const response = await fetch('/.netlify/functions/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: safeMessages,
        system: systemPrompt,
        max_tokens: 200,
      }),
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text ?? '';
  }

  // ── sendMessage ──────────────────────────────────────────────────────────
  const sendMessageFn = useCallback(async (userText: string, daysOverride?: number) => {
    const days = daysOverride ?? daysOfData ?? 0;

    // Hide number pad
    setShowNumberPad(false);
    showNumberPadRef.current = false;

    // Extract score from user text
    const scoreMatch = userText.match(/\b([1-9]|10)\b/);
    if (scoreMatch) {
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
      if (lastAssistant) {
        const key = lastAssistant.content.slice(0, 60);
        dimensionScoresRef.current[key] = parseInt(scoreMatch[0], 10);
      }
    }

    // Safety check — user input
    if (hasCrisisContent(userText)) {
      await logSafetyEvent(profile.id, userText, 'user_input');
    }

    const isStart = userText === '__START__';
    let updatedMessages: Message[] = isStart ? [] : [
      ...messages,
      { role: 'user', content: userText },
    ];

    if (!isStart) {
      setMessages(updatedMessages);
    }

    setBioState('thinking');

    try {
      const systemPrompt = buildSystemPrompt(profile, days, idioma);

      // Build prompt for __START__
      let apiMessages: Message[];
      if (isStart) {
        const mode = getCoachingMode(days);
        const slot = getCurrentTimeSlot();
        let initMsg: string;
        if (idioma === 'ES') {
          initMsg = days === 0
            ? `El usuario acaba de registrarse. Salúdalo, explica brevemente qué es BioCycle y por qué sus datos tienen valor. Sé cálido y emocionante. Momento del día: ${slot}.`
            : `Inicia la sesión de ${sessionType === 'scheduled' ? 'check-in programado' : 'conversación'} del ${slot}. Modo: ${mode}. Días de datos: ${days}. Saluda y haz tu primera pregunta.`;
        } else {
          initMsg = days === 0
            ? `The user just registered. Greet them, briefly explain what BioCycle is and why their data has value. Be warm and exciting. Time of day: ${slot}.`
            : `Start the ${sessionType === 'scheduled' ? 'scheduled check-in' : 'conversation'} session for ${slot}. Mode: ${mode}. Days of data: ${days}. Greet them and ask your first question.`;
        }
        apiMessages = [{ role: 'user', content: initMsg }];
      } else {
        apiMessages = updatedMessages;
      }

      const reply = await callAPI(apiMessages, systemPrompt);
      if (!reply) return;

      // Safety check — AI response
      if (hasCrisisContent(reply)) {
        await logSafetyEvent(profile.id, reply, 'ai_response');
      }

      const newMessages: Message[] = isStart
        ? [{ role: 'assistant', content: reply }]
        : [...updatedMessages, { role: 'assistant', content: reply }];

      setMessages(newMessages);
      setBioState('idle');

      // Detect number pad question
      if (asksForNumber(reply)) {
        setShowNumberPad(true);
        showNumberPadRef.current = true;
      }

      // Detect session complete
      const completeTriggers = ['session complete', 'sesión completa', 'great session', 'buena sesión', 'talk tomorrow', 'hasta mañana'];
      const isComplete = completeTriggers.some(t => reply.toLowerCase().includes(t));
      if (isComplete) {
        setSessionComplete(true);
        await saveSession(days, newMessages);
      }

      speak(reply);
    } catch (err) {
      console.error('Coach API error:', err);
      setBioState('idle');
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

  // ── Mount effect — load days, fire __START__ ──────────────────────────────
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    async function init() {
      // Count sessions
      const { count } = await supabase
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const days = count ?? getDaysOfData(profile);
      setDaysOfData(days);
      daysLoadedRef.current = true;

      setTimeout(() => {
        sendMessageFn('__START__', days);
      }, 600);
    }

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              {msg.role === 'assistant' && (
                <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
                  <SpeakerButton
                    text={msg.content}
                    idioma={idioma}
                    disabled={bioState === 'speaking'}
                  />
                </div>
              )}
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

      {/* Input area */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 32px',
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
      </div>
    </div>
  );
}
