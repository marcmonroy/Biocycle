import { Profile } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

export type CardGender = 'female' | 'male' | 'both';
export type CardPhase =
  | 'ovulatory'
  | 'follicular'
  | 'luteal'
  | 'late_luteal'
  | 'menstrual'
  | 'perimenopause'
  | 'andropause'
  | 'morning_peak'
  | 'tuesday_peak'
  | 'afternoon_dip'
  | 'evening_balanced'
  | 'night_rest'
  | 'cortisol_high'
  | 'anxiety_high'
  | 'recovery'
  | 'trading_milestone';
export type CardTimeSlot = 'morning' | 'midday' | 'evening' | 'night';
export type CardAgeGroup = 'all' | '40plus';

export interface LibraryCard {
  id: string;
  gender: CardGender;
  phase: CardPhase;
  timeSlot: CardTimeSlot;
  version: 1 | 2 | 3;
  image: string;
  headline_EN: string;
  copy_EN: string;
  banner_EN: string;
  headline_ES: string;
  copy_ES: string;
  banner_ES: string;
  picardia: boolean;
  funLevel: 1 | 2 | 3 | 4 | 5;
  ageGroup: CardAgeGroup;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function img(filename: string): string {
  return `https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library/${filename}.png`;
}

// ── Card Library ───────────────────────────────────────────────────────────

export const CARD_LIBRARY: LibraryCard[] = [
  // ── FEMALE / OVULATORY ──────────────────────────────────────────────────
  {
    id: 'f_ovulatory_morning_v1',
    gender: 'female',
    phase: 'ovulatory',
    timeSlot: 'morning',
    version: 1,
    image: img('f_ovulatory_morning_v1'),
    headline_EN: 'She has entered the room.',
    copy_EN: 'Your estrogen and testosterone just peaked together. You are magnetic, sharp, and slightly dangerous. Schedule the negotiation. Ask for the raise. Biology is doing the heavy lifting today.',
    banner_EN: '⚡ PEAK POWER',
    headline_ES: 'Ella ha entrado a la sala.',
    copy_ES: 'Tu estrógeno y testosterona acaban de llegar a su pico juntos. Eres magnética, aguda y ligeramente peligrosa. Agenda la negociación. Pide el aumento. La biología está haciendo el trabajo pesado hoy.',
    banner_ES: '⚡ PODER MÁXIMO',
    picardia: false,
    funLevel: 4,
    ageGroup: 'all',
  },
  {
    id: 'f_ovulatory_midday_v1',
    gender: 'female',
    phase: 'ovulatory',
    timeSlot: 'midday',
    version: 1,
    image: img('f_ovulatory_midday_v1'),
    headline_EN: 'Your brain is wired for persuasion right now.',
    copy_EN: 'Midcycle cognitive boost is real. Your verbal fluency, social reading, and confidence are all elevated. That call you\'ve been avoiding? Make it now.',
    banner_EN: '🧠 PEAK PERSUASION',
    headline_ES: 'Tu cerebro está en modo persuasión ahora mismo.',
    copy_ES: 'El impulso cognitivo a mitad de ciclo es real. Tu fluidez verbal, lectura social y confianza están elevadas. ¿Esa llamada que has estado evitando? Hazla ahora.',
    banner_ES: '🧠 PERSUASIÓN MÁXIMA',
    picardia: false,
    funLevel: 4,
    ageGroup: 'all',
  },
  {
    id: 'f_ovulatory_night_v1_picardia',
    gender: 'female',
    phase: 'ovulatory',
    timeSlot: 'night',
    version: 1,
    image: img('f_ovulatory_night_v1_picardia'),
    headline_EN: 'Tonight your body wrote the script.',
    copy_EN: 'Ovulatory peak raises desire, attractiveness signals, and risk appetite. Your biology has its own agenda tonight. Own it.',
    banner_EN: '🔥 DESIRE PEAK',
    headline_ES: 'Esta noche tu cuerpo escribió el guión.',
    copy_ES: 'El pico ovulatorio eleva el deseo, las señales de atractivo y el apetito por el riesgo. Tu biología tiene su propia agenda esta noche. Abrázala.',
    banner_ES: '🔥 PICO DE DESEO',
    picardia: true,
    funLevel: 5,
    ageGroup: 'all',
  },

  // ── FEMALE / FOLLICULAR ─────────────────────────────────────────────────
  {
    id: 'f_follicular_morning_v1',
    gender: 'female',
    phase: 'follicular',
    timeSlot: 'morning',
    version: 1,
    image: img('f_follicular_morning_v1'),
    headline_EN: 'New cycle. Clean slate. Rising energy.',
    copy_EN: 'Estrogen is climbing and so are you. Your brain is primed for learning new skills, starting projects, and absorbing information faster than usual. This is your biological spring.',
    banner_EN: '🌱 ENERGY RISING',
    headline_ES: 'Nuevo ciclo. Pizarrón en blanco. Energía en aumento.',
    copy_ES: 'El estrógeno está subiendo y tú también. Tu cerebro está listo para aprender nuevas habilidades, iniciar proyectos y absorber información más rápido de lo habitual. Esta es tu primavera biológica.',
    banner_ES: '🌱 ENERGÍA EN AUMENTO',
    picardia: false,
    funLevel: 3,
    ageGroup: 'all',
  },
  {
    id: 'f_follicular_midday_v1',
    gender: 'female',
    phase: 'follicular',
    timeSlot: 'midday',
    version: 1,
    image: img('f_follicular_midday_v1'),
    headline_EN: 'Your focus is unusually sharp today.',
    copy_EN: 'Follicular phase estrogen sharpens prefrontal cortex activity — the part responsible for planning, focus, and decision-making. That complex task you\'ve been procrastinating on? Now is the time.',
    banner_EN: '🎯 FOCUS MODE',
    headline_ES: 'Tu concentración está inusualmente aguda hoy.',
    copy_ES: 'El estrógeno en fase folicular agudiza la actividad de la corteza prefrontal — la parte responsable de la planificación, el enfoque y la toma de decisiones. ¿Esa tarea compleja que has estado posponiendo? Ahora es el momento.',
    banner_ES: '🎯 MODO ENFOQUE',
    picardia: false,
    funLevel: 3,
    ageGroup: 'all',
  },

  // ── FEMALE / LUTEAL ─────────────────────────────────────────────────────
  {
    id: 'f_luteal_evening_v1',
    gender: 'female',
    phase: 'luteal',
    timeSlot: 'evening',
    version: 1,
    image: img('f_luteal_evening_v1'),
    headline_EN: 'Your body is asking you to slow down.',
    copy_EN: 'Progesterone is doing what it does — creating a gravitational pull toward stillness. This is not laziness. This is biological intelligence. Rest is productive right now.',
    banner_EN: '🌙 RESTORE MODE',
    headline_ES: 'Tu cuerpo te está pidiendo que bajes el ritmo.',
    copy_ES: 'La progesterona está haciendo lo que hace: crear una atracción gravitacional hacia la quietud. Esto no es pereza. Es inteligencia biológica. Descansar es productivo ahora mismo.',
    banner_ES: '🌙 MODO RESTAURACIÓN',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },
  {
    id: 'f_luteal_morning_v1',
    gender: 'female',
    phase: 'luteal',
    timeSlot: 'morning',
    version: 1,
    image: img('f_luteal_morning_v1'),
    headline_EN: 'The critic is loud this week.',
    copy_EN: 'Luteal phase activates the brain\'s threat-detection network. That inner voice that says everything is wrong? It\'s progesterone talking. Name it. Don\'t follow it.',
    banner_EN: '🧠 INNER CRITIC ALERT',
    headline_ES: 'El crítico interior está fuerte esta semana.',
    copy_ES: 'La fase lútea activa la red de detección de amenazas del cerebro. Esa voz interior que dice que todo está mal? Es la progesterona hablando. Nómbrala. No la sigas.',
    banner_ES: '🧠 ALERTA: CRÍTICO INTERIOR',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── FEMALE / LATE LUTEAL ────────────────────────────────────────────────
  {
    id: 'f_late_luteal_evening_v1',
    gender: 'female',
    phase: 'late_luteal',
    timeSlot: 'evening',
    version: 1,
    image: img('f_late_luteal_evening_v1'),
    headline_EN: 'Everything is slightly more irritating. This is chemistry.',
    copy_EN: 'Estrogen and progesterone are both dropping. Serotonin follows. Your emotional threshold is genuinely lower. This is not a character flaw. It is a data point.',
    banner_EN: '⚠️ VULNERABILITY WINDOW',
    headline_ES: 'Todo es ligeramente más irritante. Esto es química.',
    copy_ES: 'El estrógeno y la progesterona están bajando. La serotonina los sigue. Tu umbral emocional está genuinamente más bajo. Esto no es un defecto de carácter. Es un dato.',
    banner_ES: '⚠️ VENTANA DE VULNERABILIDAD',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── FEMALE / MENSTRUAL ──────────────────────────────────────────────────
  {
    id: 'f_menstrual_morning_v1',
    gender: 'female',
    phase: 'menstrual',
    timeSlot: 'morning',
    version: 1,
    image: img('f_menstrual_morning_v1'),
    headline_EN: 'Rest is the strategy today.',
    copy_EN: 'Estrogen and progesterone are at their lowest. Your body is actively shedding and rebuilding. Deep rest, warm food, and gentle movement are not indulgences — they are precision recovery.',
    banner_EN: '🔴 REST PROTOCOL',
    headline_ES: 'El descanso es la estrategia hoy.',
    copy_ES: 'El estrógeno y la progesterona están en su punto más bajo. Tu cuerpo está activamente eliminando y reconstruyendo. El descanso profundo, la comida caliente y el movimiento suave no son indulgencias — son recuperación de precisión.',
    banner_ES: '🔴 PROTOCOLO DE DESCANSO',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },
  {
    id: 'f_menstrual_night_v1',
    gender: 'female',
    phase: 'menstrual',
    timeSlot: 'night',
    version: 1,
    image: img('f_menstrual_night_v1'),
    headline_EN: 'Your body is doing serious work tonight.',
    copy_EN: 'Menstrual phase requires significant energy. Sleep is when most of the repair happens. Prioritize 8 hours. Your data score tomorrow depends on tonight.',
    banner_EN: '💤 RECOVERY SLEEP',
    headline_ES: 'Tu cuerpo está haciendo un trabajo serio esta noche.',
    copy_ES: 'La fase menstrual requiere una energía significativa. El sueño es cuando ocurre la mayor parte de la reparación. Prioriza 8 horas. Tu puntuación de datos mañana depende de esta noche.',
    banner_ES: '💤 SUEÑO REPARADOR',
    picardia: false,
    funLevel: 1,
    ageGroup: 'all',
  },

  // ── MALE / MORNING PEAK ─────────────────────────────────────────────────
  {
    id: 'm_morning_peak_morning_v1',
    gender: 'male',
    phase: 'morning_peak',
    timeSlot: 'morning',
    version: 1,
    image: img('m_morning_peak_morning_v1'),
    headline_EN: 'Testosterone peaks 30 minutes after waking.',
    copy_EN: 'Your androgen levels are at their daily maximum right now. This is your biological window for high-stakes decisions, intense focus, and competitive performance. Use it before noon.',
    banner_EN: '⚡ T PEAK WINDOW',
    headline_ES: 'La testosterona llega al pico 30 minutos después de despertar.',
    copy_ES: 'Tus niveles de andrógenos están en su máximo diario ahora mismo. Esta es tu ventana biológica para decisiones de alto riesgo, enfoque intenso y rendimiento competitivo. Úsala antes del mediodía.',
    banner_ES: '⚡ VENTANA PICO DE T',
    picardia: false,
    funLevel: 4,
    ageGroup: 'all',
  },
  {
    id: 'm_morning_peak_morning_v1_picardia',
    gender: 'male',
    phase: 'morning_peak',
    timeSlot: 'morning',
    version: 1,
    image: img('m_morning_peak_morning_v1_picardia'),
    headline_EN: 'Testosterone is very much awake right now.',
    copy_EN: 'Morning testosterone peaks drive ambition, libido, and risk-taking. Your biology has a clear agenda this morning. It\'s not subtle.',
    banner_EN: '🔥 MORNING DRIVE',
    headline_ES: 'La testosterona está muy despierta ahora mismo.',
    copy_ES: 'Los picos de testosterona matutina impulsan la ambición, la libido y la toma de riesgos. Tu biología tiene una agenda clara esta mañana. No es sutil.',
    banner_ES: '🔥 IMPULSO MATUTINO',
    picardia: true,
    funLevel: 5,
    ageGroup: 'all',
  },

  // ── MALE / TUESDAY PEAK ─────────────────────────────────────────────────
  {
    id: 'm_tuesday_peak_morning_v1',
    gender: 'male',
    phase: 'tuesday_peak',
    timeSlot: 'morning',
    version: 1,
    image: img('m_tuesday_peak_morning_v1'),
    headline_EN: 'Tuesday is your biological peak day.',
    copy_EN: 'Studies show testosterone in men peaks on Tuesday mornings. Weekly patterns are real. Schedule your hardest negotiations, workouts, and creative work on Tuesdays.',
    banner_EN: '📈 WEEKLY PEAK',
    headline_ES: 'El martes es tu día pico biológico.',
    copy_ES: 'Los estudios muestran que la testosterona en los hombres llega al pico los martes por la mañana. Los patrones semanales son reales. Agenda tus negociaciones más difíciles, entrenamientos y trabajo creativo los martes.',
    banner_ES: '📈 PICO SEMANAL',
    picardia: false,
    funLevel: 4,
    ageGroup: 'all',
  },

  // ── BOTH / AFTERNOON DIP ────────────────────────────────────────────────
  {
    id: 'both_afternoon_dip_midday_v1',
    gender: 'both',
    phase: 'afternoon_dip',
    timeSlot: 'midday',
    version: 1,
    image: img('both_afternoon_dip_midday_v1'),
    headline_EN: 'The 2 PM crash is not your fault.',
    copy_EN: 'Cortisol drops naturally in the early afternoon. This is a universal human pattern driven by circadian rhythm, not personal weakness. A 20-minute rest here doubles afternoon productivity.',
    banner_EN: '😴 CIRCADIAN DIP',
    headline_ES: 'El bajón de las 2 PM no es tu culpa.',
    copy_ES: 'El cortisol baja naturalmente a primera hora de la tarde. Este es un patrón humano universal impulsado por el ritmo circadiano, no por debilidad personal. Un descanso de 20 minutos aquí duplica la productividad de la tarde.',
    banner_ES: '😴 DIP CIRCADIANO',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },
  {
    id: 'both_afternoon_dip_midday_v2',
    gender: 'both',
    phase: 'afternoon_dip',
    timeSlot: 'midday',
    version: 2,
    image: img('both_afternoon_dip_midday_v2'),
    headline_EN: 'Your body just asked for a nap.',
    copy_EN: 'The post-lunch dip is your biology scheduling maintenance. Metabolic reset, memory consolidation, and immune activity all spike during this window. Honor it — even 10 minutes of eyes closed counts.',
    banner_EN: '🔄 RESET WINDOW',
    headline_ES: 'Tu cuerpo acaba de pedir una siesta.',
    copy_ES: 'El bajón post-almuerzo es tu biología programando mantenimiento. El reinicio metabólico, la consolidación de la memoria y la actividad inmune aumentan durante esta ventana. Respétalo — incluso 10 minutos con los ojos cerrados cuentan.',
    banner_ES: '🔄 VENTANA DE REINICIO',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── BOTH / EVENING BALANCED ─────────────────────────────────────────────
  {
    id: 'both_evening_balanced_evening_v1',
    gender: 'both',
    phase: 'evening_balanced',
    timeSlot: 'evening',
    version: 1,
    image: img('both_evening_balanced_evening_v1'),
    headline_EN: 'The evening window is for connection.',
    copy_EN: 'Cortisol is low, oxytocin becomes dominant, and your social brain is most open. The conversations that matter most — the ones that require vulnerability — belong here.',
    banner_EN: '🤝 CONNECTION WINDOW',
    headline_ES: 'La ventana de la tarde es para la conexión.',
    copy_ES: 'El cortisol está bajo, la oxitocina se vuelve dominante y tu cerebro social está más abierto. Las conversaciones que más importan — las que requieren vulnerabilidad — pertenecen aquí.',
    banner_ES: '🤝 VENTANA DE CONEXIÓN',
    picardia: false,
    funLevel: 3,
    ageGroup: 'all',
  },

  // ── BOTH / NIGHT REST ───────────────────────────────────────────────────
  {
    id: 'both_night_rest_night_v1',
    gender: 'both',
    phase: 'night_rest',
    timeSlot: 'night',
    version: 1,
    image: img('both_night_rest_night_v1'),
    headline_EN: 'Sleep is when the data becomes intelligence.',
    copy_EN: 'Growth hormone peaks in the first sleep cycle. Memory consolidation, cellular repair, and hormonal reset all happen between 11 PM and 2 AM. Your data value is built while you sleep.',
    banner_EN: '💤 DATA BUILDING',
    headline_ES: 'El sueño es cuando los datos se convierten en inteligencia.',
    copy_ES: 'La hormona de crecimiento alcanza su pico en el primer ciclo de sueño. La consolidación de la memoria, la reparación celular y el reinicio hormonal ocurren entre las 11 PM y las 2 AM. El valor de tus datos se construye mientras duermes.',
    banner_ES: '💤 CONSTRUYENDO DATOS',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── BOTH / CORTISOL HIGH ────────────────────────────────────────────────
  {
    id: 'both_cortisol_high_morning_v1',
    gender: 'both',
    phase: 'cortisol_high',
    timeSlot: 'morning',
    version: 1,
    image: img('both_cortisol_high_morning_v1'),
    headline_EN: 'The stress tornado arrived early today.',
    copy_EN: 'Elevated cortisol sharpens focus in short bursts but degrades decision quality after 90 minutes. Protect your best cognitive window now. Delay low-stakes decisions until cortisol drops this afternoon.',
    banner_EN: '🌪️ CORTISOL SPIKE',
    headline_ES: 'El tornado de estrés llegó temprano hoy.',
    copy_ES: 'El cortisol elevado agudiza el enfoque en ráfagas cortas, pero degrada la calidad de las decisiones después de 90 minutos. Protege tu mejor ventana cognitiva ahora. Retrasa las decisiones de bajo riesgo hasta que el cortisol baje esta tarde.',
    banner_ES: '🌪️ PICO DE CORTISOL',
    picardia: false,
    funLevel: 3,
    ageGroup: 'all',
  },

  // ── BOTH / ANXIETY HIGH ─────────────────────────────────────────────────
  {
    id: 'both_anxiety_high_evening_v1',
    gender: 'both',
    phase: 'anxiety_high',
    timeSlot: 'evening',
    version: 1,
    image: img('both_anxiety_high_evening_v1'),
    headline_EN: 'Anxiety is a false prophet.',
    copy_EN: 'High anxiety activates the amygdala and creates a sense of urgency that is biologically real but informationally false. Nothing that feels catastrophic right now actually requires action tonight.',
    banner_EN: '🧠 AMYGDALA ALERT',
    headline_ES: 'La ansiedad es un falso profeta.',
    copy_ES: 'La ansiedad alta activa la amígdala y crea una sensación de urgencia que es biológicamente real pero informativamente falsa. Nada que se sienta catastrófico ahora mismo requiere acción esta noche.',
    banner_ES: '🧠 ALERTA AMÍGDALA',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── BOTH / RECOVERY ─────────────────────────────────────────────────────
  {
    id: 'both_recovery_morning_v1',
    gender: 'both',
    phase: 'recovery',
    timeSlot: 'morning',
    version: 1,
    image: img('both_recovery_morning_v1'),
    headline_EN: 'Recovery is the performance strategy.',
    copy_EN: 'After a high-output phase, your biology demands consolidation. Cortisol is suppressed. Growth factors are elevated. Pushing through now costs twice as much as resting through it.',
    banner_EN: '🔄 RECOVERY PHASE',
    headline_ES: 'La recuperación es la estrategia de rendimiento.',
    copy_ES: 'Después de una fase de alto rendimiento, tu biología exige consolidación. El cortisol está suprimido. Los factores de crecimiento están elevados. Seguir adelante ahora cuesta el doble que descansar.',
    banner_ES: '🔄 FASE DE RECUPERACIÓN',
    picardia: false,
    funLevel: 2,
    ageGroup: 'all',
  },

  // ── BOTH / TRADING MILESTONE ────────────────────────────────────────────
  {
    id: 'both_trading_milestone_morning_v1',
    gender: 'both',
    phase: 'trading_milestone',
    timeSlot: 'morning',
    version: 1,
    image: img('both_trading_milestone_morning_v1'),
    headline_EN: 'Your data just became research-grade.',
    copy_EN: 'You have reached 30 consecutive days of biometric deposits. Your longitudinal dataset is now eligible for pharmaceutical research. This is not just wellness tracking — this is a tradeable asset.',
    banner_EN: '🏆 RESEARCH ELIGIBLE',
    headline_ES: 'Tus datos acaban de volverse aptos para investigación.',
    copy_ES: 'Has alcanzado 30 días consecutivos de depósitos biométricos. Tu conjunto de datos longitudinales ahora es elegible para investigación farmacéutica. Esto no es solo seguimiento de bienestar — es un activo negociable.',
    banner_ES: '🏆 APTO PARA INVESTIGACIÓN',
    picardia: false,
    funLevel: 5,
    ageGroup: 'all',
  },

  // ── PERIMENOPAUSE ───────────────────────────────────────────────────────
  {
    id: 'f_perimenopause_morning_v1',
    gender: 'female',
    phase: 'perimenopause',
    timeSlot: 'morning',
    version: 1,
    image: img('f_perimenopause_morning_v1'),
    headline_EN: 'Your hormones are rewriting the rulebook.',
    copy_EN: 'Perimenopause is not decline — it is hormonal reorganization. Estrogen fluctuations are unpredictable by design. Tracking your patterns now gives you data your doctor does not have.',
    banner_EN: '🌿 TRANSITION PHASE',
    headline_ES: 'Tus hormonas están reescribiendo el manual.',
    copy_ES: 'La perimenopausia no es declive — es reorganización hormonal. Las fluctuaciones de estrógeno son impredecibles por diseño. Rastrear tus patrones ahora te da datos que tu médico no tiene.',
    banner_ES: '🌿 FASE DE TRANSICIÓN',
    picardia: false,
    funLevel: 3,
    ageGroup: '40plus',
  },
  {
    id: 'f_perimenopause_night_v1',
    gender: 'female',
    phase: 'perimenopause',
    timeSlot: 'night',
    version: 1,
    image: img('f_perimenopause_night_v1'),
    headline_EN: 'The night sweats have a biological explanation.',
    copy_EN: 'Estrogen regulates the hypothalamic thermostat. When levels drop unpredictably, the thermostat malfunctions. This is not a mystery. Your data is building a pattern that will predict these windows.',
    banner_EN: '🌡️ THERMOSTAT EVENT',
    headline_ES: 'Los sudores nocturnos tienen una explicación biológica.',
    copy_ES: 'El estrógeno regula el termostato hipotalámico. Cuando los niveles bajan de forma impredecible, el termostato falla. Esto no es un misterio. Tus datos están construyendo un patrón que predecirá estas ventanas.',
    banner_ES: '🌡️ EVENTO DE TERMOSTATO',
    picardia: false,
    funLevel: 2,
    ageGroup: '40plus',
  },

  // ── ANDROPAUSE ──────────────────────────────────────────────────────────
  {
    id: 'm_andropause_morning_v1',
    gender: 'male',
    phase: 'andropause',
    timeSlot: 'morning',
    version: 1,
    image: img('m_andropause_morning_v1'),
    headline_EN: 'Testosterone drops 1% per year after 40.',
    copy_EN: 'By 50, most men have 20–30% less testosterone than at their peak. Sleep quality, mood stability, and recovery time are the first signals. Your data is tracking all three.',
    banner_EN: '📊 ANDROPAUSE TRACKER',
    headline_ES: 'La testosterona baja 1% por año después de los 40.',
    copy_ES: 'A los 50, la mayoría de los hombres tienen entre un 20 y un 30% menos de testosterona que en su pico. La calidad del sueño, la estabilidad del estado de ánimo y el tiempo de recuperación son las primeras señales. Tus datos están rastreando las tres.',
    banner_ES: '📊 TRACKER DE ANDROPAUSIA',
    picardia: false,
    funLevel: 3,
    ageGroup: '40plus',
  },
];

// ── Helper: calculate age from fecha_nacimiento ────────────────────────────

function getAge(fechaNacimiento: string): number {
  const birth = new Date(fechaNacimiento);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ── getCardForUser ─────────────────────────────────────────────────────────

export function getCardForUser(
  profile: Profile,
  currentPhase: string,
  timeSlot: CardTimeSlot,
  lastShownCardIds: string[] = [],
): LibraryCard | null {
  const age = getAge(profile.fecha_nacimiento);
  const isAdult = age >= 18;
  const is40plus = age >= 40;
  const genderMap: Record<string, CardGender> = {
    femenino: 'female',
    masculino: 'male',
    prefiero_no_decir: 'both',
  };
  const userGender: CardGender = genderMap[profile.genero ?? ''] ?? 'both';

  // Helper: does a card's gender match the user?
  const genderMatch = (card: LibraryCard) =>
    card.gender === 'both' || card.gender === userGender;

  // Helper: does a card's phase match?
  const phaseMatch = (card: LibraryCard) => card.phase === currentPhase;

  // Helper: picardia filter
  const picardiaOk = (card: LibraryCard) =>
    !card.picardia || (isAdult && profile.picardia_mode === true);

  // Helper: age group filter — 40plus cards only shown to 40+ users
  const ageGroupOk = (card: LibraryCard) =>
    card.ageGroup === 'all' || (card.ageGroup === '40plus' && is40plus);

  // Helper: not recently shown
  const notRecent = (card: LibraryCard) => !lastShownCardIds.includes(card.id);

  // Include perimenopause/andropause phase cards for 40+ users when phase matches
  const phaseMatchExtended = (card: LibraryCard): boolean => {
    if (phaseMatch(card)) return true;
    if (is40plus) {
      if (userGender === 'female' && card.phase === 'perimenopause') return true;
      if (userGender === 'male' && card.phase === 'andropause') return true;
    }
    return false;
  };

  const baseFilter = (card: LibraryCard) =>
    genderMatch(card) && picardiaOk(card) && ageGroupOk(card) && notRecent(card);

  // 1. Try: phase + timeSlot match
  let pool = CARD_LIBRARY.filter(
    c => baseFilter(c) && phaseMatchExtended(c) && c.timeSlot === timeSlot,
  );

  // 2. Fallback: phase match only (any timeSlot)
  if (pool.length === 0) {
    pool = CARD_LIBRARY.filter(c => baseFilter(c) && phaseMatchExtended(c));
  }

  // 3. Fallback: gender + timeSlot, any phase (ignore recently-shown restriction)
  if (pool.length === 0) {
    pool = CARD_LIBRARY.filter(
      c => genderMatch(c) && picardiaOk(c) && ageGroupOk(c) && c.timeSlot === timeSlot,
    );
  }

  if (pool.length === 0) return null;

  return pool[Math.floor(Math.random() * pool.length)];
}

// ── getWhatsAppTeaser ──────────────────────────────────────────────────────

export function getWhatsAppTeaser(card: LibraryCard, profile: Profile): string {
  const isSpanish = profile.idioma === 'ES';
  const headline = isSpanish ? card.headline_ES : card.headline_EN;
  const banner = isSpanish ? card.banner_ES : card.banner_EN;
  const appLink = 'biocycle.app';

  if (isSpanish) {
    return `${banner}\n\n"${headline}"\n\nDescubre tu patrón biológico en ${appLink}`;
  }
  return `${banner}\n\n"${headline}"\n\nDiscover your biological pattern at ${appLink}`;
}
