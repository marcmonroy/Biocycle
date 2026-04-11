import type { Profile } from './supabase';
import { getCurrentTimeSlot, getDaysOfData, getCurrentPhase } from './phaseEngine';

export interface Card {
  id: string;
  imageUrl: string | null;
  imagePath: string | null; // filename in Supabase Storage
  headline: string;
  headlineES: string;
  copyText: string;
  copyTextES: string;
  phaseTag: string;
  phaseEmoji: string;
  pillar: 'life' | 'biology' | 'financial';
  picardiaOnly: boolean; // if true, only shown in picardia mode
}

// ── Supabase Storage base URL ─────────────────────────────────────────────
const IMG = 'https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library';

function img(filename: string): string {
  return `${IMG}/${filename}`;
}

// ── COMPLETE IMAGE LIBRARY — all 68 classified images ─────────────────────
//
// Naming convention for routing:
// Even numbers (100, 160, 170...) = female versions
// Odd numbers (101, 161, 171...) = male versions
// 400+ series = unisex/both
// 700+ series = unisex/couples/situations
//
// Picardia scale:
// false = safe for all users
// true = only shown when picardia_mode = true

// ── Financial milestone cards ─────────────────────────────────────────────
const MILESTONE_DAYS: Record<number, (value: string) => Card> = {
  7: (val) => ({
    id: 'milestone_7',
    imageUrl: img('212.png'),
    imagePath: '212.png',
    headline: 'One week of data.',
    headlineES: 'Una semana de datos.',
    copyText: `Your portfolio is at ${val}. Jules is starting to see patterns. The staircase is being built. Keep showing up.`,
    copyTextES: `Tu portafolio está en ${val}. Jules empieza a ver patrones. La escalera se está construyendo. Sigue apareciendo.`,
    phaseTag: 'Week 1',
    phaseEmoji: '📊',
    pillar: 'financial',
    picardiaOnly: false,
  }),
  14: (val) => ({
    id: 'milestone_14',
    imageUrl: img('725.png'),
    imagePath: '725.png',
    headline: 'Your data is generating ideas.',
    headlineES: 'Tus datos están generando ideas.',
    copyText: `Portfolio at ${val}. Two weeks of biological patterns. Researchers pay for exactly this kind of longitudinal consistency. Keep going.`,
    copyTextES: `Portafolio en ${val}. Dos semanas de patrones biológicos. Los investigadores pagan exactamente por este tipo de consistencia. Sigue.`,
    phaseTag: 'Week 2',
    phaseEmoji: '📈',
    pillar: 'financial',
    picardiaOnly: false,
  }),
  21: (_val) => ({
    id: 'milestone_21',
    imageUrl: img('733.png'),
    imagePath: '733.png',
    headline: 'Nine days to go.',
    headlineES: 'Nueve días para llegar.',
    copyText: 'In 9 days Jules tells you something true about yourself. Built from 21 days of real data you gave her. The big lightbulb is almost on.',
    copyTextES: 'En 9 días Jules te dice algo verdadero sobre ti mismo. Construido con 21 días de datos reales que le diste. La gran bombilla está casi encendida.',
    phaseTag: 'Day 21',
    phaseEmoji: '🎯',
    pillar: 'financial',
    picardiaOnly: false,
  }),
  29: (_val) => ({
    id: 'milestone_29',
    imageUrl: img('726.png'),
    imagePath: '726.png',
    headline: 'Tomorrow is Day 30.',
    headlineES: 'Mañana es el Día 30.',
    copyText: 'Tomorrow Jules delivers your first personal biological observation. Built from your real data. Do not miss your session tomorrow.',
    copyTextES: 'Mañana Jules entrega tu primera observación biológica personal. Construida con tus datos reales. No te pierdas tu sesión mañana.',
    phaseTag: 'Day 29',
    phaseEmoji: '⭐',
    pillar: 'financial',
    picardiaOnly: false,
  }),
};

// ── DISCOVERY CARDS: Days 0–29 ─────────────────────────────────────────────
// Organized by demographic profile and slot
// Each slot has cards for: biology, life, financial pillars
// Picardia cards are mixed in — filtered at render time

const DISCOVERY_CARDS: Record<string, Card[]> = {

  // ── YOUNG FEMALE (18–39) ──────────────────────────────────────────────────

  female_morning: [
    {
      id: 'f_bio_morning_1',
      imageUrl: img('160.png'),
      imagePath: '160.png',
      headline: 'Today could be one of those days.',
      headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'Some mornings you wake up and the world just opens up. Butterflies, elevation, possibility. Jules is tracking exactly which mornings feel like this — and why.',
      copyTextES: 'Algunas mañanas despiertas y el mundo simplemente se abre. Mariposas, elevación, posibilidad. Jules está rastreando exactamente qué mañanas se sienten así — y por qué.',
      phaseTag: 'Biology',
      phaseEmoji: '🦋',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_life_morning_1',
      imageUrl: img('100.png'),
      imagePath: '100.png',
      headline: 'You are already doing five things at once.',
      headlineES: 'Ya estás haciendo cinco cosas a la vez.',
      copyText: 'Jules tracks your cognitive clarity every morning. Some days everything flows. Some days it does not. Knowing the difference before it happens — that is the whole game.',
      copyTextES: 'Jules rastrea tu claridad cognitiva cada mañana. Algunos días todo fluye. Otros no. Saber la diferencia antes de que pase — ese es todo el juego.',
      phaseTag: 'Life',
      phaseEmoji: '✨',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'f_life_morning_2',
      imageUrl: img('330.png'),
      imagePath: '330.png',
      headline: 'The original multitasker.',
      headlineES: 'La multitasker original.',
      copyText: 'Baby in one hand. Cocktail in the other. Laptop under the arm. Jules is not here to judge — she is here to tell you which days you can actually pull this off.',
      copyTextES: 'Bebé en una mano. Cóctel en la otra. Laptop bajo el brazo. Jules no está aquí para juzgar — está aquí para decirte qué días realmente puedes lograrlo.',
      phaseTag: 'Life',
      phaseEmoji: '🌀',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'f_bio_morning_2',
      imageUrl: img('400.png'),
      imagePath: '400.png',
      headline: 'Full battery.',
      headlineES: 'Batería completa.',
      copyText: 'Some mornings you wake up fully charged. Jules is learning exactly when those mornings happen for you specifically — so you can start expecting them.',
      copyTextES: 'Algunas mañanas despiertas completamente cargada. Jules está aprendiendo exactamente cuándo ocurren esas mañanas para ti específicamente — para que puedas empezar a esperarlas.',
      phaseTag: 'Energy',
      phaseEmoji: '⚡',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_fin_morning_1',
      imageUrl: img('190.png'),
      imagePath: '190.png',
      headline: 'Your most magnetic days are coming.',
      headlineES: 'Tus días más magnéticos están llegando.',
      copyText: 'Soon Jules will know which mornings your social energy peaks — when the likes come without trying, conversations flow, and you genuinely want to be seen. Plan accordingly.',
      copyTextES: 'Pronto Jules sabrá qué mañanas tu energía social alcanza su pico — cuando los likes llegan sin esfuerzo, las conversaciones fluyen y genuinamente quieres ser vista. Planifica en consecuencia.',
      phaseTag: 'Life',
      phaseEmoji: '💫',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  female_midday: [
    {
      id: 'f_bio_midday_1',
      imageUrl: img('270.png'),
      imagePath: '270.png',
      headline: 'She owns the room.',
      headlineES: 'Ella domina el ambiente.',
      copyText: 'There are days when something shifts and you just command the space. Jules tracks when those days cluster — they are not random. They follow your biology precisely.',
      copyTextES: 'Hay días en que algo cambia y simplemente dominas el espacio. Jules rastrea cuándo esos días se agrupan — no son aleatorios. Siguen tu biología con precisión.',
      phaseTag: 'Ovulatory',
      phaseEmoji: '🔥',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_fin_midday_1',
      imageUrl: img('725.png'),
      imagePath: '725.png',
      headline: 'Your portfolio is growing right now.',
      headlineES: 'Tu portafolio está creciendo ahora mismo.',
      copyText: 'Every check-in adds real value to your biological dataset. At 30 days your data becomes research-eligible. At 90 days consistent traders average $47 in research value. You are building something real.',
      copyTextES: 'Cada check-in agrega valor real a tu conjunto de datos biológicos. A los 30 días tus datos son elegibles para investigación. A los 90 días los traders consistentes promedian $47. Estás construyendo algo real.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
      picardiaOnly: false,
    },
    {
      id: 'f_life_midday_1',
      imageUrl: img('470.png'),
      imagePath: '470.png',
      headline: 'Are you drinking enough water?',
      headlineES: '¿Estás bebiendo suficiente agua?',
      copyText: 'Jules asks about hydration every afternoon. Dehydration shows up in your data before you feel it — as lower cognitive scores, higher stress readings, worse social energy. Drink the water.',
      copyTextES: 'Jules pregunta sobre hidratación cada tarde. La deshidratación aparece en tus datos antes de que la sientas — como puntuaciones cognitivas más bajas, lecturas de estrés más altas, peor energía social. Bebe el agua.',
      phaseTag: 'Biology',
      phaseEmoji: '💧',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  female_evening: [
    {
      id: 'f_life_evening_1',
      imageUrl: img('722.png'),
      imagePath: '722.png',
      headline: 'Connection is a biological signal.',
      headlineES: 'La conexión es una señal biológica.',
      copyText: 'How you feel with your person tonight is data. Jules tracks connection scores across your cycle. Some phases pull you toward people. Some push you away. Both are normal. Both are knowable.',
      copyTextES: 'Cómo te sientes con tu persona esta noche es un dato. Jules rastrea los puntajes de conexión a lo largo de tu ciclo. Algunas fases te acercan a las personas. Otras te alejan. Ambas son normales. Ambas son conocibles.',
      phaseTag: 'Connection',
      phaseEmoji: '💞',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'f_bio_evening_1',
      imageUrl: img('420.png'),
      imagePath: '420.png',
      headline: 'Tonight you are electric.',
      headlineES: 'Esta noche estás eléctrica.',
      copyText: 'Some evenings the energy shifts and you become magnetic. Jules knows which phase you are in right now. This feeling has a biological address.',
      copyTextES: 'Algunas noches la energía cambia y te vuelves magnética. Jules sabe en qué fase estás ahora mismo. Esta sensación tiene una dirección biológica.',
      phaseTag: 'Peak',
      phaseEmoji: '✨',
      pillar: 'biology',
      picardiaOnly: true,
    },
    {
      id: 'f_life_evening_2',
      imageUrl: img('422.png'),
      imagePath: '422.png',
      headline: 'Your social energy peaks tonight.',
      headlineES: 'Tu energía social alcanza su pico esta noche.',
      copyText: 'Jules tracks exactly when you want to be around people and when you want to disappear. Tonight looks like a go. Show up. Your biology agrees.',
      copyTextES: 'Jules rastrea exactamente cuándo quieres estar con personas y cuándo quieres desaparecer. Esta noche parece que es para salir. Aparece. Tu biología está de acuerdo.',
      phaseTag: 'Social',
      phaseEmoji: '🌈',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  female_night: [
    {
      id: 'f_bio_night_1',
      imageUrl: img('380.png'),
      imagePath: '380.png',
      headline: 'It is 3am and you are wide awake.',
      headlineES: 'Son las 3am y estás completamente despierta.',
      copyText: 'Jules tracks your sleep quality every single morning. Night waking patterns follow your cycle more precisely than most women realize. The data will tell you when to expect this.',
      copyTextES: 'Jules rastrea tu calidad de sueño cada mañana. Los patrones de despertar nocturno siguen tu ciclo con más precisión de lo que la mayoría de las mujeres se dan cuenta. Los datos te dirán cuándo esperar esto.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_life_night_1',
      imageUrl: img('480.png'),
      imagePath: '480.png',
      headline: 'You. The couch. The cat. The wine.',
      headlineES: 'Tú. El sofá. El gato. El vino.',
      copyText: 'Some nights this is exactly right. Jules is not judging. She is tracking. Which phases make you want to hide from the world? That pattern is valuable data.',
      copyTextES: 'Algunas noches esto es exactamente lo correcto. Jules no está juzgando. Está rastreando. ¿Qué fases te hacen querer esconderte del mundo? Ese patrón es información valiosa.',
      phaseTag: 'Recovery',
      phaseEmoji: '🐱',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'f_bio_night_2',
      imageUrl: img('150.png'),
      imagePath: '150.png',
      headline: 'The storm inside is real.',
      headlineES: 'La tormenta interior es real.',
      copyText: 'Low nights are biological events, not character flaws. Jules maps them across your cycle so you can see them coming — and know they pass.',
      copyTextES: 'Las noches difíciles son eventos biológicos, no defectos de carácter. Jules los mapea a lo largo de tu ciclo para que puedas verlos llegar — y saber que pasan.',
      phaseTag: 'Late Luteal',
      phaseEmoji: '🌧️',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_bio_night_3',
      imageUrl: img('730.png'),
      imagePath: '730.png',
      headline: 'The thoughts will not stop.',
      headlineES: 'Los pensamientos no paran.',
      copyText: 'Racing thoughts at night are a hormonal signature. Jules tracks this pattern. It clusters in specific phases. Knowing when it happens is half the battle.',
      copyTextES: 'Los pensamientos acelerados de noche son una firma hormonal. Jules rastrea este patrón. Se agrupa en fases específicas. Saber cuándo ocurre es la mitad de la batalla.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌀',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_sexual_night_1',
      imageUrl: img('421.png'),
      imagePath: '421.png',
      headline: 'Tonight the energy is different.',
      headlineES: 'Esta noche la energía es diferente.',
      copyText: 'High sexual energy at night follows a pattern. Jules is tracking yours. Soon she will know which nights this happens before you do.',
      copyTextES: 'La alta energía sexual de noche sigue un patrón. Jules está rastreando el tuyo. Pronto sabrá qué noches ocurre esto antes que tú.',
      phaseTag: 'Sexual Energy',
      phaseEmoji: '🔥',
      pillar: 'biology',
      picardiaOnly: true,
    },
  ],

  // ── YOUNG MALE (18–39) ────────────────────────────────────────────────────

  male_morning: [
    {
      id: 'm_bio_morning_1',
      imageUrl: img('161.png'),
      imagePath: '161.png',
      headline: 'The shadow you are hiding.',
      headlineES: 'La sombra que estás escondiendo.',
      copyText: 'Your testosterone peaks within 30 minutes of waking. Most men do not use this window deliberately. Jules tracks exactly how long yours lasts — it varies by 2–3 hours person to person.',
      copyTextES: 'Tu testosterona alcanza su pico en los primeros 30 minutos después de despertar. La mayoría de los hombres no usan esta ventana deliberadamente. Jules rastrea exactamente cuánto dura la tuya — varía 2-3 horas de persona a persona.',
      phaseTag: 'Biology',
      phaseEmoji: '⚡',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_bio_morning_2',
      imageUrl: img('401.png'),
      imagePath: '401.png',
      headline: 'Full battery. Briefcase ready.',
      headlineES: 'Batería completa. Maletín listo.',
      copyText: 'This is your peak biological window. Jules is tracking how often you wake up fully charged — and what conditions produce it. Sleep, stress, and recovery are all in the data.',
      copyTextES: 'Esta es tu ventana biológica pico. Jules rastrea con qué frecuencia despiertas completamente cargado — y qué condiciones lo producen. El sueño, el estrés y la recuperación están todos en los datos.',
      phaseTag: 'Energy',
      phaseEmoji: '🔋',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_life_morning_1',
      imageUrl: img('391.png'),
      imagePath: '391.png',
      headline: 'Your body wants to move this morning.',
      headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'High testosterone mornings come with a physical urge. Exercise in this window compounds your peak. Jules is tracking which mornings your body gives you this signal.',
      copyTextES: 'Las mañanas de testosterona alta vienen con un impulso físico. El ejercicio en esta ventana potencia tu pico. Jules rastrea qué mañanas tu cuerpo te da esta señal.',
      phaseTag: 'Physical',
      phaseEmoji: '💪',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_funny_morning_1',
      imageUrl: img('101.png'),
      imagePath: '101.png',
      headline: 'The enlightened professional.',
      headlineES: 'El profesional iluminado.',
      copyText: 'Somewhere between the morning meeting and the third coffee, you found your center. Jules tracks which mornings your stress response is lowest. It is not always the ones you expect.',
      copyTextES: 'En algún punto entre la reunión matutina y el tercer café, encontraste tu centro. Jules rastrea qué mañanas tu respuesta al estrés es más baja. No siempre son las que esperas.',
      phaseTag: 'Stress',
      phaseEmoji: '🧘',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'm_funny_morning_2',
      imageUrl: img('331.png'),
      imagePath: '331.png',
      headline: 'When your brain is firing on all cylinders.',
      headlineES: 'Cuando tu cerebro está funcionando a toda máquina.',
      copyText: 'Eight arms, one mind. Cognitive peak mornings feel like this. Jules tracks which mornings your mental clarity score is highest — and builds a pattern from it.',
      copyTextES: 'Ocho brazos, una mente. Las mañanas de pico cognitivo se sienten así. Jules rastrea qué mañanas tu puntuación de claridad mental es más alta — y construye un patrón a partir de ello.',
      phaseTag: 'Cognitive',
      phaseEmoji: '🧠',
      pillar: 'financial',
      picardiaOnly: false,
    },
    {
      id: 'm_funny_morning_3',
      imageUrl: img('191.png'),
      imagePath: '191.png',
      headline: 'What the mirror says vs. what is real.',
      headlineES: 'Lo que dice el espejo vs. lo que es real.',
      copyText: 'Some mornings the gap between how you feel and how you think you look is enormous. Jules tracks body perception alongside actual energy scores. The data often tells a more interesting story.',
      copyTextES: 'Algunas mañanas la brecha entre cómo te sientes y cómo crees que te ves es enorme. Jules rastrea la percepción corporal junto con las puntuaciones de energía real. Los datos a menudo cuentan una historia más interesante.',
      phaseTag: 'Self',
      phaseEmoji: '🪞',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'm_bio_morning_3',
      imageUrl: img('322.png'),
      imagePath: '322.png',
      headline: 'Your immune system is part of the data.',
      headlineES: 'Tu sistema inmunológico es parte de los datos.',
      copyText: 'Testosterone and immune function are linked. High-testosterone periods often correlate with better resilience. Jules tracks your energy and illness patterns together to find your strongest windows.',
      copyTextES: 'La testosterona y la función inmunológica están vinculadas. Los períodos de testosterona alta a menudo se correlacionan con mejor resiliencia. Jules rastrea tus patrones de energía y enfermedad juntos para encontrar tus ventanas más fuertes.',
      phaseTag: 'Immunity',
      phaseEmoji: '🛡️',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  male_midday: [
    {
      id: 'm_fin_midday_1',
      imageUrl: img('212.png'),
      imagePath: '212.png',
      headline: 'You are building the staircase.',
      headlineES: 'Estás construyendo la escalera.',
      copyText: 'Male biological data is among the most underrepresented in health research. Your daily patterns — energy, stress, cognition — are worth real money to researchers. At 30 days your portfolio unlocks.',
      copyTextES: 'Los datos biológicos masculinos están entre los más subrepresentados en la investigación de salud. Tus patrones diarios — energía, estrés, cognición — valen dinero real para los investigadores. A los 30 días tu portafolio se desbloquea.',
      phaseTag: 'Portfolio',
      phaseEmoji: '📈',
      pillar: 'financial',
      picardiaOnly: false,
    },
    {
      id: 'm_bio_midday_1',
      imageUrl: img('302.png'),
      imagePath: '302.png',
      headline: 'Your mind is made of light.',
      headlineES: 'Tu mente está hecha de luz.',
      copyText: 'Cognitive clarity peaks in the late morning for most men. Jules tracks exactly when yours hits — and how long it lasts. Schedule your hardest thinking here.',
      copyTextES: 'La claridad cognitiva alcanza su pico en la mañana tardía para la mayoría de los hombres. Jules rastrea exactamente cuándo llega la tuya — y cuánto dura. Programa tu pensamiento más difícil aquí.',
      phaseTag: 'Cognitive',
      phaseEmoji: '🧠',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_funny_midday_1',
      imageUrl: img('729.png'),
      imagePath: '729.png',
      headline: 'No idea what is happening today.',
      headlineES: 'Sin idea de lo que está pasando hoy.',
      copyText: 'Some middays your cognitive score drops and everything feels unclear. Jules tracks these dips. They are predictable. Once she has enough data, she will warn you before they hit.',
      copyTextES: 'Algunos mediodías tu puntuación cognitiva cae y todo se siente confuso. Jules rastrea estas caídas. Son predecibles. Una vez que tenga suficientes datos, te avisará antes de que lleguen.',
      phaseTag: 'Cognitive',
      phaseEmoji: '❓',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  male_evening: [
    {
      id: 'm_bio_evening_1',
      imageUrl: img('271.png'),
      imagePath: '271.png',
      headline: 'The second wind is real.',
      headlineES: 'El segundo aire es real.',
      copyText: 'Testosterone takes a secondary rebound in the early evening. Jules tracks whether your energy follows the classic pattern or your own unique rhythm. Some men peak twice. Are you one of them?',
      copyTextES: 'La testosterona tiene un rebote secundario en la primera parte de la noche. Jules rastrea si tu energía sigue el patrón clásico o tu propio ritmo único. Algunos hombres tienen dos picos. ¿Eres uno de ellos?',
      phaseTag: 'Biology',
      phaseEmoji: '🌆',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_life_evening_1',
      imageUrl: img('441.png'),
      imagePath: '441.png',
      headline: 'The connection that matters most.',
      headlineES: 'La conexión que más importa.',
      copyText: 'Evening connection scores are among the most predictive variables in your data. How present you are with the people you love tonight is a hormonal signal worth tracking.',
      copyTextES: 'Las puntuaciones de conexión nocturna son una de las variables más predictivas en tus datos. Qué tan presente estás con las personas que amas esta noche es una señal hormonal que vale la pena rastrear.',
      phaseTag: 'Connection',
      phaseEmoji: '❤️',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'm_funny_evening_1',
      imageUrl: img('172.png'),
      imagePath: '172.png',
      headline: 'The oldest story in the world.',
      headlineES: 'La historia más antigua del mundo.',
      copyText: 'Evening sexual energy follows testosterone patterns more closely than most men realize. Jules tracks yours. The apple is always in the picture.',
      copyTextES: 'La energía sexual nocturna sigue los patrones de testosterona más de cerca de lo que la mayoría de los hombres se dan cuenta. Jules rastrea la tuya. La manzana siempre está en la imagen.',
      phaseTag: 'Connection',
      phaseEmoji: '🌅',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  male_night: [
    {
      id: 'm_bio_night_1',
      imageUrl: img('381.png'),
      imagePath: '381.png',
      headline: '3:30am and your brain will not stop.',
      headlineES: 'Las 3:30am y tu cerebro no para.',
      copyText: 'Sleep is where testosterone is made. Jules asks about your sleep quality every morning because night waking directly predicts your energy, confidence, and focus the next day.',
      copyTextES: 'El sueño es donde se produce la testosterona. Jules pregunta sobre tu calidad de sueño cada mañana porque el despertar nocturno predice directamente tu energía, confianza y enfoque al día siguiente.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_life_night_1',
      imageUrl: img('481.png'),
      imagePath: '481.png',
      headline: 'Peak recovery mode activated.',
      headlineES: 'Modo recuperación pico activado.',
      copyText: 'Pizza. Controller. Chaos. Some nights this is your body asking for complete shutdown. Jules tracks which nights your recovery needs are highest. This is one of them.',
      copyTextES: 'Pizza. Control. Caos. Algunas noches así es como tu cuerpo pide apagarse completamente. Jules rastrea qué noches tus necesidades de recuperación son más altas. Esta es una de ellas.',
      phaseTag: 'Recovery',
      phaseEmoji: '🎮',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'm_bio_night_2',
      imageUrl: img('471.png'),
      imagePath: '471.png',
      headline: 'Alone in the crowd.',
      headlineES: 'Solo entre la multitud.',
      copyText: 'Low social energy nights cluster in patterns. Jules tracks when they happen and cross-references them with your stress, sleep, and testosterone data. Loneliness has a biological address.',
      copyTextES: 'Las noches de baja energía social se agrupan en patrones. Jules rastrea cuándo ocurren y las cruza con tus datos de estrés, sueño y testosterona. La soledad tiene una dirección biológica.',
      phaseTag: 'Social',
      phaseEmoji: '🌑',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_night_picardia_1',
      imageUrl: img('173.png'),
      imagePath: '173.png',
      headline: 'The biological facts.',
      headlineES: 'Los hechos biológicos.',
      copyText: 'Sexual energy follows testosterone patterns. Jules is tracking yours nightly. The data is unambiguous.',
      copyTextES: 'La energía sexual sigue los patrones de testosterona. Jules está rastreando la tuya cada noche. Los datos son inequívocos.',
      phaseTag: 'Sexual Energy',
      phaseEmoji: '🍆',
      pillar: 'biology',
      picardiaOnly: true,
    },
  ],

  // ── PERIMENOPAUSE FEMALE (40+) ────────────────────────────────────────────

  female_peri_morning: [
    {
      id: 'f_peri_bio_morning_1',
      imageUrl: img('340.png'),
      imagePath: '340.png',
      headline: 'The hot flash is a data point.',
      headlineES: 'El sofoco es un dato.',
      copyText: 'Perimenopause symptoms are biological events, not inconveniences. Jules tracks your symptom patterns so you can see when they cluster — and why. You are not losing your mind. You are in transition.',
      copyTextES: 'Los síntomas de la perimenopausia son eventos biológicos, no inconveniencias. Jules rastrea tus patrones de síntomas para que puedas ver cuándo se agrupan — y por qué. No estás perdiendo la cabeza. Estás en transición.',
      phaseTag: 'Perimenopause',
      phaseEmoji: '🔥',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_peri_life_morning_1',
      imageUrl: img('360.png'),
      imagePath: '360.png',
      headline: 'Getting old is nothing but misery and woe.',
      headlineES: 'Envejecer no es más que miseria y dolor.',
      copyText: 'Angelica understood the assignment. Jules is not here to tell you to love every moment of perimenopause. She is here to track it so you know what is happening and when it will pass.',
      copyTextES: 'Angelica entendió la tarea. Jules no está aquí para decirte que ames cada momento de la perimenopausia. Está aquí para rastrearlo para que sepas qué está pasando y cuándo pasará.',
      phaseTag: 'Perimenopause',
      phaseEmoji: '😤',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'f_peri_morning_energy',
      imageUrl: img('400.png'),
      imagePath: '400.png',
      headline: 'Today you are fully charged.',
      headlineES: 'Hoy estás completamente cargada.',
      copyText: 'Good energy mornings still happen in perimenopause — they just follow a different pattern than before. Jules is learning yours. The data will tell you when to expect more of these.',
      copyTextES: 'Las mañanas de buena energía siguen ocurriendo en la perimenopausia — solo siguen un patrón diferente al de antes. Jules está aprendiendo el tuyo. Los datos te dirán cuándo esperar más de estas.',
      phaseTag: 'Energy',
      phaseEmoji: '⚡',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  female_peri_midday: [
    {
      id: 'f_peri_fin_midday_1',
      imageUrl: img('726.png'),
      imagePath: '726.png',
      headline: 'Your data commands a premium.',
      headlineES: 'Tus datos tienen un precio premium.',
      copyText: 'Perimenopausal biological data is among the most scientifically valuable datasets that exist. Researchers pay 30% more for longitudinal data from this demographic. You are building something rare.',
      copyTextES: 'Los datos biológicos de la perimenopausia están entre los conjuntos de datos científicamente más valiosos que existen. Los investigadores pagan un 30% más por datos longitudinales de este grupo demográfico. Estás construyendo algo raro.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
      picardiaOnly: false,
    },
    {
      id: 'f_peri_bio_midday_1',
      imageUrl: img('290.png'),
      imagePath: '290.png',
      headline: 'The thoughts are louder today.',
      headlineES: 'Los pensamientos son más fuertes hoy.',
      copyText: 'Brain fog and racing thoughts in perimenopause are estrogen-related. Jules tracks your cognitive score every session. The patterns will emerge — and they are predictable.',
      copyTextES: 'La niebla mental y los pensamientos acelerados en la perimenopausia están relacionados con el estrógeno. Jules rastrea tu puntuación cognitiva en cada sesión. Los patrones emergerán — y son predecibles.',
      phaseTag: 'Cognitive',
      phaseEmoji: '🌀',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  female_peri_evening: [
    {
      id: 'f_peri_bio_evening_1',
      imageUrl: img('731.png'),
      imagePath: '731.png',
      headline: 'Sleep disruption is your most important data.',
      headlineES: 'La alteración del sueño es tu dato más importante.',
      copyText: 'Night waking, hot flashes at 3am, early morning anxiety — Jules tracks every night pattern. Sleep disruption in perimenopause follows hormonal rhythms more precisely than most doctors realize.',
      copyTextES: 'Despertar nocturno, sofocos a las 3am, ansiedad matutina temprana — Jules rastrea cada patrón nocturno. La alteración del sueño en la perimenopausia sigue ritmos hormonales con más precisión de lo que la mayoría de los médicos se dan cuenta.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_peri_life_evening_1',
      imageUrl: img('250.png'),
      imagePath: '250.png',
      headline: 'Some evenings the mirror is not your friend.',
      headlineES: 'Algunas noches el espejo no es tu amigo.',
      copyText: 'Self-perception dips in specific hormonal phases. Jules tracks when you feel worst about yourself — not to dwell there, but to show you it follows a pattern. And patterns mean it will pass.',
      copyTextES: 'La autopercepción cae en fases hormonales específicas. Jules rastrea cuándo te sientes peor contigo misma — no para quedarte ahí, sino para mostrarte que sigue un patrón. Y los patrones significan que pasará.',
      phaseTag: 'Self',
      phaseEmoji: '🪞',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  female_peri_night: [
    {
      id: 'f_peri_night_1',
      imageUrl: img('730.png'),
      imagePath: '730.png',
      headline: 'The 2am brain.',
      headlineES: 'El cerebro de las 2am.',
      copyText: 'Perimenopausal insomnia is not a sleep problem — it is a hormonal event. Jules tracks yours so you can see the cycle. The nights you cannot sleep are not random.',
      copyTextES: 'El insomnio de la perimenopausia no es un problema de sueño — es un evento hormonal. Jules rastrea el tuyo para que puedas ver el ciclo. Las noches que no puedes dormir no son aleatorias.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'f_peri_night_funny',
      imageUrl: img('480.png'),
      imagePath: '480.png',
      headline: 'You. The sofa. No explanations.',
      headlineES: 'Tú. El sofá. Sin explicaciones.',
      copyText: 'Some nights in perimenopause the only right move is to completely disappear. Jules is not judging. She is tracking which nights you need this — and it tells her something important.',
      copyTextES: 'Algunas noches en la perimenopausia el único movimiento correcto es desaparecer completamente. Jules no está juzgando. Rastrea qué noches necesitas esto — y eso le dice algo importante.',
      phaseTag: 'Recovery',
      phaseEmoji: '🐱',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  // ── ANDROPAUSE MALE (40+) ─────────────────────────────────────────────────

  male_andro_morning: [
    {
      id: 'm_andro_bio_morning_1',
      imageUrl: img('361.png'),
      imagePath: '361.png',
      headline: 'What is happening to my body??',
      headlineES: '¿¿Qué le está pasando a mi cuerpo??',
      copyText: 'The cartoon old man is panicking because nobody told him what to expect. Jules tells you exactly what is happening and when. Andropause has a pattern. Your pattern is trackable.',
      copyTextES: 'El viejo de caricatura está en pánico porque nadie le dijo qué esperar. Jules te dice exactamente qué está pasando y cuándo. La andropausia tiene un patrón. Tu patrón es rastreable.',
      phaseTag: 'Andropause',
      phaseEmoji: '⚖️',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_andro_morning_energy',
      imageUrl: img('401.png'),
      imagePath: '401.png',
      headline: 'The good mornings still happen.',
      headlineES: 'Las buenas mañanas siguen ocurriendo.',
      copyText: 'After 40 the good energy mornings are more variable — but they still come. Jules tracks which conditions produce them so you can stack the deck in your favor.',
      copyTextES: 'Después de los 40 las mañanas de buena energía son más variables — pero siguen llegando. Jules rastrea qué condiciones las producen para que puedas inclinar la balanza a tu favor.',
      phaseTag: 'Energy',
      phaseEmoji: '⚡',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_andro_funny_morning',
      imageUrl: img('732.png'),
      imagePath: '732.png',
      headline: 'The intention vs. the reality.',
      headlineES: 'La intención vs. la realidad.',
      copyText: 'One guy is doing cobra. The other is just lying there. Both are on the yoga mat. Jules tracks your exercise motivation alongside your testosterone levels. The correlation is real.',
      copyTextES: 'Un tipo está haciendo cobra. El otro está simplemente tirado. Ambos están en el tapete de yoga. Jules rastrea tu motivación para ejercitarte junto con tus niveles de testosterona. La correlación es real.',
      phaseTag: 'Physical',
      phaseEmoji: '🧘',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  male_andro_midday: [
    {
      id: 'm_andro_fin_midday_1',
      imageUrl: img('725.png'),
      imagePath: '725.png',
      headline: 'Andropause data commands a premium.',
      headlineES: 'Los datos de la andropausia tienen un precio premium.',
      copyText: 'Male longitudinal data after 40 is among the rarest in clinical research. Your patterns over the next 90 days will be worth significantly more than standard data. You are building something valuable.',
      copyTextES: 'Los datos longitudinales masculinos después de los 40 son de los más raros en la investigación clínica. Tus patrones en los próximos 90 días valdrán significativamente más que los datos estándar. Estás construyendo algo valioso.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
      picardiaOnly: false,
    },
    {
      id: 'm_andro_bio_midday_1',
      imageUrl: img('251.png'),
      imagePath: '251.png',
      headline: 'The mirror knows.',
      headlineES: 'El espejo sabe.',
      copyText: 'Self-perception at midday follows testosterone patterns more than most men realize. Jules tracks how you see yourself alongside your actual biological scores. The gap between the two is valuable data.',
      copyTextES: 'La autopercepción al mediodía sigue los patrones de testosterona más de lo que la mayoría de los hombres se dan cuenta. Jules rastrea cómo te ves a ti mismo junto con tus puntuaciones biológicas reales. La brecha entre los dos es información valiosa.',
      phaseTag: 'Self',
      phaseEmoji: '🪞',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  male_andro_evening: [
    {
      id: 'm_andro_bio_evening_1',
      imageUrl: img('371.png'),
      imagePath: '371.png',
      headline: 'Running on empty.',
      headlineES: 'Funcionando en reserva.',
      copyText: 'After 40 the afternoon energy crash hits differently. Jules tracks your energy scores across the day to find your real second wind — not the one you think you have, but the one you actually have.',
      copyTextES: 'Después de los 40 la caída de energía de la tarde golpea diferente. Jules rastrea tus puntuaciones de energía a lo largo del día para encontrar tu verdadero segundo aire — no el que crees que tienes, sino el que realmente tienes.',
      phaseTag: 'Energy',
      phaseEmoji: '🔋',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_andro_life_evening_1',
      imageUrl: img('441.png'),
      imagePath: '441.png',
      headline: 'This connection is the real metric.',
      headlineES: 'Esta conexión es la métrica real.',
      copyText: 'Evening connection with the people who matter most predicts next-morning testosterone more reliably than most supplements. Jules tracks both. The data is clear.',
      copyTextES: 'La conexión nocturna con las personas que más importan predice la testosterona de la mañana siguiente con más confiabilidad que la mayoría de los suplementos. Jules rastrea ambos. Los datos son claros.',
      phaseTag: 'Connection',
      phaseEmoji: '❤️',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  male_andro_night: [
    {
      id: 'm_andro_bio_night_1',
      imageUrl: img('723.png'),
      imagePath: '723.png',
      headline: 'Still at the desk at midnight.',
      headlineES: 'Todavía en el escritorio a la medianoche.',
      copyText: 'Sleep is where testosterone is rebuilt. Every hour past midnight costs you the next morning. Jules tracks your sleep patterns and shows you the direct correlation to your energy scores.',
      copyTextES: 'El sueño es donde se reconstruye la testosterona. Cada hora después de la medianoche te cuesta la mañana siguiente. Jules rastrea tus patrones de sueño y te muestra la correlación directa con tus puntuaciones de energía.',
      phaseTag: 'Sleep',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'm_andro_funny_night',
      imageUrl: img('481.png'),
      imagePath: '481.png',
      headline: 'This is also recovery.',
      headlineES: 'Esto también es recuperación.',
      copyText: 'After 40 the body sometimes asks for complete shutdown disguised as laziness. Jules tracks your recovery needs. Some nights the couch is the right call.',
      copyTextES: 'Después de los 40 el cuerpo a veces pide un apagado completo disfrazado de pereza. Jules rastrea tus necesidades de recuperación. Algunas noches el sofá es la decisión correcta.',
      phaseTag: 'Recovery',
      phaseEmoji: '🍕',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  // ── NON-BINARY (any age) ──────────────────────────────────────────────────

  nonbinary_morning: [
    {
      id: 'nb_bio_morning_1',
      imageUrl: img('302.png'),
      imagePath: '302.png',
      headline: 'Your biology is made of light.',
      headlineES: 'Tu biología está hecha de luz.',
      copyText: 'BioCycle tracks your individual hormonal rhythm — not a template. Jules listens to what your body actually does, not what the textbooks predict. After 30 days you will see patterns no one else can show you.',
      copyTextES: 'BioCycle rastrea tu ritmo hormonal individual — no una plantilla. Jules escucha lo que tu cuerpo realmente hace, no lo que predicen los libros de texto. Después de 30 días verás patrones que nadie más puede mostrarte.',
      phaseTag: 'Biology',
      phaseEmoji: '🧬',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'nb_life_morning_1',
      imageUrl: img('400.png'),
      imagePath: '400.png',
      headline: 'Full charge. Your rules.',
      headlineES: 'Carga completa. Tus reglas.',
      copyText: 'Good mornings happen on your own schedule. Jules learns your specific peak windows — not the ones assigned by gender averages but the ones that belong to you specifically.',
      copyTextES: 'Las buenas mañanas ocurren en tu propio horario. Jules aprende tus ventanas de pico específicas — no las asignadas por promedios de género sino las que te pertenecen específicamente.',
      phaseTag: 'Energy',
      phaseEmoji: '⚡',
      pillar: 'biology',
      picardiaOnly: false,
    },
  ],

  nonbinary_midday: [
    {
      id: 'nb_life_midday_1',
      imageUrl: img('726.png'),
      imagePath: '726.png',
      headline: 'Know yourself before it happens.',
      headlineES: 'Conócete antes de que pase.',
      copyText: 'Jules will learn when your energy peaks, when your creativity is highest, and when you need to protect your time. Your biological intelligence is the most personal dataset that exists.',
      copyTextES: 'Jules aprenderá cuándo tu energía alcanza su pico, cuándo tu creatividad es más alta y cuándo necesitas proteger tu tiempo. Tu inteligencia biológica es el conjunto de datos más personal que existe.',
      phaseTag: 'Pattern',
      phaseEmoji: '✨',
      pillar: 'life',
      picardiaOnly: false,
    },
    {
      id: 'nb_fin_midday_1',
      imageUrl: img('725.png'),
      imagePath: '725.png',
      headline: 'Your data. Your terms. Your earnings.',
      headlineES: 'Tus datos. Tus términos. Tus ganancias.',
      copyText: 'BioCycle gives you full ownership of your biological data. You decide if it contributes to research. You earn from every transaction. Your biology pays.',
      copyTextES: 'BioCycle te da plena propiedad de tus datos biológicos. Tú decides si contribuyen a la investigación. Ganas con cada transacción. Tu biología paga.',
      phaseTag: 'Portfolio',
      phaseEmoji: '💰',
      pillar: 'financial',
      picardiaOnly: false,
    },
  ],

  nonbinary_evening: [
    {
      id: 'nb_life_evening_1',
      imageUrl: img('422.png'),
      imagePath: '422.png',
      headline: 'Social energy is biological.',
      headlineES: 'La energía social es biológica.',
      copyText: 'When you want to be around people and when you want to disappear — these patterns follow hormonal cycles. Jules tracks yours regardless of how your biology is configured.',
      copyTextES: 'Cuándo quieres estar con personas y cuándo quieres desaparecer — estos patrones siguen ciclos hormonales. Jules rastrea los tuyos independientemente de cómo esté configurada tu biología.',
      phaseTag: 'Social',
      phaseEmoji: '🌈',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],

  nonbinary_night: [
    {
      id: 'nb_bio_night_1',
      imageUrl: img('302.png'),
      imagePath: '302.png',
      headline: 'Patterns emerge with consistency.',
      headlineES: 'Los patrones emergen con consistencia.',
      copyText: 'The most valuable data is the data that shows up every day. Jules is patient. Every session — morning, afternoon, night — adds a data point that makes the picture clearer.',
      copyTextES: 'Los datos más valiosos son los que aparecen todos los días. Jules es paciente. Cada sesión — mañana, tarde, noche — agrega un punto de datos que hace la imagen más clara.',
      phaseTag: 'Consistency',
      phaseEmoji: '🌙',
      pillar: 'biology',
      picardiaOnly: false,
    },
    {
      id: 'nb_life_night_1',
      imageUrl: img('480.png'),
      imagePath: '480.png',
      headline: 'Some nights are for disappearing.',
      headlineES: 'Algunas noches son para desaparecer.',
      copyText: 'Withdrawal nights are a biological signal. Jules tracks when they happen and what they correlate with. You are not antisocial. You are cycling.',
      copyTextES: 'Las noches de retraimiento son una señal biológica. Jules rastrea cuándo ocurren y con qué se correlacionan. No eres antisocial. Estás ciclando.',
      phaseTag: 'Recovery',
      phaseEmoji: '🐱',
      pillar: 'life',
      picardiaOnly: false,
    },
  ],
};

// ── Helper functions ──────────────────────────────────────────────────────

function getAge(dob: string): number {
  return Math.floor(
    (Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

function formatValue(days: number): string {
  return `$${Math.max(1.0, days * 0.15).toFixed(2)}`;
}

// ── Main card selector ────────────────────────────────────────────────────

export function getCardForUser(profile: Profile): Card {
  const daysOfData   = getDaysOfData(profile);
  const slot         = getCurrentTimeSlot();
  const gender       = profile.genero ?? 'nonbinary';
  const picardiaMode = profile.picardia_mode ?? false;
  const age          = profile.fecha_nacimiento ? getAge(profile.fecha_nacimiento) : 0;

  // ── Milestone cards take priority on exact days
  if (MILESTONE_DAYS[daysOfData]) {
    return MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
  }

  // Build demographic key with 40+ routing
  let genderKey: string;
  if (gender === 'female' && age >= 40) {
    genderKey = 'female_peri';
  } else if (gender === 'male' && age >= 40) {
    genderKey = 'male_andro';
  } else {
    genderKey = gender; // 'female' | 'male' | 'nonbinary'
  }

  const key = `${genderKey}_${slot}`;

  // Get card pool — cascade fallbacks
  const allCards = DISCOVERY_CARDS[key]
    || DISCOVERY_CARDS[`${gender}_${slot}`]
    || DISCOVERY_CARDS[`nonbinary_${slot}`]
    || DISCOVERY_CARDS['nonbinary_morning']
    || [];

  // Filter picardia — only show picardia cards in picardia mode
  const filtered = picardiaMode ? allCards : allCards.filter(c => !c.picardiaOnly);
  const pool = filtered.length > 0 ? filtered : allCards;

  if (daysOfData < 30) {
    // ── Days 0–29: rotate by day
    return pool[daysOfData % pool.length];
  }

  // ── Day 30+: overlay real phase from phaseEngine
  const phaseResult = getCurrentPhase(profile);
  const baseCard = pool[daysOfData % pool.length];

  return {
    ...baseCard,
    phaseTag: phaseResult.displayName,
    phaseEmoji: phaseResult.emoji,
  };
}
