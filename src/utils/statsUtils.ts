import { Profile } from '../lib/supabase';
import { calculatePhase, PhaseData } from './phaseEngine';

export interface TodayStats extends PhaseData {
  quality: number;
  phaseDescription: { en: string; es: string };
}

const phaseDescriptions: Record<string, { en: string; es: string }> = {
  menstrual:        { es: 'Descanso y regeneración', en: 'Rest and regeneration' },
  follicular:       { es: 'Energía en ascenso',      en: 'Rising energy' },
  ovulatory:        { es: 'Pico de rendimiento',     en: 'Peak performance' },
  luteal:           { es: 'Introspección y foco',    en: 'Introspection and focus' },
  weekly_peak:      { es: 'Pico semanal',            en: 'Weekly peak' },
  morning_peak:     { es: 'Pico matutino',           en: 'Morning peak' },
  afternoon_dip:    { es: 'Bajada vespertina',       en: 'Afternoon dip' },
  evening_balanced: { es: 'Equilibrio nocturno',     en: 'Evening balance' },
  night_rest:       { es: 'Descanso nocturno',       en: 'Night rest' },
};

/**
 * Single source of truth for today's stats.
 * Both HomeScreen and ForecastScreen import this instead of calling
 * calculatePhase() or reading forecast[0] independently.
 */
export function getTodayStats(profile: Profile): TodayStats {
  const phaseData: PhaseData = calculatePhase(profile);

  const quality = Math.round(
    (phaseData.energy + phaseData.cognitive + phaseData.emotional + phaseData.physical) / 4,
  );

  const phaseDescription =
    phaseDescriptions[phaseData.phase] ?? { en: phaseData.phase, es: phaseData.phase };

  return { ...phaseData, quality, phaseDescription };
}
