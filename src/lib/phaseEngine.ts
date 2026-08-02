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

function getDayOfCycle(cycleStartDate: string, cycleLength: number): number {
  const start = new Date(cycleStartDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const len = cycleLength || 28;
  return (diffDays % len) + 1;
}

function getFemalePhase(cycleDay: number): PhaseResult {
  if (cycleDay >= 1 && cycleDay <= 5) {
    return {
      phase: 'menstrual',
      phaseDay: cycleDay,
      displayName: 'The Reset',
      displayNameES: 'El Reinicio',
      emoji: '🌑',
      description: 'Low-power mode. Rest today and thank yourself tomorrow.',
      descriptionES: 'Modo de bajo consumo. Descansa hoy y agradécetelo mañana.',
    };
  }
  if (cycleDay >= 6 && cycleDay <= 13) {
    return {
      phase: 'follicular',
      phaseDay: cycleDay - 5,
      displayName: 'The Climb',
      displayNameES: 'La Subida',
      emoji: '🌱',
      description: 'Fresh energy rising. Perfect time to start something new.',
      descriptionES: 'La energía va subiendo. Momento perfecto para empezar algo nuevo.',
    };
  }
  if (cycleDay >= 14 && cycleDay <= 16) {
    return {
      phase: 'ovulatory',
      phaseDay: cycleDay - 13,
      displayName: 'The Spotlight',
      displayNameES: 'El Brillo',
      emoji: '✨',
      description: "You're magnetic right now. The room notices when you walk in.",
      descriptionES: 'Tienes magnetismo. Se nota cuando entras a un lugar.',
    };
  }
  if (cycleDay >= 17 && cycleDay <= 24) {
    return {
      phase: 'luteal',
      phaseDay: cycleDay - 16,
      displayName: 'Deep Focus',
      displayNameES: 'Enfoque Profundo',
      emoji: '🍂',
      description: 'Energy turns inward. Great days for details and finishing things.',
      descriptionES: 'La energía mira hacia adentro. Buenos días para detalles y cierres.',
    };
  }
  // days 25–28 (and any overflow)
  return {
    phase: 'late_luteal',
    phaseDay: cycleDay - 24,
    displayName: 'The Tender Days',
    displayNameES: 'Los Días Sensibles',
    emoji: '🌘',
    description: 'Nerves run a little louder. Guard your calm like treasure.',
    descriptionES: 'Los nervios andan más despiertos. Cuida tu calma como un tesoro.',
  };
}

function getMalePhase(hour: number, dayOfWeek: number): PhaseResult {
  const isWeeklyPeak = dayOfWeek === 2; // Tuesday

  if (hour >= 6 && hour < 10) {
    return {
      phase: 'morning_peak',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Prime Time ⚡' : 'Prime Time',
      displayNameES: isWeeklyPeak ? 'Tu Hora Estelar ⚡' : 'Tu Hora Estelar',
      emoji: '☀️',
      description: 'Your sharpest hours. Spend them on what matters most.',
      descriptionES: 'Tus horas más lúcidas. Úsalas en lo que más importa.',
    };
  }
  if (hour >= 10 && hour < 14) {
    return {
      phase: 'midday_transition',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Cruise Mode ⚡' : 'Cruise Mode',
      displayNameES: isWeeklyPeak ? 'Velocidad Crucero ⚡' : 'Velocidad Crucero',
      emoji: '🌤',
      description: 'Steady focus window. Ideal for deep, uninterrupted work.',
      descriptionES: 'Ventana de enfoque sostenido. Ideal para trabajo profundo sin interrupciones.',
    };
  }
  if (hour >= 14 && hour < 17) {
    return {
      phase: 'afternoon_dip',
      phaseDay: 1,
      displayName: 'The Recharge',
      displayNameES: 'La Recarga',
      emoji: '🌥',
      description: 'A natural slowdown. A short walk beats a third coffee.',
      descriptionES: 'Un bajón natural. Una caminata corta le gana al tercer café.',
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      phase: 'evening_balance',
      phaseDay: 1,
      displayName: isWeeklyPeak ? 'Second Wind ⚡' : 'Second Wind',
      displayNameES: isWeeklyPeak ? 'Segundo Aire ⚡' : 'Segundo Aire',
      emoji: '🌆',
      description: 'Social energy comes back. A good time to connect.',
      descriptionES: 'Vuelve la energía social. Buen momento para conectar.',
    };
  }
  return {
    phase: 'night_rest',
    phaseDay: 1,
    displayName: 'The Recovery',
    displayNameES: 'La Recuperación',
    emoji: '🌙',
    description: 'Tomorrow gets built tonight. Give sleep the respect it deserves.',
    descriptionES: 'El mañana se construye esta noche. Dale al sueño el respeto que merece.',
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
      displayName: 'Your Own Rhythm',
      displayNameES: 'Tu Propio Ritmo',
      emoji: '🔥',
      description: 'Your rhythm follows no chart but yours. Jules learns it with you.',
      descriptionES: 'Tu ritmo no sigue ningún manual. Jules lo aprende contigo.',
    };
  }

  // Male 40+ → andropause
  if (gender === 'male' && age >= 40) {
    return {
      phase: 'andropause',
      phaseDay: 1,
      displayName: 'Steady Power',
      displayNameES: 'Poder Constante',
      emoji: '⚖️',
      description: 'Consistency is your superpower now. Steady beats flashy every time.',
      descriptionES: 'La constancia es tu superpoder. Lo constante le gana a lo llamativo.',
    };
  }

  // Female cycle-based
  if (gender === 'female' && profile.cycle_start_date) {
    const cycleDay = getDayOfCycle(profile.cycle_start_date, profile.cycle_length ?? 28);
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
