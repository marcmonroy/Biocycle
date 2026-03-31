import { supabase, Profile } from '../lib/supabase';

// Scheduled slot definitions — must match DEFAULT_CHECKIN_TIMES
export const SCHEDULED_SLOTS = [
  { key: 'morning',   hour: 7,  minute: 30, labelEn: 'morning',   labelEs: 'mañana' },
  { key: 'afternoon', hour: 14, minute: 0,  labelEn: 'afternoon', labelEs: 'tarde'  },
  { key: 'night',     hour: 21, minute: 30, labelEn: 'night',     labelEs: 'noche'  },
] as const;

export function padTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Queries today's completed sessions and returns a context-aware greeting string.
 * Used by both AmbientCoach (bubble tap) and CoachScreen (adhoc fallback).
 */
export async function computeAdhocGreeting(profile: Profile): Promise<string> {
  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const nowMinutes = currentHour * 60 + currentMinute;
  const name = profile.nombre ?? 'friend';
  const isSpanish = profile.idioma === 'ES';
  const isSienna = profile.picardia_mode === true;

  const { data } = await supabase
    .from('conversation_sessions')
    .select('time_slot')
    .eq('user_id', profile.id)
    .eq('session_date', today)
    .eq('session_complete', true);

  const completedSlots = new Set((data ?? []).map((s: { time_slot: string }) => s.time_slot));

  const allDone = SCHEDULED_SLOTS.every(s => completedSlots.has(s.key));

  // First missed slot: currentHour strictly > slotHour AND not completed
  const firstMissed = SCHEDULED_SLOTS.find(s =>
    currentHour > s.hour && !completedSlots.has(s.key)
  );

  // Next upcoming slot: in the future AND within 2 hours (minute-precision)
  const nextUpcoming = SCHEDULED_SLOTS.find(s => {
    const slotMin = s.hour * 60 + s.minute;
    const diff = slotMin - nowMinutes;
    return diff > 0 && diff <= 120 && !completedSlots.has(s.key);
  });

  if (allDone) {
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. Todos los depósitos hechos. ¿Qué necesitas?`
        : `Hey ${name}. All deposits done. What do you need?`;
    }
    return isSpanish
      ? `Hola ${name}. Todo al día hoy. ¿En qué puedo ayudarte?`
      : `Hi ${name}. You have completed all three deposits today. Is there something on your mind?`;
  }

  if (firstMissed) {
    const labelEsArticle = firstMissed.key === 'morning' ? 'la mañana'
      : firstMissed.key === 'afternoon' ? 'la tarde'
      : 'la noche';
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. No registraste el depósito de ${labelEsArticle}. ¿Lo hacemos ahora?`
        : `Hey ${name}. You skipped the ${firstMissed.labelEn} deposit. Want to catch it now?`;
    }
    return isSpanish
      ? `Hola ${name}. No registraste tu depósito de ${labelEsArticle}. ¿Lo hacemos ahora?`
      : `Hi ${name}. You missed your ${firstMissed.labelEn} deposit. Want to log it now?`;
  }

  if (nextUpcoming) {
    const timeStr = padTime(nextUpcoming.hour, nextUpcoming.minute);
    if (isSienna) {
      return isSpanish
        ? `Hola ${name}. Próximo depósito a las ${timeStr}. ¿Qué está pasando?`
        : `Hey ${name}. Next deposit at ${timeStr}. What is going on?`;
    }
    return isSpanish
      ? `Hola ${name}. Tu próximo depósito es a las ${timeStr}. ¿Quieres hablar de algo?`
      : `Hi ${name}. Your next deposit is at ${timeStr}. Anything you want to talk about before then?`;
  }

  // Default: between sessions, nothing pending
  if (isSienna) {
    return isSpanish
      ? `Hola ${name}. Todo al día. ¿Qué necesitas?`
      : `Hey ${name}. All caught up. What do you need?`;
  }
  return isSpanish
    ? `Hola ${name}. Todo al día hoy. ¿En qué puedo ayudarte?`
    : `Hi ${name}. All caught up. What is on your mind?`;
}
