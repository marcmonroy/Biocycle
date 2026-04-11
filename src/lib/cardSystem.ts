import type { Profile } from './supabase';
import { getCurrentTimeSlot, getDaysOfData, getCurrentPhase } from './phaseEngine';

export interface Card {
  id: string;
  imageUrl: string | null;
  imagePath: string | null;
  headline: string;
  headlineES: string;
  copyText: string;
  copyTextES: string;
  phaseTag: string;
  phaseEmoji: string;
  pillar: 'life' | 'biology' | 'financial';
  picardiaOnly: boolean;
}

const IMG = 'https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library';
function img(f: string): string { return `${IMG}/${f}`; }

// ── MILESTONE CARDS — shown on exact days ─────────────────────────────────

const MILESTONE_DAYS: Record<number, (value: string) => Card> = {
  7: (val) => ({
    id: 'milestone_7', imagePath: '212.png', imageUrl: img('212.png'),
    headline: 'One week of data.',
    headlineES: 'Una semana de datos.',
    copyText: `Your portfolio is at ${val}. Jules is starting to see patterns. The staircase is being built. Keep showing up.`,
    copyTextES: `Tu portafolio está en ${val}. Jules empieza a ver patrones. La escalera se está construyendo. Sigue apareciendo.`,
    phaseTag: 'Week 1', phaseEmoji: '📊', pillar: 'financial', picardiaOnly: false,
  }),
  14: (val) => ({
    id: 'milestone_14', imagePath: '706.png', imageUrl: img('706.png'),
    headline: 'High five. Your data is paying.',
    headlineES: 'Choca esos cinco. Tus datos están pagando.',
    copyText: `Two weeks in. Portfolio at ${val}. You are in the research pool. The coins are stacking. Keep the streak alive.`,
    copyTextES: `Dos semanas adentro. Portafolio en ${val}. Estás en el banco de investigación. Las monedas se acumulan. Mantén la racha viva.`,
    phaseTag: 'Week 2', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
  }),
  21: (_val) => ({
    id: 'milestone_21', imagePath: '715.png', imageUrl: img('715.png'),
    headline: 'Nine days to go.',
    headlineES: 'Nueve días para llegar.',
    copyText: 'Every day adds another level. In 9 days Jules tells you something true about yourself built from 21 days of your real data. The staircase is almost complete.',
    copyTextES: 'Cada día agrega otro nivel. En 9 días Jules te dice algo verdadero sobre ti construido con 21 días de tus datos reales. La escalera está casi completa.',
    phaseTag: 'Day 21', phaseEmoji: '🎯', pillar: 'financial', picardiaOnly: false,
  }),
  29: (_val) => ({
    id: 'milestone_29', imagePath: '720.png', imageUrl: img('720.png'),
    headline: 'Tomorrow the lightbulb turns on.',
    headlineES: 'Mañana se enciende el foco.',
    copyText: 'Tomorrow is Day 30. Jules delivers your first personal biological observation. The question mark becomes a lightbulb. Do not miss your session tomorrow.',
    copyTextES: 'Mañana es el Día 30. Jules entrega tu primera observación biológica personal. El signo de interrogación se convierte en foco. No te pierdas tu sesión mañana.',
    phaseTag: 'Day 29', phaseEmoji: '⭐', pillar: 'financial', picardiaOnly: false,
  }),
};

// ── DISCOVERY CARDS: Days 0–29 ─────────────────────────────────────────────

const DISCOVERY_CARDS: Record<string, Card[]> = {

  // ── YOUNG FEMALE (18–39) ──────────────────────────────────────────────────

  female_morning: [
    {
      id: 'f_bio_morning_1', imagePath: '160.png', imageUrl: img('160.png'),
      headline: 'Today could be one of those days.',
      headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'Some mornings you wake up and the world just opens. Butterflies, elevation, possibility. Jules is tracking exactly which mornings feel like this — and why.',
      copyTextES: 'Algunas mañanas despiertas y el mundo simplemente se abre. Mariposas, elevación, posibilidad. Jules rastrea exactamente qué mañanas se sienten así — y por qué.',
      phaseTag: 'Biology', phaseEmoji: '🦋', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_life_morning_1', imagePath: '430.png', imageUrl: img('430.png'),
      headline: 'You are already in balance.',
      headlineES: 'Ya estás en equilibrio.',
      copyText: 'Some mornings your body just knows. Jules tracks your morning energy score every day. When it lines up with your phase — and it will — you will see it coming.',
      copyTextES: 'Algunas mañanas tu cuerpo simplemente sabe. Jules rastrea tu puntuación de energía matutina cada día. Cuando se alinea con tu fase — y lo hará — lo verás venir.',
      phaseTag: 'Life', phaseEmoji: '✨', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_life_morning_2', imagePath: '330.png', imageUrl: img('330.png'),
      headline: 'The original multitasker.',
      headlineES: 'La multitasker original.',
      copyText: 'Baby in one hand. Cocktail in the other. Laptop under the arm. Jules is not here to judge — she is here to tell you which days you can actually pull this off.',
      copyTextES: 'Bebé en una mano. Cóctel en la otra. Laptop bajo el brazo. Jules no está aquí para juzgar — está aquí para decirte qué días realmente puedes lograrlo.',
      phaseTag: 'Life', phaseEmoji: '🌀', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_bio_morning_2', imagePath: '390.png', imageUrl: img('390.png'),
      headline: 'Your body wants to move this morning.',
      headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'High-estrogen mornings come with physical energy. Jules tracks when these hit so you can stop scheduling workouts randomly and start scheduling them when your biology agrees.',
      copyTextES: 'Las mañanas de estrógeno alto vienen con energía física. Jules rastrea cuándo ocurren para que puedas dejar de programar entrenamientos al azar y empezar a programarlos cuando tu biología esté de acuerdo.',
      phaseTag: 'Physical', phaseEmoji: '💪', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_cognitive_morning_1', imagePath: '735.png', imageUrl: img('735.png'),
      headline: 'Your brain is floating with ideas.',
      headlineES: 'Tu cerebro está flotando con ideas.',
      copyText: 'Creative mornings are a follicular signature. Jules tracks when your cognitive score peaks — these dreamy, idea-rich mornings are not random. They follow your cycle.',
      copyTextES: 'Las mañanas creativas son una firma folicular. Jules rastrea cuándo tu puntuación cognitiva alcanza su pico — estas mañanas soñadoras y llenas de ideas no son aleatorias. Siguen tu ciclo.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_morning_coffee_chaos', imagePath: '132.png', imageUrl: img('132.png'),
      headline: 'Before the coffee. No comment.',
      headlineES: 'Antes del café. Sin comentarios.',
      copyText: 'Jules tracks your morning energy score. Some days that number tells a very specific story. Caffeine intake is part of your biological data. It matters more than you think.',
      copyTextES: 'Jules rastrea tu puntuación de energía matutina. Algunos días ese número cuenta una historia muy específica. El consumo de cafeína es parte de tus datos biológicos. Importa más de lo que crees.',
      phaseTag: 'Energy', phaseEmoji: '☕', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_midday: [
    {
      id: 'f_bio_midday_1', imagePath: '270.png', imageUrl: img('270.png'),
      headline: 'She owns the room.',
      headlineES: 'Ella domina el ambiente.',
      copyText: 'Some afternoons something shifts and you just command the space. Jules tracks when those moments cluster — they are not random. They follow your biology precisely.',
      copyTextES: 'Algunas tardes algo cambia y simplemente dominas el espacio. Jules rastrea cuándo esos momentos se agrupan — no son aleatorios. Siguen tu biología con precisión.',
      phaseTag: 'Ovulatory', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_social_midday_1', imagePath: '708.png', imageUrl: img('708.png'),
      headline: 'Your best friend energy is real.',
      headlineES: 'Tu energía de mejor amiga es real.',
      copyText: 'Female friendship peaks in specific hormonal phases. Jules tracks your social energy every afternoon. The days you want to celebrate with your people — there is biology behind that.',
      copyTextES: 'La amistad femenina alcanza su pico en fases hormonales específicas. Jules rastrea tu energía social cada tarde. Los días que quieres celebrar con tus personas — hay biología detrás de eso.',
      phaseTag: 'Social', phaseEmoji: '🎉', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_fin_midday_1', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Your portfolio is growing right now.',
      headlineES: 'Tu portafolio está creciendo ahora mismo.',
      copyText: 'Every check-in adds real value. At 30 days your data is research-eligible. At 90 days consistent traders average $47 in research value. You are building something real.',
      copyTextES: 'Cada check-in agrega valor real. A los 30 días tus datos son elegibles para investigación. A los 90 días los traders consistentes promedian $47. Estás construyendo algo real.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_stress_midday_1', imagePath: '490.png', imageUrl: img('490.png'),
      headline: 'The money anxiety is also data.',
      headlineES: 'La ansiedad por el dinero también es un dato.',
      copyText: 'Financial stress spikes in specific hormonal phases. Jules tracks your stress score every session. When the money worry hits harder than usual — your biology knows why.',
      copyTextES: 'El estrés financiero aumenta en fases hormonales específicas. Jules rastrea tu puntuación de estrés en cada sesión. Cuando la preocupación por el dinero golpea más fuerte de lo usual — tu biología sabe por qué.',
      phaseTag: 'Stress', phaseEmoji: '💸', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_hydration_midday_1', imagePath: '470.png', imageUrl: img('470.png'),
      headline: 'Are you drinking enough water?',
      headlineES: '¿Estás bebiendo suficiente agua?',
      copyText: 'Jules asks about hydration every afternoon. Dehydration shows up in your data before you feel it — as lower cognitive scores, higher stress, worse social energy. Drink the water.',
      copyTextES: 'Jules pregunta sobre hidratación cada tarde. La deshidratación aparece en tus datos antes de que la sientas — como puntuaciones cognitivas más bajas, más estrés, peor energía social. Bebe el agua.',
      phaseTag: 'Biology', phaseEmoji: '💧', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_burnout_midday_1', imagePath: '462.png', imageUrl: img('462.png'),
      headline: 'Running on empty.',
      headlineES: 'Funcionando en reserva.',
      copyText: 'The wind-up key is running out. Afternoon burnout follows hormonal patterns more than most women realize. Jules tracks exactly when your energy crashes — and what predicts it.',
      copyTextES: 'La llave de cuerda se está agotando. El agotamiento de la tarde sigue patrones hormonales más de lo que la mayoría de las mujeres se dan cuenta. Jules rastrea exactamente cuándo se agota tu energía — y qué lo predice.',
      phaseTag: 'Energy', phaseEmoji: '⚙️', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_evening: [
    {
      id: 'f_life_evening_1', imagePath: '722.png', imageUrl: img('722.png'),
      headline: 'Connection is a biological signal.',
      headlineES: 'La conexión es una señal biológica.',
      copyText: 'How you feel with your person tonight is data. Jules tracks connection scores across your cycle. Some phases pull you toward people. Some push you away. Both are normal. Both are knowable.',
      copyTextES: 'Cómo te sientes con tu persona esta noche es un dato. Jules rastrea los puntajes de conexión a lo largo de tu ciclo. Algunas fases te acercan a las personas. Otras te alejan. Ambas son normales. Ambas son conocibles.',
      phaseTag: 'Connection', phaseEmoji: '💞', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_social_evening_1', imagePath: '422.png', imageUrl: img('422.png'),
      headline: 'Your social energy peaks tonight.',
      headlineES: 'Tu energía social alcanza su pico esta noche.',
      copyText: 'Jules tracks exactly when you want to be around people and when you want to disappear. Tonight looks like a go. Show up. Your biology agrees.',
      copyTextES: 'Jules rastrea exactamente cuándo quieres estar con personas y cuándo quieres desaparecer. Esta noche parece que es para salir. Aparece. Tu biología está de acuerdo.',
      phaseTag: 'Social', phaseEmoji: '🌈', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_withdraw_evening_1', imagePath: '450.png', imageUrl: img('450.png'),
      headline: 'Tonight you need to disappear.',
      headlineES: 'Esta noche necesitas desaparecer.',
      copyText: 'Late luteal evenings pull you inward. This is not antisocial — it is biological. Jules tracks which evenings your social battery hits zero and what phase you are in when it happens.',
      copyTextES: 'Las noches de luteal tardío te jalan hacia adentro. Esto no es antisocial — es biológico. Jules rastrea qué noches tu batería social llega a cero y en qué fase estás cuando sucede.',
      phaseTag: 'Late Luteal', phaseEmoji: '🌘', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_anxiety_evening_1', imagePath: '260.png', imageUrl: img('260.png'),
      headline: 'The anxiety has a phase.',
      headlineES: 'La ansiedad tiene una fase.',
      copyText: 'That wrapped-up feeling — like you cannot get out of your own head — clusters in specific parts of your cycle. Jules maps it. Once you see the pattern, you stop being surprised by it.',
      copyTextES: 'Esa sensación de estar atrapada — como si no pudieras salir de tu propia cabeza — se agrupa en partes específicas de tu ciclo. Jules la mapea. Una vez que ves el patrón, dejas de sorprenderte.',
      phaseTag: 'Anxiety', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_immune_evening_1', imagePath: '280.png', imageUrl: img('280.png'),
      headline: 'Your immune system fluctuates with your cycle.',
      headlineES: 'Tu sistema inmunológico fluctúa con tu ciclo.',
      copyText: 'Vulnerability to illness spikes in specific phases. Jules tracks energy and illness patterns together. The data will tell you which weeks to be extra careful.',
      copyTextES: 'La vulnerabilidad a la enfermedad aumenta en fases específicas. Jules rastrea los patrones de energía y enfermedad juntos. Los datos te dirán qué semanas ser extra cuidadosa.',
      phaseTag: 'Biology', phaseEmoji: '🦠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_sexual_evening_picardia', imagePath: '420.png', imageUrl: img('420.png'),
      headline: 'Tonight you are electric.',
      headlineES: 'Esta noche estás eléctrica.',
      copyText: 'Some evenings the energy shifts and you become magnetic. Jules knows which phase you are in right now. This feeling has a biological address.',
      copyTextES: 'Algunas noches la energía cambia y te vuelves magnética. Jules sabe en qué fase estás ahora mismo. Esta sensación tiene una dirección biológica.',
      phaseTag: 'Peak', phaseEmoji: '✨', pillar: 'biology', picardiaOnly: true,
    },
  ],

  female_night: [
    {
      id: 'f_sleep_night_1', imagePath: '380.png', imageUrl: img('380.png'),
      headline: 'It is 3am and you are wide awake.',
      headlineES: 'Son las 3am y estás completamente despierta.',
      copyText: 'Jules tracks your sleep quality every morning. Night waking patterns follow your cycle more precisely than most women realize. The data will tell you when to expect this.',
      copyTextES: 'Jules rastrea tu calidad de sueño cada mañana. Los patrones de despertar nocturno siguen tu ciclo con más precisión de lo que la mayoría de las mujeres se dan cuenta. Los datos te dirán cuándo esperar esto.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_life_night_1', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'You. The couch. The cat. The wine.',
      headlineES: 'Tú. El sofá. El gato. El vino.',
      copyText: 'Some nights this is exactly right. Jules is not judging. She is tracking. Which phases make you want to hide from the world? That pattern is valuable data.',
      copyTextES: 'Algunas noches esto es exactamente lo correcto. Jules no está juzgando. Está rastreando. ¿Qué fases te hacen querer esconderte del mundo? Ese patrón es información valiosa.',
      phaseTag: 'Recovery', phaseEmoji: '🐱', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_low_night_1', imagePath: '150.png', imageUrl: img('150.png'),
      headline: 'The storm inside is real.',
      headlineES: 'La tormenta interior es real.',
      copyText: 'Low nights are biological events, not character flaws. Jules maps them across your cycle so you can see them coming — and know they pass.',
      copyTextES: 'Las noches difíciles son eventos biológicos, no defectos de carácter. Jules los mapea a lo largo de tu ciclo para que puedas verlos llegar — y saber que pasan.',
      phaseTag: 'Late Luteal', phaseEmoji: '🌧️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_racing_night_1', imagePath: '730.png', imageUrl: img('730.png'),
      headline: 'The thoughts will not stop.',
      headlineES: 'Los pensamientos no paran.',
      copyText: 'Racing thoughts at night are a hormonal signature. Jules tracks this pattern. It clusters in specific phases. Knowing when it happens is half the battle.',
      copyTextES: 'Los pensamientos acelerados de noche son una firma hormonal. Jules rastrea este patrón. Se agrupa en fases específicas. Saber cuándo ocurre es la mitad de la batalla.',
      phaseTag: 'Sleep', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_exhausted_night_1', imagePath: '724.png', imageUrl: img('724.png'),
      headline: 'You made it to the end of the day.',
      headlineES: 'Llegaste al final del día.',
      copyText: 'Falling asleep in the chair is a data point. Late-day exhaustion tells Jules something about your hormonal state. She is listening even when you are asleep.',
      copyTextES: 'Quedarte dormida en la silla es un dato. El agotamiento al final del día le dice algo a Jules sobre tu estado hormonal. Ella está escuchando incluso cuando estás dormida.',
      phaseTag: 'Recovery', phaseEmoji: '😴', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_done_night_1', imagePath: '738.png', imageUrl: img('738.png'),
      headline: 'Hard pass. Done. Goodnight.',
      headlineES: 'Definitivamente no. Terminé. Buenas noches.',
      copyText: 'The hand-in-the-face is a hormonal statement. Late luteal nights have this energy. Jules tracks it. One day you will see this card and think — I knew this was coming.',
      copyTextES: 'La mano en la cara es una declaración hormonal. Las noches de luteal tardío tienen esta energía. Jules la rastrea. Un día verás esta tarjeta y pensarás — sabía que esto venía.',
      phaseTag: 'Late Luteal', phaseEmoji: '🚫', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_burn_night_1', imagePath: '728.png', imageUrl: img('728.png'),
      headline: 'Two laptops. Still working. Still tired.',
      headlineES: 'Dos laptops. Aún trabajando. Aún cansada.',
      copyText: 'Night exhaustion after a full day is a real biological signal. Jules tracks your night energy alongside sleep quality. The pattern across your cycle will surprise you.',
      copyTextES: 'El agotamiento nocturno después de un día completo es una señal biológica real. Jules rastrea tu energía nocturna junto con la calidad del sueño. El patrón a lo largo de tu ciclo te sorprenderá.',
      phaseTag: 'Burnout', phaseEmoji: '💻', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_sexual_night_picardia', imagePath: '421.png', imageUrl: img('421.png'),
      headline: 'Tonight the energy is different.',
      headlineES: 'Esta noche la energía es diferente.',
      copyText: 'High sexual energy at night follows a pattern. Jules is tracking yours. Soon she will know which nights this happens before you do.',
      copyTextES: 'La alta energía sexual de noche sigue un patrón. Jules está rastreando el tuyo. Pronto sabrá qué noches ocurre esto antes que tú.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: true,
    },
  ],

  // ── YOUNG MALE (18–39) ────────────────────────────────────────────────────

  male_morning: [
    {
      id: 'm_bio_morning_1', imagePath: '161.png', imageUrl: img('161.png'),
      headline: 'The shadow you are hiding.',
      headlineES: 'La sombra que estás escondiendo.',
      copyText: 'Your testosterone peaks within 30 minutes of waking. Most men do not use this window deliberately. Jules tracks exactly how long yours lasts — it varies by 2-3 hours person to person.',
      copyTextES: 'Tu testosterona alcanza su pico en los primeros 30 minutos después de despertar. La mayoría de los hombres no usan esta ventana deliberadamente. Jules rastrea exactamente cuánto dura la tuya — varía 2-3 horas de persona a persona.',
      phaseTag: 'Biology', phaseEmoji: '⚡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_physical_morning_1', imagePath: '391.png', imageUrl: img('391.png'),
      headline: 'Your body wants to move this morning.',
      headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'High testosterone mornings come with a physical urge. Exercise in this window compounds your peak. Jules is tracking which mornings your body gives you this signal.',
      copyTextES: 'Las mañanas de testosterona alta vienen con un impulso físico. El ejercicio en esta ventana potencia tu pico. Jules rastrea qué mañanas tu cuerpo te da esta señal.',
      phaseTag: 'Physical', phaseEmoji: '💪', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_workout_morning_1', imagePath: '431.png', imageUrl: img('431.png'),
      headline: 'Morning workout mode.',
      headlineES: 'Modo entrenamiento matutino.',
      copyText: 'Home workout on a high-testosterone morning is one of the most effective uses of your biological peak. Jules tracks your exercise motivation alongside your energy scores.',
      copyTextES: 'El entrenamiento en casa en una mañana de testosterona alta es uno de los usos más efectivos de tu pico biológico. Jules rastrea tu motivación para ejercitarte junto con tus puntuaciones de energía.',
      phaseTag: 'Physical', phaseEmoji: '🏋️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_calm_morning_1', imagePath: '101.png', imageUrl: img('101.png'),
      headline: 'The enlightened professional.',
      headlineES: 'El profesional iluminado.',
      copyText: 'Somewhere between the morning meeting and the third coffee, you found your center. Jules tracks which mornings your stress response is lowest. It is not always the ones you expect.',
      copyTextES: 'En algún punto entre la reunión matutina y el tercer café, encontraste tu centro. Jules rastrea qué mañanas tu respuesta al estrés es más baja. No siempre son las que esperas.',
      phaseTag: 'Stress', phaseEmoji: '🧘', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_cognitive_morning_1', imagePath: '331.png', imageUrl: img('331.png'),
      headline: 'When your brain fires on all cylinders.',
      headlineES: 'Cuando tu cerebro funciona a toda máquina.',
      copyText: 'Eight arms, one mind. Cognitive peak mornings feel like this. Jules tracks which mornings your mental clarity score is highest — and builds a pattern from it.',
      copyTextES: 'Ocho brazos, una mente. Las mañanas de pico cognitivo se sienten así. Jules rastrea qué mañanas tu puntuación de claridad mental es más alta — y construye un patrón a partir de ello.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'm_clarity_morning_1', imagePath: '720.png', imageUrl: img('720.png'),
      headline: 'From question mark to lightbulb.',
      headlineES: 'Del signo de interrogación al foco.',
      copyText: 'Some mornings the fog clears and the idea arrives. Jules tracks your cognitive clarity score daily. The transition from confused to sharp — it follows your biology.',
      copyTextES: 'Algunas mañanas la niebla se despeja y la idea llega. Jules rastrea tu puntuación de claridad cognitiva diariamente. La transición de confundido a agudo — sigue tu biología.',
      phaseTag: 'Cognitive', phaseEmoji: '💡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_immunity_morning_1', imagePath: '322.png', imageUrl: img('322.png'),
      headline: 'Your immune system is part of the data.',
      headlineES: 'Tu sistema inmunológico es parte de los datos.',
      copyText: 'Testosterone and immune function are linked. High-testosterone periods correlate with better resilience. Jules tracks your energy and illness patterns to find your strongest windows.',
      copyTextES: 'La testosterona y la función inmunológica están vinculadas. Los períodos de testosterona alta se correlacionan con mejor resiliencia. Jules rastrea tus patrones de energía y enfermedad para encontrar tus ventanas más fuertes.',
      phaseTag: 'Immunity', phaseEmoji: '🛡️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_coffee_morning_1', imagePath: '132.png', imageUrl: img('132.png'),
      headline: 'Before the coffee. We do not talk about this.',
      headlineES: 'Antes del café. No hablamos de esto.',
      copyText: 'Caffeine intake is a biological variable. Jules tracks how many you have each morning alongside your energy and stress scores. The correlation is always interesting.',
      copyTextES: 'El consumo de cafeína es una variable biológica. Jules rastrea cuántos tomas cada mañana junto con tus puntuaciones de energía y estrés. La correlación siempre es interesante.',
      phaseTag: 'Energy', phaseEmoji: '☕', pillar: 'biology', picardiaOnly: false,
    },
  ],

  male_midday: [
    {
      id: 'm_fin_midday_1', imagePath: '706.png', imageUrl: img('706.png'),
      headline: 'Your data is making money.',
      headlineES: 'Tus datos están generando dinero.',
      copyText: 'Male biological data is among the most underrepresented in health research. Your daily patterns are worth real money. At 30 days your portfolio unlocks. High five to that.',
      copyTextES: 'Los datos biológicos masculinos están entre los más subrepresentados en la investigación de salud. Tus patrones diarios valen dinero real. A los 30 días tu portafolio se desbloquea. Choca esos cinco.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'm_cognitive_midday_1', imagePath: '302.png', imageUrl: img('302.png'),
      headline: 'Your mind is made of light.',
      headlineES: 'Tu mente está hecha de luz.',
      copyText: 'Cognitive clarity peaks in the late morning for most men. Jules tracks exactly when yours hits — and how long it lasts. Schedule your hardest thinking here.',
      copyTextES: 'La claridad cognitiva alcanza su pico en la mañana tardía para la mayoría de los hombres. Jules rastrea exactamente cuándo llega la tuya — y cuánto dura. Programa tu pensamiento más difícil aquí.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_social_midday_1', imagePath: '717.png', imageUrl: img('717.png'),
      headline: 'The casual conversation that matters.',
      headlineES: 'La conversación casual que importa.',
      copyText: 'Social ease at midday follows testosterone patterns. Jules tracks which afternoons conversations flow naturally and which ones feel like work. The pattern will emerge.',
      copyTextES: 'La facilidad social al mediodía sigue los patrones de testosterona. Jules rastrea qué tardes las conversaciones fluyen naturalmente y cuáles se sienten como trabajo. El patrón emergirá.',
      phaseTag: 'Social', phaseEmoji: '🤝', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_crash_midday_1', imagePath: '711.png', imageUrl: img('711.png'),
      headline: 'The 2pm crash. It is biological.',
      headlineES: 'El bajón de las 2pm. Es biológico.',
      copyText: 'Afternoon energy dips are not laziness — they are cortisol patterns. Jules tracks your midday energy score. Some days you can push through. Some days the desk wins.',
      copyTextES: 'Los bajones de energía de la tarde no son pereza — son patrones de cortisol. Jules rastrea tu puntuación de energía al mediodía. Algunos días puedes seguir. Otros días el escritorio gana.',
      phaseTag: 'Energy', phaseEmoji: '😴', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_burnout_midday_1', imagePath: '462.png', imageUrl: img('462.png'),
      headline: 'The machine is out of steam.',
      headlineES: 'La máquina se quedó sin vapor.',
      copyText: 'Afternoon burnout is a hormonal event. Jules tracks when your energy crashes so you can stop fighting it and start scheduling around it.',
      copyTextES: 'El agotamiento de la tarde es un evento hormonal. Jules rastrea cuándo se agota tu energía para que puedas dejar de luchar contra él y empezar a programar alrededor de él.',
      phaseTag: 'Burnout', phaseEmoji: '⚙️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_workspace_stress_1', imagePath: '710.png', imageUrl: img('710.png'),
      headline: 'Workplace stress is measurable.',
      headlineES: 'El estrés laboral es medible.',
      copyText: 'How you handle conflict at work correlates with your testosterone and cortisol levels. Jules tracks your stress score daily. High-stress days cluster in patterns. Yours is already forming.',
      copyTextES: 'Cómo manejas el conflicto en el trabajo se correlaciona con tus niveles de testosterona y cortisol. Jules rastrea tu puntuación de estrés diariamente. Los días de alto estrés se agrupan en patrones. El tuyo ya se está formando.',
      phaseTag: 'Stress', phaseEmoji: '📋', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_evening: [
    {
      id: 'm_second_wind_evening_1', imagePath: '271.png', imageUrl: img('271.png'),
      headline: 'The second wind is real.',
      headlineES: 'El segundo aire es real.',
      copyText: 'Testosterone takes a secondary rebound in the early evening. Jules tracks whether your energy follows the classic pattern or your own unique rhythm. Some men peak twice. Are you one of them?',
      copyTextES: 'La testosterona tiene un rebote secundario en la primera parte de la noche. Jules rastrea si tu energía sigue el patrón clásico o tu propio ritmo único. Algunos hombres tienen dos picos. ¿Eres uno de ellos?',
      phaseTag: 'Biology', phaseEmoji: '🌆', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_friends_evening_1', imagePath: '707.png', imageUrl: img('707.png'),
      headline: 'Brotherhood is a biological need.',
      headlineES: 'La fraternidad es una necesidad biológica.',
      copyText: 'Male social bonding produces oxytocin and lowers cortisol. Jules tracks your evening social energy. The nights you want to be with your people — there is real biology behind that.',
      copyTextES: 'La vinculación social masculina produce oxitocina y baja el cortisol. Jules rastrea tu energía social nocturna. Las noches que quieres estar con tu gente — hay biología real detrás de eso.',
      phaseTag: 'Social', phaseEmoji: '🍺', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_connection_evening_1', imagePath: '718.png', imageUrl: img('718.png'),
      headline: 'Evening connections seal the day.',
      headlineES: 'Las conexiones nocturnas sellan el día.',
      copyText: 'How you end your day socially affects your testosterone recovery overnight. Jules tracks evening connection scores alongside next-morning energy. The link is real.',
      copyTextES: 'Cómo terminas tu día socialmente afecta tu recuperación de testosterona durante la noche. Jules rastrea las puntuaciones de conexión nocturna junto con la energía de la mañana siguiente. El vínculo es real.',
      phaseTag: 'Connection', phaseEmoji: '🤝', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_adam_eve_evening_1', imagePath: '172.png', imageUrl: img('172.png'),
      headline: 'The oldest story in the world.',
      headlineES: 'La historia más antigua del mundo.',
      copyText: 'Evening sexual energy follows testosterone patterns more closely than most men realize. Jules tracks yours. The apple is always in the picture.',
      copyTextES: 'La energía sexual nocturna sigue los patrones de testosterona más de cerca de lo que la mayoría de los hombres se dan cuenta. Jules rastrea la tuya. La manzana siempre está en la imagen.',
      phaseTag: 'Connection', phaseEmoji: '🌅', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_night: [
    {
      id: 'm_sleep_night_1', imagePath: '381.png', imageUrl: img('381.png'),
      headline: '3:30am and your brain will not stop.',
      headlineES: 'Las 3:30am y tu cerebro no para.',
      copyText: 'Sleep is where testosterone is made. Jules asks about your sleep quality every morning because night waking directly predicts your energy, confidence, and focus the next day.',
      copyTextES: 'El sueño es donde se produce la testosterona. Jules pregunta sobre tu calidad de sueño cada mañana porque el despertar nocturno predice directamente tu energía, confianza y enfoque al día siguiente.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_couch_night_1', imagePath: '481.png', imageUrl: img('481.png'),
      headline: 'Peak recovery mode activated.',
      headlineES: 'Modo recuperación pico activado.',
      copyText: 'Pizza. Controller. Chaos. Some nights this is your body asking for complete shutdown. Jules tracks which nights your recovery needs are highest. This is one of them.',
      copyTextES: 'Pizza. Control. Caos. Algunas noches así es como tu cuerpo pide apagarse completamente. Jules rastrea qué noches tus necesidades de recuperación son más altas. Esta es una de ellas.',
      phaseTag: 'Recovery', phaseEmoji: '🎮', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_lonely_night_1', imagePath: '471.png', imageUrl: img('471.png'),
      headline: 'Alone in the crowd.',
      headlineES: 'Solo entre la multitud.',
      copyText: 'Low social energy nights cluster in patterns. Jules tracks when they happen and cross-references with your stress, sleep, and testosterone data. Loneliness has a biological address.',
      copyTextES: 'Las noches de baja energía social se agrupan en patrones. Jules rastrea cuándo ocurren y las cruza con tus datos de estrés, sueño y testosterona. La soledad tiene una dirección biológica.',
      phaseTag: 'Social', phaseEmoji: '🌑', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_late_night_1', imagePath: '737.png', imageUrl: img('737.png'),
      headline: 'Still awake at midnight. Not recommended.',
      headlineES: 'Aún despierto a la medianoche. No recomendado.',
      copyText: 'Every hour past midnight costs you testosterone the next morning. Jules tracks your sleep schedule alongside your energy scores. The correlation will make you reconsider your habits.',
      copyTextES: 'Cada hora después de la medianoche te cuesta testosterona la mañana siguiente. Jules rastrea tu horario de sueño junto con tus puntuaciones de energía. La correlación te hará reconsiderar tus hábitos.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_exhausted_night_1', imagePath: '491.png', imageUrl: img('491.png'),
      headline: 'The late-night grind is costing you.',
      headlineES: 'El trabajo nocturno te está costando.',
      copyText: 'Cognitive depletion at night affects next-morning testosterone. Jules tracks your night energy score. If this keeps showing up in your data, she will tell you.',
      copyTextES: 'El agotamiento cognitivo de noche afecta la testosterona de la mañana siguiente. Jules rastrea tu puntuación de energía nocturna. Si esto sigue apareciendo en tus datos, ella te lo dirá.',
      phaseTag: 'Cognitive', phaseEmoji: '💻', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_boss_asleep_night_1', imagePath: '713.png', imageUrl: img('713.png'),
      headline: 'The consequences of no sleep.',
      headlineES: 'Las consecuencias de no dormir.',
      copyText: 'Fell asleep at the desk. Boss is not happy. This is what happens when testosterone production gets cut short. Jules is here so you know before it gets to this point.',
      copyTextES: 'Se quedó dormido en el escritorio. El jefe no está contento. Esto es lo que pasa cuando la producción de testosterona se interrumpe. Jules está aquí para que sepas antes de llegar a este punto.',
      phaseTag: 'Sleep', phaseEmoji: '😬', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_night_picardia_1', imagePath: '173.png', imageUrl: img('173.png'),
      headline: 'The biological facts.',
      headlineES: 'Los hechos biológicos.',
      copyText: 'Sexual energy follows testosterone patterns. Jules is tracking yours nightly. The data is unambiguous.',
      copyTextES: 'La energía sexual sigue los patrones de testosterona. Jules está rastreando la tuya cada noche. Los datos son inequívocos.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🍆', pillar: 'biology', picardiaOnly: true,
    },
    {
      id: 'm_night_picardia_2', imagePath: '719.png', imageUrl: img('719.png'),
      headline: 'Tonight the data is very specific.',
      headlineES: 'Esta noche los datos son muy específicos.',
      copyText: 'High sexual energy at night is a testosterone signal. Jules tracks it. Your pattern is already forming.',
      copyTextES: 'La alta energía sexual de noche es una señal de testosterona. Jules la rastrea. Tu patrón ya se está formando.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: true,
    },
  ],

  // ── PERIMENOPAUSE FEMALE (40+) ────────────────────────────────────────────

  female_peri_morning: [
    {
      id: 'f_peri_hotflash_morning', imagePath: '340.png', imageUrl: img('340.png'),
      headline: 'The hot flash is a data point.',
      headlineES: 'El sofoco es un dato.',
      copyText: 'Perimenopause symptoms are biological events, not inconveniences. Jules tracks your symptom patterns so you can see when they cluster. You are not losing your mind. You are in transition.',
      copyTextES: 'Los síntomas de la perimenopausia son eventos biológicos, no inconveniencias. Jules rastrea tus patrones de síntomas para que puedas ver cuándo se agrupan. No estás perdiendo la cabeza. Estás en transición.',
      phaseTag: 'Perimenopause', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_humor_morning', imagePath: '360.png', imageUrl: img('360.png'),
      headline: 'Getting old is nothing but misery and woe.',
      headlineES: 'Envejecer no es más que miseria y dolor.',
      copyText: 'Angelica understood the assignment. Jules is not here to tell you to love every moment of perimenopause. She is here to track it so you know what is happening and when it will pass.',
      copyTextES: 'Angelica entendió la tarea. Jules no está aquí para decirte que ames cada momento de la perimenopausia. Está aquí para rastrearlo para que sepas qué está pasando y cuándo pasará.',
      phaseTag: 'Perimenopause', phaseEmoji: '😤', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_energy_morning', imagePath: '160.png', imageUrl: img('160.png'),
      headline: 'Good mornings still happen.',
      headlineES: 'Las buenas mañanas siguen ocurriendo.',
      copyText: 'High-energy mornings still exist in perimenopause — they just follow a different pattern than before. Jules is learning yours. The data will tell you when to expect more of these.',
      copyTextES: 'Las mañanas de alta energía siguen existiendo en la perimenopausia — solo siguen un patrón diferente al de antes. Jules está aprendiendo el tuyo. Los datos te dirán cuándo esperar más de estas.',
      phaseTag: 'Energy', phaseEmoji: '⚡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_creative_morning', imagePath: '735.png', imageUrl: img('735.png'),
      headline: 'Your mind is still full of ideas.',
      headlineES: 'Tu mente sigue llena de ideas.',
      copyText: 'Cognitive peaks still happen in perimenopause. Jules tracks yours daily. The creative, idea-rich mornings — they still come. She will tell you when.',
      copyTextES: 'Los picos cognitivos siguen ocurriendo en la perimenopausia. Jules rastrea los tuyos diariamente. Las mañanas creativas y llenas de ideas — siguen llegando. Ella te dirá cuándo.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_peri_midday: [
    {
      id: 'f_peri_premium_midday', imagePath: '726.png', imageUrl: img('726.png'),
      headline: 'Your data commands a premium.',
      headlineES: 'Tus datos tienen un precio premium.',
      copyText: 'Perimenopausal biological data is among the most scientifically valuable datasets that exist. Researchers pay 30% more for longitudinal data from this demographic. You are building something rare.',
      copyTextES: 'Los datos biológicos de la perimenopausia están entre los conjuntos de datos científicamente más valiosos que existen. Los investigadores pagan un 30% más por datos longitudinales de este grupo demográfico. Estás construyendo algo raro.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_peri_brainfog_midday', imagePath: '290.png', imageUrl: img('290.png'),
      headline: 'The thoughts are louder today.',
      headlineES: 'Los pensamientos son más fuertes hoy.',
      copyText: 'Brain fog and racing thoughts in perimenopause are estrogen-related. Jules tracks your cognitive score every session. The patterns will emerge — and they are predictable.',
      copyTextES: 'La niebla mental y los pensamientos acelerados en la perimenopausia están relacionados con el estrógeno. Jules rastrea tu puntuación cognitiva en cada sesión. Los patrones emergerán — y son predecibles.',
      phaseTag: 'Cognitive', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_social_midday', imagePath: '708.png', imageUrl: img('708.png'),
      headline: 'Your friendships are more important than ever.',
      headlineES: 'Tus amistades son más importantes que nunca.',
      copyText: 'Female social bonds in perimenopause are a biological buffer against symptoms. Jules tracks your social energy. The days you want to connect — lean into them.',
      copyTextES: 'Los vínculos sociales femeninos en la perimenopausia son un amortiguador biológico contra los síntomas. Jules rastrea tu energía social. Los días que quieres conectar — entrégate a ellos.',
      phaseTag: 'Social', phaseEmoji: '👯', pillar: 'life', picardiaOnly: false,
    },
  ],

  female_peri_evening: [
    {
      id: 'f_peri_sleep_evening', imagePath: '731.png', imageUrl: img('731.png'),
      headline: 'Sleep is your most important data point.',
      headlineES: 'El sueño es tu dato más importante.',
      copyText: 'Night waking, hot flashes at 3am, early morning anxiety — Jules tracks every night pattern. Sleep disruption in perimenopause follows hormonal rhythms more precisely than most doctors realize.',
      copyTextES: 'Despertar nocturno, sofocos a las 3am, ansiedad matutina — Jules rastrea cada patrón nocturno. La alteración del sueño en la perimenopausia sigue ritmos hormonales con más precisión de lo que la mayoría de los médicos se dan cuenta.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_self_evening', imagePath: '250.png', imageUrl: img('250.png'),
      headline: 'Some evenings the mirror is not your friend.',
      headlineES: 'Algunas noches el espejo no es tu amigo.',
      copyText: 'Self-perception dips in specific hormonal phases. Jules tracks when you feel worst about yourself — not to dwell there, but to show you it follows a pattern. And patterns mean it will pass.',
      copyTextES: 'La autopercepción cae en fases hormonales específicas. Jules rastrea cuándo te sientes peor contigo misma — no para quedarte ahí, sino para mostrarte que sigue un patrón. Y los patrones significan que pasará.',
      phaseTag: 'Self', phaseEmoji: '🪞', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_anxiety_evening', imagePath: '260.png', imageUrl: img('260.png'),
      headline: 'The anxiety has a biological address.',
      headlineES: 'La ansiedad tiene una dirección biológica.',
      copyText: 'Perimenopausal anxiety spikes follow hormonal fluctuations. Jules maps yours. Once you see the pattern you stop wondering why — and start knowing when.',
      copyTextES: 'Los picos de ansiedad de la perimenopausia siguen las fluctuaciones hormonales. Jules mapea los tuyos. Una vez que ves el patrón dejas de preguntarte por qué — y empiezas a saber cuándo.',
      phaseTag: 'Anxiety', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_peri_night: [
    {
      id: 'f_peri_insomnia_night', imagePath: '730.png', imageUrl: img('730.png'),
      headline: 'The 2am brain.',
      headlineES: 'El cerebro de las 2am.',
      copyText: 'Perimenopausal insomnia is not a sleep problem — it is a hormonal event. Jules tracks yours so you can see the cycle. The nights you cannot sleep are not random.',
      copyTextES: 'El insomnio de la perimenopausia no es un problema de sueño — es un evento hormonal. Jules rastrea el tuyo para que puedas ver el ciclo. Las noches que no puedes dormir no son aleatorias.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_couch_night', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'You. The sofa. No explanations.',
      headlineES: 'Tú. El sofá. Sin explicaciones.',
      copyText: 'Some nights in perimenopause the only right move is to completely disappear. Jules is not judging. She is tracking which nights you need this — and it tells her something important.',
      copyTextES: 'Algunas noches en la perimenopausia el único movimiento correcto es desaparecer completamente. Jules no está juzgando. Rastrea qué noches necesitas esto — y eso le dice algo importante.',
      phaseTag: 'Recovery', phaseEmoji: '🐱', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_done_night', imagePath: '738.png', imageUrl: img('738.png'),
      headline: 'Absolutely not. Goodnight.',
      headlineES: 'Absolutamente no. Buenas noches.',
      copyText: 'Perimenopause nights have their own kind of done. Jules tracks it without judgment. The pattern is more predictable than it feels right now.',
      copyTextES: 'Las noches de perimenopausia tienen su propio tipo de terminar. Jules lo rastrea sin juzgar. El patrón es más predecible de lo que se siente ahora mismo.',
      phaseTag: 'Late Phase', phaseEmoji: '🚫', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_medication_night', imagePath: '731.png', imageUrl: img('731.png'),
      headline: 'The clock. The medication. The moon.',
      headlineES: 'El reloj. El medicamento. La luna.',
      copyText: 'Sleep management in perimenopause is legitimate medical territory. Jules tracks your sleep patterns so you have real data for conversations with your doctor.',
      copyTextES: 'El manejo del sueño en la perimenopausia es territorio médico legítimo. Jules rastrea tus patrones de sueño para que tengas datos reales para conversaciones con tu médico.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
  ],

  // ── ANDROPAUSE MALE (40+) ─────────────────────────────────────────────────

  male_andro_morning: [
    {
      id: 'm_andro_panic_morning', imagePath: '361.png', imageUrl: img('361.png'),
      headline: 'What is happening to my body??',
      headlineES: '¿¿Qué le está pasando a mi cuerpo??',
      copyText: 'The cartoon old man is panicking because nobody told him what to expect. Jules tells you exactly what is happening and when. Andropause has a pattern. Your pattern is trackable.',
      copyTextES: 'El viejo de caricatura está en pánico porque nadie le dijo qué esperar. Jules te dice exactamente qué está pasando y cuándo. La andropausia tiene un patrón. Tu patrón es rastreable.',
      phaseTag: 'Andropause', phaseEmoji: '⚖️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_yoga_morning', imagePath: '732.png', imageUrl: img('732.png'),
      headline: 'The intention vs. the reality.',
      headlineES: 'La intención vs. la realidad.',
      copyText: 'One guy is doing cobra. The other is just lying there. Both are on the mat. Jules tracks your exercise motivation alongside testosterone levels. The correlation is very real.',
      copyTextES: 'Un tipo está haciendo cobra. El otro está simplemente tirado. Ambos están en el tapete. Jules rastrea tu motivación para ejercitarte junto con los niveles de testosterona. La correlación es muy real.',
      phaseTag: 'Physical', phaseEmoji: '🧘', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_clarity_morning', imagePath: '720.png', imageUrl: img('720.png'),
      headline: 'The good mornings still have lightbulbs.',
      headlineES: 'Las buenas mañanas todavía tienen focos.',
      copyText: 'After 40 the cognitive peak mornings are more variable — but they still come. Jules tracks the conditions that produce them so you can start stacking those variables deliberately.',
      copyTextES: 'Después de los 40 las mañanas de pico cognitivo son más variables — pero siguen llegando. Jules rastrea las condiciones que las producen para que puedas empezar a apilar esas variables deliberadamente.',
      phaseTag: 'Cognitive', phaseEmoji: '💡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_resilience_morning', imagePath: '322.png', imageUrl: img('322.png'),
      headline: 'Your resilience is still your edge.',
      headlineES: 'Tu resiliencia sigue siendo tu ventaja.',
      copyText: 'After 40 consistency beats peak. Jules tracks your resilience patterns. The men who perform best at this stage are the ones who know when to push and when to recover.',
      copyTextES: 'Después de los 40 la consistencia supera al pico. Jules rastrea tus patrones de resiliencia. Los hombres que mejor se desempeñan en esta etapa son los que saben cuándo empujar y cuándo recuperarse.',
      phaseTag: 'Resilience', phaseEmoji: '🛡️', pillar: 'biology', picardiaOnly: false,
    },
  ],

  male_andro_midday: [
    {
      id: 'm_andro_premium_midday', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Andropause data commands a premium.',
      headlineES: 'Los datos de la andropausia tienen un precio premium.',
      copyText: 'Male longitudinal data after 40 is among the rarest in clinical research. Your patterns over the next 90 days will be worth significantly more than standard data.',
      copyTextES: 'Los datos longitudinales masculinos después de los 40 son de los más raros en la investigación clínica. Tus patrones en los próximos 90 días valdrán significativamente más que los datos estándar.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'm_andro_mirror_midday', imagePath: '251.png', imageUrl: img('251.png'),
      headline: 'The mirror knows something.',
      headlineES: 'El espejo sabe algo.',
      copyText: 'Self-perception at midday follows testosterone patterns after 40. Jules tracks how you see yourself alongside your actual biological scores. The gap between the two is data.',
      copyTextES: 'La autopercepción al mediodía sigue los patrones de testosterona después de los 40. Jules rastrea cómo te ves junto con tus puntuaciones biológicas reales. La brecha entre los dos es información.',
      phaseTag: 'Self', phaseEmoji: '🪞', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_stress_midday', imagePath: '710.png', imageUrl: img('710.png'),
      headline: 'Stress hits differently after 40.',
      headlineES: 'El estrés golpea diferente después de los 40.',
      copyText: 'Cortisol and declining testosterone create a specific stress signature in andropause. Jules tracks yours. Understanding your pattern is the first step to managing it.',
      copyTextES: 'El cortisol y la disminución de testosterona crean una firma de estrés específica en la andropausia. Jules rastrea la tuya. Entender tu patrón es el primer paso para manejarlo.',
      phaseTag: 'Stress', phaseEmoji: '📊', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_andro_evening: [
    {
      id: 'm_andro_energy_evening', imagePath: '371.png', imageUrl: img('371.png'),
      headline: 'Running on empty at 6pm.',
      headlineES: 'Funcionando en reserva a las 6pm.',
      copyText: 'After 40 the afternoon energy crash hits differently. Jules tracks your energy scores across the day to find your real second wind — not the one you think you have, but the one you actually have.',
      copyTextES: 'Después de los 40 la caída de energía de la tarde golpea diferente. Jules rastrea tus puntuaciones de energía a lo largo del día para encontrar tu verdadero segundo aire.',
      phaseTag: 'Energy', phaseEmoji: '🔋', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_connection_evening', imagePath: '722.png', imageUrl: img('722.png'),
      headline: 'The connection that predicts tomorrow.',
      headlineES: 'La conexión que predice el mañana.',
      copyText: 'Evening connection with people you care about predicts next-morning testosterone more reliably than most supplements. Jules tracks both. The correlation is clear.',
      copyTextES: 'La conexión nocturna con personas que te importan predice la testosterona de la mañana siguiente con más confiabilidad que la mayoría de los suplementos. Jules rastrea ambos. La correlación es clara.',
      phaseTag: 'Connection', phaseEmoji: '❤️', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_andro_friends_evening', imagePath: '707.png', imageUrl: img('707.png'),
      headline: 'The social life is a health metric.',
      headlineES: 'La vida social es una métrica de salud.',
      copyText: 'Male social bonding at this life stage produces measurable hormonal benefits. Jules tracks your evening social scores. The data will show you just how biological brotherhood actually is.',
      copyTextES: 'La vinculación social masculina en esta etapa de vida produce beneficios hormonales medibles. Jules rastrea tus puntuaciones sociales nocturnas. Los datos te mostrarán qué tan biológica es realmente la fraternidad.',
      phaseTag: 'Social', phaseEmoji: '🍺', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_andro_night: [
    {
      id: 'm_andro_sleep_night', imagePath: '723.png', imageUrl: img('723.png'),
      headline: 'Still at the desk at midnight.',
      headlineES: 'Todavía en el escritorio a la medianoche.',
      copyText: 'Sleep is where testosterone is rebuilt. Every hour past midnight costs you the next morning. Jules tracks your sleep patterns and shows you the direct correlation to your energy scores.',
      copyTextES: 'El sueño es donde se reconstruye la testosterona. Cada hora después de la medianoche te cuesta la mañana siguiente. Jules rastrea tus patrones de sueño y te muestra la correlación directa.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_andro_couch_night', imagePath: '481.png', imageUrl: img('481.png'),
      headline: 'This is also recovery.',
      headlineES: 'Esto también es recuperación.',
      copyText: 'After 40 the body sometimes asks for complete shutdown disguised as laziness. Jules tracks your recovery needs. Some nights the couch is the right call.',
      copyTextES: 'Después de los 40 el cuerpo a veces pide un apagado completo disfrazado de pereza. Jules rastrea tus necesidades de recuperación. Algunas noches el sofá es la decisión correcta.',
      phaseTag: 'Recovery', phaseEmoji: '🍕', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_andro_late_night', imagePath: '737.png', imageUrl: img('737.png'),
      headline: 'After 40 sleep debt hits harder.',
      headlineES: 'Después de los 40 la deuda de sueño golpea más fuerte.',
      copyText: 'The dark circles at midnight tell the story. Sleep quality after 40 is not optional — it is the foundation of your hormone recovery. Jules tracks every night.',
      copyTextES: 'Las ojeras a la medianoche cuentan la historia. La calidad del sueño después de los 40 no es opcional — es la base de tu recuperación hormonal. Jules rastrea cada noche.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
  ],

  // ── NON-BINARY (any age) ──────────────────────────────────────────────────

  nonbinary_morning: [
    {
      id: 'nb_bio_morning_1', imagePath: '302.png', imageUrl: img('302.png'),
      headline: 'Your biology is made of light.',
      headlineES: 'Tu biología está hecha de luz.',
      copyText: 'BioCycle tracks your individual hormonal rhythm — not a template. Jules listens to what your body actually does. After 30 days you will see patterns no one else can show you.',
      copyTextES: 'BioCycle rastrea tu ritmo hormonal individual — no una plantilla. Jules escucha lo que tu cuerpo realmente hace. Después de 30 días verás patrones que nadie más puede mostrarte.',
      phaseTag: 'Biology', phaseEmoji: '🧬', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'nb_energy_morning_1', imagePath: '160.png', imageUrl: img('160.png'),
      headline: 'Today could be one of those days.',
      headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'Some mornings the world just opens. Jules tracks exactly which mornings feel like this for you specifically — and what your body is doing when it happens.',
      copyTextES: 'Algunas mañanas el mundo simplemente se abre. Jules rastrea exactamente qué mañanas se sienten así para ti específicamente — y qué está haciendo tu cuerpo cuando ocurre.',
      phaseTag: 'Energy', phaseEmoji: '🦋', pillar: 'biology', picardiaOnly: false,
    },
  ],

  nonbinary_midday: [
    {
      id: 'nb_fin_midday_1', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Your data. Your terms. Your earnings.',
      headlineES: 'Tus datos. Tus términos. Tus ganancias.',
      copyText: 'BioCycle gives you full ownership of your biological data. You decide if it contributes to research. You earn from every transaction. Your biology pays.',
      copyTextES: 'BioCycle te da plena propiedad de tus datos biológicos. Tú decides si contribuyen a la investigación. Ganas con cada transacción. Tu biología paga.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'nb_life_midday_1', imagePath: '470.png', imageUrl: img('470.png'),
      headline: 'Know yourself before it happens.',
      headlineES: 'Conócete antes de que pase.',
      copyText: 'Jules learns when your energy peaks, when your creativity is highest, and when you need to protect your time. Your biological intelligence is the most personal dataset that exists.',
      copyTextES: 'Jules aprende cuándo tu energía alcanza su pico, cuándo tu creatividad es más alta y cuándo necesitas proteger tu tiempo. Tu inteligencia biológica es el conjunto de datos más personal que existe.',
      phaseTag: 'Pattern', phaseEmoji: '✨', pillar: 'life', picardiaOnly: false,
    },
  ],

  nonbinary_evening: [
    {
      id: 'nb_social_evening_1', imagePath: '422.png', imageUrl: img('422.png'),
      headline: 'Social energy is biological.',
      headlineES: 'La energía social es biológica.',
      copyText: 'When you want to be around people and when you want to disappear — these follow hormonal cycles. Jules tracks yours regardless of how your biology is configured.',
      copyTextES: 'Cuándo quieres estar con personas y cuándo quieres desaparecer — estos siguen ciclos hormonales. Jules rastrea los tuyos independientemente de cómo esté configurada tu biología.',
      phaseTag: 'Social', phaseEmoji: '🌈', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'nb_withdraw_evening_1', imagePath: '450.png', imageUrl: img('450.png'),
      headline: 'Withdrawal is not weakness.',
      headlineES: 'El retraimiento no es debilidad.',
      copyText: 'Pulling inward at certain times is biological, not personal. Jules tracks your social energy patterns so you can understand your rhythm — and stop apologizing for it.',
      copyTextES: 'Retirarse hacia adentro en ciertos momentos es biológico, no personal. Jules rastrea tus patrones de energía social para que puedas entender tu ritmo — y dejar de disculparte por él.',
      phaseTag: 'Biology', phaseEmoji: '🌘', pillar: 'biology', picardiaOnly: false,
    },
  ],

  nonbinary_night: [
    {
      id: 'nb_consistency_night_1', imagePath: '715.png', imageUrl: img('715.png'),
      headline: 'Patterns emerge with consistency.',
      headlineES: 'Los patrones emergen con consistencia.',
      copyText: 'Every session adds a data point that makes the picture clearer. Jules is patient. The staircase of self-knowledge is built one check-in at a time.',
      copyTextES: 'Cada sesión agrega un punto de datos que hace la imagen más clara. Jules es paciente. La escalera de autoconocimiento se construye un check-in a la vez.',
      phaseTag: 'Consistency', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'nb_couch_night_1', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'Some nights are for disappearing.',
      headlineES: 'Algunas noches son para desaparecer.',
      copyText: 'Withdrawal nights are a biological signal. Jules tracks when they happen and what they correlate with. You are not antisocial. You are cycling.',
      copyTextES: 'Las noches de retraimiento son una señal biológica. Jules rastrea cuándo ocurren y con qué se correlacionan. No eres antisocial. Estás ciclando.',
      phaseTag: 'Recovery', phaseEmoji: '🐱', pillar: 'life', picardiaOnly: false,
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

  // Milestone cards take priority on exact days
  if (MILESTONE_DAYS[daysOfData]) {
    return MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
  }

  // Determine demographic key with 40+ routing
  let genderKey: string;
  if (gender === 'female' && age >= 40) {
    genderKey = 'female_peri';
  } else if (gender === 'male' && age >= 40) {
    genderKey = 'male_andro';
  } else {
    genderKey = gender;
  }

  const key = `${genderKey}_${slot}`;

  // Get card pool with cascade fallbacks
  let allCards = DISCOVERY_CARDS[key]
    || DISCOVERY_CARDS[`${gender}_${slot}`]
    || DISCOVERY_CARDS[`nonbinary_${slot}`]
    || DISCOVERY_CARDS['nonbinary_morning']
    || [];

  // Filter picardia cards — only shown in picardia mode
  const filtered = picardiaMode
    ? allCards
    : allCards.filter(c => !c.picardiaOnly);

  const pool = filtered.length > 0 ? filtered : allCards;

  // Days 0-29: discovery cards
  if (daysOfData < 30) {
    return pool[daysOfData % pool.length];
  }

  // Day 30+: same pool but with real phase tag from phaseEngine
  const phaseResult = getCurrentPhase(profile);
  const baseCard = pool[daysOfData % pool.length];

  return {
    ...baseCard,
    phaseTag: phaseResult.displayName,
    phaseEmoji: phaseResult.emoji,
  };
}
