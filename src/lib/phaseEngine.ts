import type { Profile } from './supabase';

export type PhaseTag =
  | 'follicular'
  | 'ovulatory'
  | 'luteal'
  | 'late_luteal'
  | 'menstrual'
  | 'perimenopause'
  | 'morning_peak'
  | 'midday_transition'
  | 'afternoon_dip'
  | 'evening_balance'
  | 'night_rest'
  | 'andropause';

export interface PhaseResult {
  phase: PhaseTag;
  phaseDay: number;
  displayName: string;
  displayNameES: string;
  emoji: string;
  description: string;
  descriptionES: string;
}

function getAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function getDayOfCycle(cycleStartDate: string): number {
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const cycleLength = 28;
  return (diffDays % cycleLength) + 1;
}

function getFemalePhase(cycleDay: number): PhaseResult {
  if (cycleDay >= 1 && cycleDay <= 5) {
    return {
      phase: 'menstrual',
      phaseDay: cycleDay,
      displayName: 'Menstrual Phase',
      displayNameES: 'Fase Menstrual',
      emoji: '🌑',
      description: 'Rest and restoration. Your body is in full reset mode.',
      descriptionES: 'Descanso y restauración. Tu cuerpo está en modo reinicio.',
    };
  }
  if (cycleDay >= 6 && cycleDay <= 13) {
    return {
      phase: 'follicular',
      phaseDay: cycleDay - 5,
      displayName: 'Follicular Phase',
      displayNameES: 'Fase Folicular',
      emoji: '🌱',
      description: 'Rising estrogen. Energy builds, creativity sharpens.',
      descriptionES: 'Estrógeno en ascenso. Energía creciente, creatividad agudizada.',
    };
  }
  if (cycleDay >= 14 && cycleDay <= 16) {
    return {
      phase: 'ovulatory',
      phaseDay: cycleDay - 13,
      displayName: 'Ovulatory Phase',
      displayNameES: 'Fase Ovulatoria',
      emoji: '✨',
      description: 'Peak energy, magnetism, and social confidence.',
      descriptionES: 'Energía máxima, magnetismo y confianza social.',
    };
  }
  if (cycleDay >= 17 && cycleDay <= 24) {
    return {
      phase: 'luteal',
      phaseDay: cycleDay - 16,
      displayName: 'Luteal Phase',
      displayNameES: 'Fase Lútea',
      emoji: '🍂',
      description: 'Progesterone rises. Inward focus, detail orientation.',
      descriptionES: 'Progesterona en ascenso. Enfoque interno, orientación al detalle.',
    };
  }
  // days 25–28 (and any overflow)
  return {
    phase: 'late_luteal',
    phaseDay: cycleDay - 24,
    displayName: 'Late Luteal Phase',
    displayNameES: 'Fase Lútea Tardía',
    emoji: '🌘',
    description: 'Pre-menstrual window. Sensitivity heightens.',
    descriptionES: 'Ventana premenstrual. La sensibilidad se intensifica.',
  };
}

function getMalePhase(hour: number, dayOfWeek: number): PhaseResult {
  const isWeeklyPeak = dayOfWeek === 2; // Tuesday

  if (hour >= 6 && hour < 10) {
    return {
      phase: 'morning_peak',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Morning Peak ⚡' : 'Morning Peak',
      displayNameES: isWeeklyPeak ? 'Pico Matutino ⚡' : 'Pico Matutino',
      emoji: '☀️',
      description: 'Testosterone peaks within 30 minutes of waking. Your biological prime time.',
      descriptionES: 'La testosterona alcanza su pico 30 minutos después de despertar.',
    };
  }
  if (hour >= 10 && hour < 14) {
    return {
      phase: 'midday_transition',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Midday Transition ⚡' : 'Midday Transition',
      displayNameES: isWeeklyPeak ? 'Transición Mediodía ⚡' : 'Transición Mediodía',
      emoji: '🌤',
      description: 'Sustained focus window. Cognitive tasks flow best here.',
      descriptionES: 'Ventana de concentración sostenida. Las tareas cognitivas fluyen mejor.',
    };
  }
  if (hour >= 14 && hour < 17) {
    return {
      phase: 'afternoon_dip',
      phaseDay: 1,
      displayName: 'Afternoon Dip',
      displayNameES: 'Bajada Vespertina',
      emoji: '🌥',
      description: 'Natural cortisol dip. Body asks for rest or light movement.',
      descriptionES: 'Descenso natural del cortisol. El cuerpo pide descanso.',
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      phase: 'evening_balance',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Evening Balance ⚡' : 'Evening Balance',
      displayNameES: isWeeklyPeak ? 'Equilibrio Nocturno ⚡' : 'Equilibrio Nocturno',
      emoji: '🌆',
      description: 'Social energy reactivates. Second wind for connection.',
      descriptionES: 'Energía social se reactiva. Segunda oportunidad para conectar.',
    };
  }
  return {
    phase: 'night_rest',
    phaseDay: 1,
    displayName: 'Night Rest',
    displayNameES: 'Descanso Nocturno',
    emoji: '🌙',
    description: 'Recovery mode. Testosterone and growth hormone replenish.',
    descriptionES: 'Modo recuperación. Testosterona y hormona de crecimiento se reponen.',
  };
}

export function getCurrentPhase(profile: Profile): PhaseResult {
  const age = profile.fecha_nacimiento ? getAge(profile.fecha_nacimiento) : 0;
  const gender = profile.genero;
  const hour = new Date().getHours();
  const dayOfWeek = new Date().getDay();

  // Female 40+ → perimenopause
  if (gender === 'female' && age >= 40) {
    return {
      phase: 'perimenopause',
      phaseDay: 1,
      displayName: 'Perimenopause',
      displayNameES: 'Perimenopausia',
      emoji: '🔥',
      description: 'Hormonal fluctuation. Jules tracks your unique pattern.',
      descriptionES: 'Fluctuación hormonal. Jules rastrea tu patrón único.',
    };
  }

  // Male 40+ → andropause
  if (gender === 'male' && age >= 40) {
    return {
      phase: 'andropause',
      phaseDay: 1,
      displayName: 'Andropause',
      displayNameES: 'Andropausia',
      emoji: '⚖️',
      description: 'Gradual hormonal shift. Consistency is your edge.',
      descriptionES: 'Cambio hormonal gradual. La consistencia es tu ventaja.',
    };
  }

  // Female cycle-based
  if (gender === 'female' && profile.cycle_start_date) {
    const cycleDay = getDayOfCycle(profile.cycle_start_date);
    return getFemalePhase(cycleDay);
  }

  // Male or non-binary → time-based
  return getMalePhase(hour, dayOfWeek);
}

export function getDaysOfData(profile: Profile): number {
  if (profile.days_of_data != null) return profile.days_of_data;
  if (!profile.created_at) return 0;
  const created = new Date(profile.created_at);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export function getCurrentTimeSlot(): 'morning' | 'midday' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
