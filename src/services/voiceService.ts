import { API_BASE } from '../lib/apiBase';
import { supabase } from '../lib/supabase';

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

// Track current playing source and abort controller
let currentSource: AudioBufferSourceNode | null = null;
let currentAbortController: AbortController | null = null;
// Generation counter — increments on every new speak() call
// Any callback that doesn't match current generation is silently dropped
let currentGeneration = 0;

// Web Speech API fallback
function speakWithWebSpeech(
  text: string,
  language: string,
  generation: number,
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

  utterance.onstart = () => {
    if (currentGeneration !== generation) return;
    onStart?.();
  };
  utterance.onend = () => {
    if (currentGeneration !== generation) return;
    onEnd?.();
  };
  utterance.onerror = () => {
    if (currentGeneration !== generation) return;
    onEnd?.();
  };

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

  // Increment generation — any previous speak() callbacks are now stale
  const generation = ++currentGeneration;

  const voiceId = getVoiceId(language, picardiaMode);

  try {
    if (!text || text.trim().length === 0) {
      console.warn('[voiceService] empty text passed to speak — skipping');
      if (currentGeneration === generation) onEnd?.();
      return;
    }

    // Abort any in-flight fetch from previous speak() call
    currentAbortController?.abort();
    const abortController = new AbortController();
    currentAbortController = abortController;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // No authenticated session — fall back to on-device speech
      speakWithWebSpeech(text, language, generation, onStart, onEnd);
      return;
    }

    const response = await fetch(`${API_BASE}/.netlify/functions/elevenlabs-tts`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text, voiceId }),
      signal: abortController.signal,
    });

    // If we've been superseded by a newer speak() call, drop this result
    if (currentGeneration !== generation) return;

    if (!response.ok) {
      throw new Error(`elevenlabs-tts returned ${response.status}`);
    }

    const { audio } = await response.json();
    if (!audio) throw new Error('No audio in response');

    // Check generation again after async JSON parse
    if (currentGeneration !== generation) return;

    // Decode base64 → ArrayBuffer → AudioBuffer → play
    const binary = atob(audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();

    // Check generation again after async decode
    if (currentGeneration !== generation) return;

    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

    // Final generation check before playback
    if (currentGeneration !== generation) return;

    // Stop any currently playing audio
    if (currentSource) {
      try { currentSource.stop(); } catch { /* already stopped */ }
      currentSource = null;
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    currentSource = source;

    if (currentGeneration === generation) onStart?.();
    source.start(0);

    await new Promise<void>((resolve) => {
      source.onended = () => {
        currentSource = null;
        // Only fire onEnd if this is still the active generation
        if (currentGeneration === generation) {
          onEnd?.();
        }
        resolve();
      };
    });
  } catch (err: any) {
    // AbortError means cancelSpeech() was called — silently drop
    if (err?.name === 'AbortError') return;

    // Check generation before fallback
    if (currentGeneration !== generation) return;

    console.warn('[voiceService] ElevenLabs failed, falling back to Web Speech:', err);
    await new Promise<void>((resolve) => {
      speakWithWebSpeech(text, language, generation, onStart, () => {
        if (currentGeneration === generation) onEnd?.();
        resolve();
      });
    });
  }
}

export function cancelSpeech(): void {
  // Increment generation to invalidate all pending callbacks
  currentGeneration++;
  currentAbortController?.abort();
  currentAbortController = null;
  window.speechSynthesis?.cancel();
  if (currentSource) {
    try { currentSource.stop(); } catch { /* already stopped */ }
    currentSource = null;
  }
}
