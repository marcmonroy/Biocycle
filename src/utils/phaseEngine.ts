import { Profile } from '../lib/supabase';

export type PhaseData = {
  phase: string;
  energy: number;
  cognitive: number;
  emotional: number;
  physical: number;
  sexual: number;
  anxiety: number;
  cycleDay?: number;
};

export type ForecastDay = {
  date: Date;
  phase: string;
  energy: number;
  cognitive: number;
  emotional: number;
  physical: number;
  sexual: number;
  anxiety: number;
  insight: string;
};

const femalePhases = {
  menstrual: {
    phase: 'menstrual',
    energy: 35,
    cognitive: 40,
    emotional: 30,
    physical: 35,
    sexual: 18,
    anxiety: 45,
  },
  follicular: {
    phase: 'follicular',
    energy: 70,
    cognitive: 75,
    emotional: 65,
    physical: 70,
    sexual: 72,
    anxiety: 20,
  },
  ovulatory: {
    phase: 'ovulatory',
    energy: 95,
    cognitive: 85,
    emotional: 80,
    physical: 90,
    sexual: 95,
    anxiety: 15,
  },
  luteal_early: {
    phase: 'luteal',
    energy: 55,
    cognitive: 60,
    emotional: 45,
    physical: 50,
    sexual: 38,
    anxiety: 55,
  },
  luteal_late: {
    phase: 'luteal',
    energy: 55,
    cognitive: 60,
    emotional: 45,
    physical: 50,
    sexual: 38,
    anxiety: 85,
  },
};

const malePhases = {
  weekly_peak: {
    phase: 'weekly_peak',
    energy: 85,
    cognitive: 80,
    emotional: 70,
    physical: 88,
    sexual: 90,
    anxiety: 20,
  },
  morning_peak: {
    phase: 'morning_peak',
    energy: 90,
    cognitive: 92,
    emotional: 65,
    physical: 85,
    sexual: 85,
    anxiety: 25,
  },
  afternoon_dip: {
    phase: 'afternoon_dip',
    energy: 55,
    cognitive: 50,
    emotional: 60,
    physical: 55,
    sexual: 42,
    anxiety: 60,
  },
  evening_balanced: {
    phase: 'evening_balanced',
    energy: 70,
    cognitive: 65,
    emotional: 75,
    physical: 68,
    sexual: 68,
    anxiety: 35,
  },
  night_rest: {
    phase: 'night_rest',
    energy: 40,
    cognitive: 45,
    emotional: 70,
    physical: 38,
    sexual: 38,
    anxiety: 40,
  },
};

const circadianPhases = {
  morning_peak: {
    phase: 'morning_peak',
    energy: 85,
    cognitive: 88,
    emotional: 70,
    physical: 80,
    sexual: 75,
    anxiety: 30,
  },
  afternoon_dip: {
    phase: 'afternoon_dip',
    energy: 55,
    cognitive: 50,
    emotional: 60,
    physical: 55,
    sexual: 50,
    anxiety: 50,
  },
  evening_balanced: {
    phase: 'evening_balanced',
    energy: 70,
    cognitive: 65,
    emotional: 75,
    physical: 68,
    sexual: 60,
    anxiety: 35,
  },
  night_rest: {
    phase: 'night_rest',
    energy: 40,
    cognitive: 45,
    emotional: 70,
    physical: 38,
    sexual: 45,
    anxiety: 40,
  },
};

const phaseInsights: Record<string, string> = {
  menstrual: 'Tiempo de descanso y reflexion. Prioriza el autocuidado y actividades suaves.',
  follicular: 'Tu energia crece. Ideal para iniciar proyectos y probar cosas nuevas.',
  ovulatory: 'Estas en tu mejor momento. Aprovecha para socializar y tomar decisiones importantes.',
  luteal: 'Fase de introspeccion. Enfocate en completar tareas y preparar tu espacio.',
  weekly_peak: 'Mitad de semana con energia alta. Momento ideal para retos y reuniones clave.',
  morning_peak: 'Tu mente esta en su punto maximo. Dedica este tiempo a tareas complejas.',
  afternoon_dip: 'Energia natural baja. Ideal para tareas rutinarias o una pausa breve.',
  evening_balanced: 'Equilibrio recuperado. Buen momento para ejercicio o actividades sociales.',
  night_rest: 'Tu cuerpo pide descanso. Prepara tu mente para dormir bien.',
};

function getFemalePhase(cycleDay: number): PhaseData {
  let phaseData: PhaseData;

  if (cycleDay >= 1 && cycleDay <= 5) {
    phaseData = { ...femalePhases.menstrual };
  } else if (cycleDay >= 6 && cycleDay <= 13) {
    phaseData = { ...femalePhases.follicular };
  } else if (cycleDay >= 14 && cycleDay <= 17) {
    phaseData = { ...femalePhases.ovulatory };
  } else if (cycleDay >= 18 && cycleDay <= 24) {
    phaseData = { ...femalePhases.luteal_early };
  } else {
    phaseData = { ...femalePhases.luteal_late };
  }

  phaseData.cycleDay = cycleDay;
  return phaseData;
}

function getMalePhase(date: Date = new Date()): PhaseData {
  const hour = date.getHours();
  const dayOfWeek = date.getDay();
  const isMonday = dayOfWeek === 1;

  let phaseData: PhaseData;

  if (dayOfWeek === 2 || dayOfWeek === 3) {
    phaseData = { ...malePhases.weekly_peak };
  } else if (hour >= 6 && hour < 11) {
    phaseData = { ...malePhases.morning_peak };
  } else if (hour >= 11 && hour < 16) {
    phaseData = { ...malePhases.afternoon_dip };
  } else if (hour >= 16 && hour < 21) {
    phaseData = { ...malePhases.evening_balanced };
  } else {
    phaseData = { ...malePhases.night_rest };
  }

  if (isMonday) {
    phaseData = { ...phaseData, anxiety: phaseData.anxiety + 20 };
  }

  return phaseData;
}

function getCircadianPhase(date: Date = new Date()): PhaseData {
  const hour = date.getHours();

  if (hour >= 6 && hour < 11) {
    return { ...circadianPhases.morning_peak };
  } else if (hour >= 11 && hour < 16) {
    return { ...circadianPhases.afternoon_dip };
  } else if (hour >= 16 && hour < 21) {
    return { ...circadianPhases.evening_balanced };
  } else {
    return { ...circadianPhases.night_rest };
  }
}

export function calculatePhase(profile: Profile | null): PhaseData {
  if (!profile) {
    return getFemalePhase(14);
  }

  const isFemale = profile.genero === 'femenino';
  const isMale = profile.genero === 'masculino';

  if (isFemale && profile.last_period_date) {
    const lastPeriod = new Date(profile.last_period_date);
    const today = new Date();
    const diffTime = today.getTime() - lastPeriod.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const cycleLength = profile.cycle_length || 28;
    const cycleDay = (diffDays % cycleLength) + 1;
    return getFemalePhase(cycleDay);
  }

  if (isFemale) {
    return getFemalePhase(14);
  }

  if (isMale) {
    return getMalePhase();
  }

  return getCircadianPhase();
}

export function getForecast(profile: Profile | null): ForecastDay[] {
  const forecast: ForecastDay[] = [];
  const today = new Date();
  const isFemale = profile?.genero === 'femenino';
  const isMale = profile?.genero === 'masculino';

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    let phaseData: PhaseData;

    if (isFemale && profile?.last_period_date) {
      const lastPeriod = new Date(profile.last_period_date);
      const diffTime = date.getTime() - lastPeriod.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const cycleLength = profile.cycle_length || 28;
      const cycleDay = (diffDays % cycleLength) + 1;
      phaseData = getFemalePhase(cycleDay);
    } else if (isFemale) {
      const baseCycleDay = 14 + i;
      const adjustedDay = baseCycleDay > 28 ? baseCycleDay - 28 : baseCycleDay;
      phaseData = getFemalePhase(adjustedDay);
    } else if (isMale) {
      const forecastDate = new Date(date);
      forecastDate.setHours(10, 0, 0, 0);
      phaseData = getMalePhase(forecastDate);
    } else {
      const forecastDate = new Date(date);
      forecastDate.setHours(10, 0, 0, 0);
      phaseData = getCircadianPhase(forecastDate);
    }

    forecast.push({
      date,
      phase: phaseData.phase,
      energy: phaseData.energy,
      cognitive: phaseData.cognitive,
      emotional: phaseData.emotional,
      physical: phaseData.physical,
      sexual: phaseData.sexual,
      anxiety: phaseData.anxiety,
      insight: phaseInsights[phaseData.phase],
    });
  }

  return forecast;
}
