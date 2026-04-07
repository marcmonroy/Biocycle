// ElevenLabs voice IDs per personality and language
const VOICE_IDS: Record<string, string> = {
  jules_en:  'gJx1vCzNCD1EQHT212Ls',
  jules_es:  'GU72V6Yk5oxNHCpv7yxQ',
  sienna_en: '4tRn1lSkEn13EVTuqb0g',
  sienna_es: 'NNLcf0MlUZirnZQqeMJ8',
};

function getVoiceId(language: string, picardiaMode: boolean): string {
  const persona = picardiaMode ? 'sienna' : 'jules';
  const lang = language === 'ES' ? 'es' : 'en';
  return VOICE_IDS[`${persona}_${lang}`];
}

// Shared AudioContext — reuse to avoid browser limits
let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

// Track current playing source so it can be stopped before new audio starts
let currentSource: AudioBufferSourceNode | null = null;

// Web Speech API fallback
function speakWithWebSpeech(
  text: string,
  language: string,
  onStart?: () => void,
  onEnd?: () => void,
): void {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;

  const targetLocale = language === 'ES' ? 'es-ES' : 'en-US';
  const targetLang   = language === 'ES' ? 'es' : 'en';
  const voices = window.speechSynthesis.getVoices();
  const voice =
    voices.find(v => v.lang.toLowerCase() === targetLocale.toLowerCase()) ??
    voices.find(v => v.lang.toLowerCase().startsWith(targetLang)) ??
    null;
  if (voice) utterance.voice = voice;
  utterance.lang = targetLocale;

  utterance.onstart = () => onStart?.();
  utterance.onend   = () => onEnd?.();
  utterance.onerror = () => onEnd?.();

  window.speechSynthesis.speak(utterance);
}

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export async function speakWithElevenLabs(
  text: string,
  language: string,
  picardiaMode: boolean,
  options: SpeakOptions = {},
): Promise<void> {
  const { onStart, onEnd } = options;

  const voiceId = getVoiceId(language, picardiaMode);

  try {
    const response = await fetch('/.netlify/functions/elevenlabs-tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });

    if (!response.ok) {
      throw new Error(`elevenlabs-tts returned ${response.status}`);
    }

    const { audio } = await response.json();
    if (!audio) throw new Error('No audio in response');

    // Decode base64 → ArrayBuffer → AudioBuffer → play
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const ctx = getAudioContext();
    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === 'suspended') await ctx.resume();

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

    // Stop any currently playing audio before starting new playback
    if (currentSource) {
      try { currentSource.stop(); } catch { /* already stopped */ }
      currentSource = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSource = source;

    onStart?.();
    source.start(0);

    await new Promise<void>((resolve) => {
      source.onended = () => {
        currentSource = null;
        onEnd?.();
        resolve();
      };
    });
  } catch (err) {
    console.warn('[voiceService] ElevenLabs failed, falling back to Web Speech:', err);
    // Fallback: Web Speech API
    await new Promise<void>((resolve) => {
      speakWithWebSpeech(text, language, onStart, () => { onEnd?.(); resolve(); });
    });
  }
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }
}
