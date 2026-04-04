/*
-- SUPABASE SETUP — Run in Supabase SQL Editor:
-- CREATE TABLE IF NOT EXISTS safety_events (
--   id uuid default gen_random_uuid() primary key,
--   user_id uuid references profiles(id),
--   event_type text,
--   message_content text,
--   response_content text,
--   created_at timestamptz default now()
-- );
-- ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Service role only" ON safety_events FOR ALL USING (false);
*/

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { speakWithElevenLabs, cancelSpeech } from '../services/voiceService';
import { QuantumDNA } from '../components/QuantumDNA';
import type { Profile } from '../lib/supabase';
import type { PhaseData } from '../utils/phaseEngine';

export type CoachSessionType = 'scheduled' | 'adhoc';

interface CoachScreenV2Props {
  profile: Profile;
  phaseData: PhaseData;
  sessionType: CoachSessionType;
  onBack: () => void;
}

type Message = { role: 'user' | 'assistant'; content: string };
type BioState = 'idle' | 'listening' | 'thinking' | 'speaking';

// ── Safety keywords that trigger crisis logging ───────────────────────────
const CRISIS_KEYWORDS = [
  'crisis', '988', 'emergency', 'self-harm', 'self harm', 'suicidal',
  'hurt yourself', 'hurt myself', 'end my life', 'not worth living',
  'want to die', 'kill myself',
];

function hasCrisisContent(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.some(kw => lower.includes(kw));
}

async function logSafetyEvent(
  userId: string,
  messageContent: string,
  responseContent: string,
) {
  try {
    await supabase.from('safety_events').insert({
      user_id: userId,
      event_type: 'crisis_detected',
      message_content: messageContent.substring(0, 200),
      response_content: responseContent.substring(0, 200),
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never let logging errors surface to the user
  }
}

// ── Safety guardrail block — appended to every prompt ────────────────────
const SAFETY_RULES_EN = `
SAFETY RULES — NON-NEGOTIABLE:
- If the user expresses suicidal thoughts, self-harm, or intent to harm others: immediately respond with warmth and provide crisis resources: "What you are sharing matters. Please reach out to the Crisis Lifeline: 988 (US) or your local emergency line. You are not alone." Then say: "I am here with you right now. Can you tell me more about what you are feeling?"
- Never provide medical diagnoses or tell users to stop medications.
- Never provide specific advice about drug interactions or dosages.
- Never encourage dangerous behaviors.
- If user mentions eating disorders, redirect gently to professional support.
- If user seems to be in acute mental health crisis, always provide crisis line before anything else.
- Keep all responses focused on biological patterns and emotional awareness — never stray into medical advice.`;

const SAFETY_RULES_ES = `
REGLAS DE SEGURIDAD — NO NEGOCIABLES:
- Si el usuario expresa pensamientos suicidas, autolesiones o intención de hacerse daño: responde con calidez y proporciona recursos de crisis: "Lo que me estás diciendo es importante. Por favor contacta la Línea de Crisis: 988 (EEUU) o tu línea local de emergencias. No estás solo/a." Luego di: "Estoy aquí contigo ahora mismo. ¿Puedes contarme más sobre lo que sientes?"
- Nunca proporciones diagnósticos médicos ni digas a los usuarios que dejen sus medicamentos.
- Nunca des consejos específicos sobre interacciones o dosis de medicamentos.
- Nunca fomentes comportamientos peligrosos.
- Si el usuario menciona trastornos alimentarios, redirige con gentileza a apoyo profesional.
- Si el usuario parece estar en una crisis de salud mental aguda, proporciona siempre la línea de crisis antes de cualquier otra cosa.
- Mantén todas las respuestas enfocadas en patrones biológicos y conciencia emocional — nunca derives hacia consejos médicos.`;

// ── Prompt builder ────────────────────────────────────────────────────────
function buildPrompt(
  profile: Profile,
  phaseData: PhaseData,
  sessionType: CoachSessionType,
  daysOfData: number,
  collectedDimensions: Record<string, number> = {},
): string {
  const name = profile.nombre || 'friend';
  const isES = profile.idioma === 'ES';
  const isSienna = profile.picardia_mode === true;
  const phase = phaseData?.phase || 'unknown';
  const hour = new Date().getHours();
  const slot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'night';
  const coach = isSienna ? 'Sienna' : 'Jules';
  const personality = isSienna
    ? (isES
      ? 'directa, audaz, cálida por dentro, conspiradora, nunca clínica'
      : 'bold, direct, warm underneath, conspiratorial tone, never clinical')
    : (isES
      ? 'cálida, sabia, conectada, como una amiga de confianza que conoce la biología'
      : 'warm, wise, grounded, like a trusted friend who knows biology');

  const safety = isES ? SAFETY_RULES_ES : SAFETY_RULES_EN;

  const startInstruction = isES
    ? `Si el mensaje del usuario es exactamente '__START__' genera tu saludo de apertura ahora según el contexto. No hagas referencia a este mensaje de activación.`
    : `If the user message is exactly '__START__' generate your opening greeting now based on context. Do not reference this trigger message.`;

  // ── First-time user ──────────────────────────────────────────────
  if (daysOfData === 0) {
    if (isES) {
      return `Eres ${coach}, coach de IA de BioCycle. Personalidad: ${personality}.
Esta es la primera sesión de ${name}.
Empieza con: Dales la bienvenida calurosamente en UNA oración. Luego pregunta si quieren una breve explicación de cómo funciona BioCycle.
Si dicen sí: explica en 2 oraciones — BioCycle aprende tus patrones biológicos a través de conversaciones diarias. Con el tiempo predigo cómo te sentirás antes de que suceda. Luego pregunta si quieren saber sobre Data Traders. Si sí: agrega 1 oración — tus datos, con tu permiso, contribuyen a investigaciones y te generan ingresos. Luego di: Comencemos. Pregunta su energía física del 1 al 10.
Si dicen no a la explicación: ve directamente a la pregunta de energía física.
Mantén cada respuesta en menos de 3 oraciones. Nunca te presentes como IA. Nunca digas "como IA". Nunca uses la palabra "seguimiento".
${startInstruction}
${safety}`;
    }
    return `You are ${coach}, BioCycle's AI coach. Personality: ${personality}.
This is ${name}'s very first session.
Start with: Welcome them warmly in ONE sentence. Then ask if they want a quick explanation of how BioCycle works.
If they say yes: explain in 2 sentences — BioCycle learns your biological patterns through daily conversations. Over time I predict how you will feel before it happens. Then ask if they want to know about Data Traders. If yes: add 1 sentence — your data, with your permission, contributes to research and generates income for you. Then say: Let's begin. Ask their physical energy 1-10.
If they say no to explanation: go straight to physical energy question.
Keep every response under 3 sentences. Never introduce yourself as an AI. Never say "as an AI". Never use the word "tracking".
${startInstruction}
${safety}`;
  }

  // ── Scheduled session ────────────────────────────────────────────
  if (sessionType === 'scheduled') {
    const dataContext = daysOfData < 30
      ? (isES
        ? `Estás aprendiendo sus patrones. NO hagas predicciones ni pronósticos de fase. Sé cálida y curiosa.`
        : `You are still learning their patterns. Do NOT make predictions or phase forecasts. Be warm and curious.`)
      : (isES
        ? `Puedes referenciar su fase ${phase} con observaciones suaves.`
        : `You can reference their ${phase} phase with gentle observations.`);

    const dimensions = isES
      ? (slot === 'morning'
        ? 'Energía física (1-10), Claridad cognitiva (1-10), Estrés (1-10), Ansiedad (1-10), Calidad del sueño anoche (1-10), Cafeína hoy (número de tazas)'
        : slot === 'afternoon'
        ? 'Estado emocional (1-10), Energía social (1-10), Hidratación (buena/regular/mala), Síntomas físicos notables hoy'
        : 'Valoración del día (1-10), Una cosa memorable de hoy, Alcohol hoy (sí/no)')
      : (slot === 'morning'
        ? 'Physical energy (1-10), Cognitive clarity (1-10), Stress (1-10), Anxiety (1-10), Sleep quality last night (1-10), Caffeine today (number of cups)'
        : slot === 'afternoon'
        ? 'Emotional state (1-10), Social energy (1-10), Hydration (good/average/poor), Any notable physical symptoms today'
        : 'Day rating (1-10), One memorable thing from today, Alcohol today (yes/no)');

    const closeInstruction = isES
      ? 'Después de recoger todas las dimensiones: cierra calurosamente en 1 oración. Di: sesión completa.'
      : 'After all dimensions collected: close warmly in 1 sentence. Say: session complete.';

    const rules = isES
      ? 'Reglas: UNA pregunta a la vez. Nunca listes todas las preguntas. Nunca suenes como un formulario. Mantén cada respuesta en menos de 2 oraciones. Acepta números hablados con naturalidad.'
      : 'Rules: ONE question at a time. Never list all questions. Never sound like a form. Keep each response under 2 sentences. Accept spoken numbers naturally.';

    const alreadyCollected = Object.keys(collectedDimensions).length > 0
      ? (isES
        ? `Ya recopilado en esta sesión: ${JSON.stringify(collectedDimensions)}\nNo preguntes por dimensiones que ya fueron recopiladas. Continúa desde donde se quedó.`
        : `Already collected in this session: ${JSON.stringify(collectedDimensions)}\nDo not ask for dimensions that are already collected. Continue from where you left off.`)
      : '';

    if (isES) {
      return `Eres ${coach}, coach de BioCycle. Personalidad: ${personality}.
Esta es una sesión de ${slot === 'morning' ? 'mañana' : slot === 'afternoon' ? 'tarde' : 'noche'} con ${name}. Tienen ${daysOfData} días de datos.
${dataContext}
Recoge estas dimensiones UNA A LA VEZ en conversación natural. Haz una pregunta, espera el número, reconoce calurosamente en una oración, luego haz la siguiente:
${dimensions}
${alreadyCollected}
${closeInstruction}
${rules}
${startInstruction}
${safety}`;
    }
    return `You are ${coach}, BioCycle coach. Personality: ${personality}.
This is a ${slot} session with ${name}. They have ${daysOfData} days of data.
${dataContext}
Collect these dimensions ONE AT A TIME in natural conversation. Ask one question, wait for the number, acknowledge warmly in one sentence, then ask the next:
${dimensions}
${alreadyCollected}
${closeInstruction}
${rules}
${startInstruction}
${safety}`;
  }

  // ── Adhoc session ────────────────────────────────────────────────
  if (isES) {
    return `Eres ${coach}, coach de BioCycle. Personalidad: ${personality}.
Esta es una conversación abierta con ${name}. Sé cálida y breve. Pregunta qué tiene en mente. Si quieren registrar una sesión perdida ofrécete a recoger las dimensiones. Mantén las respuestas en menos de 2 oraciones.
${startInstruction}
${safety}`;
  }
  return `You are ${coach}, BioCycle coach. Personality: ${personality}.
This is an open conversation with ${name}. Be warm and brief. Ask what is on their mind. If they want to log a missed session offer to collect the dimensions. Keep responses under 2 sentences.
${startInstruction}
${safety}`;
}

// ── API call ──────────────────────────────────────────────────────────────
async function callAPI(
  messages: Message[],
  systemPrompt: string,
): Promise<string> {
  // Strip leading assistant messages — Anthropic requires first message to be user
  const firstUserIdx = messages.findIndex(m => m.role === 'user');
  const safeMessages = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

  const response = await fetch('/.netlify/functions/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages: safeMessages,
    }),
  });
  const data = await response.json();
  if (data.content?.[0]?.text) return data.content[0].text;
  if (typeof data.content === 'string') return data.content;
  return '';
}

// ── Component ─────────────────────────────────────────────────────────────
export function CoachScreenV2({ profile, phaseData, sessionType, onBack }: CoachScreenV2Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [bioState, setBioState] = useState<BioState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [daysOfData, setDaysOfData] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState('');

  const loadingRef = useRef(false);
  const isListeningRef = useRef(false);
  const daysLoadedRef = useRef(false);
  const startedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dimensionScoresRef = useRef<Record<string, number>>({});

  const isES = profile.idioma === 'ES';

  // ── Keep refs in sync ────────────────────────────────────────────
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // ── Scroll to bottom ─────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── speak ────────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (isMuted) return;
    cancelSpeech();
    setBioState('speaking');
    speakWithElevenLabs(text, profile.idioma, profile.picardia_mode ?? false, {
      onEnd: () => {
        setBioState('idle');
        setTimeout(() => startListening(), 1500);
      },
    });
  };

  // ── startListening ───────────────────────────────────────────────
  const startListening = () => {
    if (isListeningRef.current || loadingRef.current || sessionComplete) return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = isES ? 'es-ES' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e: SpeechRecognitionEvent) => {
        const result = e.results[e.results.length - 1];
        if (result.isFinal) {
          const text = result[0].transcript;
          if (text.trim()) {
            recognition.stop();
            sendMessage(text.trim());
          }
        }
      };
      recognition.onerror = () => { setBioState('idle'); setIsListening(false); };
      recognition.onend = () => setIsListening(false);
      setIsListening(true);
      setBioState('listening');
      recognition.start();
    } catch {
      setBioState('idle');
    }
  };

  // ── sendMessage ──────────────────────────────────────────────────
  const sendMessage = async (userText: string, daysOverride?: number) => {
    if (loadingRef.current) return;
    setLoading(true);
    setBioState('thinking');

    const isStartTrigger = userText === '__START__';
    const newMessages: Message[] = isStartTrigger
      ? [{ role: 'user', content: userText }]
      : [...messages, { role: 'user', content: userText }];

    if (!isStartTrigger) setMessages(newMessages);

    // ── Dimension score extraction from user input ────────────────
    if (!isStartTrigger) {
      const numberMatch = userText.match(/\b([1-9]|10)\b/);
      if (numberMatch) {
        const score = parseInt(numberMatch[1]);
        const lastAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
        const msgLower = lastAssistantMsg.toLowerCase();
        if (msgLower.includes('physical') || msgLower.includes('energy') || msgLower.includes('energía') || msgLower.includes('física')) {
          dimensionScoresRef.current.physical = score;
        } else if (msgLower.includes('cognitive') || msgLower.includes('cognitiv') || msgLower.includes('mental') || msgLower.includes('clarity') || msgLower.includes('claridad')) {
          dimensionScoresRef.current.cognitive = score;
        } else if (msgLower.includes('stress') || msgLower.includes('estrés')) {
          dimensionScoresRef.current.stress = score;
        } else if (msgLower.includes('anxiety') || msgLower.includes('ansiedad')) {
          dimensionScoresRef.current.anxiety = score;
        } else if (msgLower.includes('emotional') || msgLower.includes('emocional')) {
          dimensionScoresRef.current.emotional = score;
        } else if (msgLower.includes('social')) {
          dimensionScoresRef.current.social = score;
        } else if (msgLower.includes('sleep') || msgLower.includes('sueño') || msgLower.includes('dormir')) {
          dimensionScoresRef.current.sleep = score;
        } else if (msgLower.includes('sexual') || msgLower.includes('libido')) {
          dimensionScoresRef.current.sexual = score;
        }
      }
    }

    try {
      const prompt = buildPrompt(profile, phaseData, sessionType, daysOverride ?? daysOfData, dimensionScoresRef.current);
      const response = await callAPI(newMessages, prompt);

      if (!response) throw new Error('empty');

      const displayMessages: Message[] = isStartTrigger
        ? [{ role: 'assistant', content: response }]
        : [...newMessages, { role: 'assistant', content: response }];

      setMessages(displayMessages);
      setLoading(false);

      // ── Safety event logging ────────────────────────────────────
      if (hasCrisisContent(userText) || hasCrisisContent(response)) {
        logSafetyEvent(profile.id, userText, response);
      }

      // ── Session complete detection + score save ─────────────────
      const lower = response.toLowerCase();
      if (lower.includes('session complete') || lower.includes('sesión completa') || lower.includes('sesion completa')) {
        setSessionComplete(true);
        const scores = dimensionScoresRef.current;
        await supabase.from('conversation_sessions').insert({
          user_id: profile.id,
          session_date: new Date().toISOString().split('T')[0],
          time_slot: new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'night',
          session_complete: true,
          factor_fisico: scores.physical || null,
          factor_cognitivo: scores.cognitive || null,
          factor_estres: scores.stress || null,
          factor_ansiedad: scores.anxiety || null,
          factor_emocional: scores.emotional || null,
          factor_social: scores.social || null,
          factor_sueno: scores.sleep || null,
          factor_sexual: scores.sexual || null,
          created_at: new Date().toISOString(),
        });
      }

      speak(response);
    } catch {
      const errMsg = isES ? 'Algo salió mal. Intenta de nuevo.' : 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: errMsg }]);
      setLoading(false);
      setBioState('idle');
    }
  };

  // ── Load daysOfData then fire opening greeting ───────────────────
  useEffect(() => {
    if (daysLoadedRef.current) return;
    daysLoadedRef.current = true;

    (async () => {
      const { count } = await supabase
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id);

      const days = count ?? 0;
      setDaysOfData(days);

      // Fire greeting after state settles — pass days directly to avoid stale state
      setTimeout(() => {
        if (!startedRef.current) {
          startedRef.current = true;
          sendMessage('__START__', days);
        }
      }, 100);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── UI ───────────────────────────────────────────────────────────
  const stateLabel = bioState === 'listening'
    ? (isES ? 'Escuchando...' : 'Listening...')
    : bioState === 'thinking'
    ? (isES ? 'Pensando...' : 'Thinking...')
    : bioState === 'speaking'
    ? (isES ? 'Hablando...' : 'Speaking...')
    : (isES ? 'Toca para hablar' : 'Tap to speak');

  const visibleMessages = messages.slice(-3);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0A0A1A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 50,
        fontFamily: "'Syne', system-ui, sans-serif",
      }}
    >
      {/* Top bar */}
      <div style={{ width: '100%', maxWidth: 430, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 14, letterSpacing: '0.1em' }}
        >
          ← {isES ? 'Volver' : 'Back'}
        </button>
        <button
          onClick={() => { setIsMuted(m => !m); if (!isMuted) cancelSpeech(); }}
          style={{ background: 'none', border: 'none', color: isMuted ? 'rgba(255,255,255,0.3)' : 'rgba(255,217,61,0.7)', cursor: 'pointer', fontSize: 20 }}
          title={isMuted ? (isES ? 'Activar voz' : 'Unmute') : (isES ? 'Silenciar' : 'Mute')}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* DNA orb — tap to speak */}
      <div
        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}
      >
        <button
          onClick={() => {
            if (bioState === 'speaking') { cancelSpeech(); setBioState('idle'); return; }
            if (bioState === 'idle') startListening();
          }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label={stateLabel}
        >
          <QuantumDNA size={200} state={bioState === 'thinking' ? 'thinking' : bioState === 'speaking' ? 'speaking' : bioState === 'listening' ? 'listening' : 'idle'} />
        </button>

        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', margin: 0 }}>
          {stateLabel}
        </p>
      </div>

      {/* Message list — last 3 messages */}
      <div style={{ width: '100%', maxWidth: 430, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: '35vh', overflowY: 'auto' }}>
        {visibleMessages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              background: msg.role === 'user' ? 'rgba(255,107,107,0.15)' : 'rgba(30,30,60,0.9)',
              border: msg.role === 'user' ? '1px solid rgba(255,107,107,0.3)' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
              padding: '10px 14px',
              maxWidth: '80%',
              color: msg.role === 'user' ? 'rgba(255,180,180,0.9)' : 'rgba(255,255,255,0.88)',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Fallback text input */}
      {!sessionComplete && (
        <div style={{ width: '100%', maxWidth: 430, padding: '0 16px 24px', display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && inputText.trim()) { sendMessage(inputText.trim()); setInputText(''); } }}
            placeholder={isES ? 'o escribe aquí...' : 'or type here...'}
            disabled={loading}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '10px 14px',
              color: 'white',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={() => { if (inputText.trim()) { sendMessage(inputText.trim()); setInputText(''); } }}
            disabled={loading || !inputText.trim()}
            style={{
              background: 'rgba(255,217,61,0.15)',
              border: '1px solid rgba(255,217,61,0.3)',
              borderRadius: 12,
              padding: '10px 16px',
              color: 'rgba(255,217,61,0.9)',
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            →
          </button>
        </div>
      )}

      {sessionComplete && (
        <div style={{ padding: '0 16px 32px', color: 'rgba(255,217,61,0.7)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {isES ? '✓ Sesión completa' : '✓ Session complete'}
        </div>
      )}
    </div>
  );
}
