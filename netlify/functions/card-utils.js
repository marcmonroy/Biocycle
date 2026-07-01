// card-utils.js
// Server-side port of src/lib/cardSystem.ts → getCardForUser()
// Must stay in sync with the client version — same date index, same pools,
// same milestone priority, same picardia filter.

'use strict';

const IMG_BASE = 'https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library';
function img(f) { return `${IMG_BASE}/${f}`; }

function getDaysOfData(profile) { return profile.days_of_data ?? 0; }

function getAge(dob) {
  if (!dob) return 0;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatValue(days) { return String(days); }

function getCurrentTimeSlot() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'night';
}

const MILESTONE_DAYS = {
  7: (val) => ({
    id: 'milestone_7', imageUrl: img('212.png'),
    headline:   'One week of data.',
    headlineES: 'Una semana de datos.',
    copyText:   `Your portfolio is at ${val}. Jules is starting to see patterns. The staircase is being built. Keep showing up.`,
    copyTextES: `Tu portafolio está en ${val}. Jules empieza a ver patrones. La escalera se está construyendo. Sigue apareciendo.`,
  }),
  14: (val) => ({
    id: 'milestone_14', imageUrl: img('706.png'),
    headline:   'High five. Your data is paying.',
    headlineES: 'Choca esos cinco. Tus datos están pagando.',
    copyText:   `Two weeks in. Portfolio at ${val}. You are in the research pool. The coins are stacking. Keep the streak alive.`,
    copyTextES: `Dos semanas adentro. Portafolio en ${val}. Estás en el banco de investigación. Las monedas se acumulan. Mantén la racha viva.`,
  }),
  21: (_val) => ({
    id: 'milestone_21', imageUrl: img('715.png'),
    headline:   'Nine days to go.',
    headlineES: 'Nueve días para llegar.',
    copyText:   'Every day adds another level. In 9 days Jules tells you something true about yourself built from 21 days of your real data. The staircase is almost complete.',
    copyTextES: 'Cada día agrega otro nivel. En 9 días Jules te dice algo verdadero sobre ti construido con 21 días de tus datos reales. La escalera está casi completa.',
  }),
  29: (_val) => ({
    id: 'milestone_29', imageUrl: img('720.png'),
    headline:   'Tomorrow the lightbulb turns on.',
    headlineES: 'Mañana se enciende el foco.',
    copyText:   'Tomorrow is Day 30. Jules delivers your first personal biological observation. The question mark becomes a lightbulb. Do not miss your session tomorrow.',
    copyTextES: 'Mañana es el Día 30. Jules entrega tu primera observación biológica personal. El signo de interrogación se convierte en foco. No te pierdas tu sesión mañana.',
  }),
  30: (_val) => ({
    id: 'milestone_30', imageUrl: img('160.png'),
    headline:   'Jules finally has enough of you to surprise you.',
    headlineES: 'Jules por fin te conoce lo suficiente para sorprenderte.',
    copyText:   '30 days in. Your pattern is visible now. Your first real forecast is ready. Open the app and see what Jules found.',
    copyTextES: '30 días adentro. Tu patrón es visible ahora. Tu primer pronóstico real está listo. Abre la app y ve lo que Jules encontró.',
  }),
  60: (_val) => ({
    id: 'milestone_60', imageUrl: img('430.png'),
    headline:   '60 days. Jules knows your patterns better than you think.',
    headlineES: '60 días. Jules conoce tus patrones mejor de lo que crees.',
    copyText:   'Two months of data. Your forecast is sharper. Your baseline is yours — not a textbook average. Open the app and see what changed.',
    copyTextES: 'Dos meses de datos. Tu pronóstico es más preciso. Tu línea base es tuya — no un promedio de libro de texto. Abre la app y ve qué cambió.',
  }),
  90: (_val) => ({
    id: 'milestone_90', imageUrl: img('735.png'),
    headline:   '90 days. Your body has no more secrets from you.',
    headlineES: '90 días. Tu cuerpo ya no tiene secretos para ti.',
    copyText:   'Day 90. Jules speaks from your actual trends now, not textbook averages. Your pattern history is the center of the experience. Open the app.',
    copyTextES: 'Día 90. Jules ahora habla desde tus tendencias reales, no promedios generales. Tu historial de patrones es el centro de la experiencia. Abre la app.',
  }),
};

const DISCOVERY_CARDS = {
  female_morning: [
    { id: 'f_bio_morning_1', imageUrl: img('160.png'), picardiaOnly: false,
      headline: 'Today could be one of those days.', headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'Some mornings you wake up and the world just opens. Butterflies, elevation, possibility. Jules is tracking exactly which mornings feel like this — and why.',
      copyTextES: 'Algunas mañanas despiertas y el mundo simplemente se abre. Mariposas, elevación, posibilidad. Jules rastrea exactamente qué mañanas se sienten así — y por qué.' },
    { id: 'f_life_morning_1', imageUrl: img('430.png'), picardiaOnly: false,
      headline: 'You are already in balance.', headlineES: 'Ya estás en equilibrio.',
      copyText: 'Some mornings your body just knows. Jules tracks your morning energy score every day. When it lines up with your phase — and it will — you will see it coming.',
      copyTextES: 'Algunas mañanas tu cuerpo simplemente sabe. Jules rastrea tu puntuación de energía matutina cada día. Cuando se alinea con tu fase — y lo hará — lo verás venir.' },
    { id: 'f_life_morning_2', imageUrl: img('330.png'), picardiaOnly: false,
      headline: 'The original multitasker.', headlineES: 'La multitasker original.',
      copyText: 'Baby in one hand. Cocktail in the other. Laptop under the arm. Jules is not here to judge — she is here to tell you which days you can actually pull this off.',
      copyTextES: 'Bebé en una mano. Cóctel en la otra. Laptop bajo el brazo. Jules no está aquí para juzgar — está aquí para decirte qué días realmente puedes lograrlo.' },
    { id: 'f_bio_morning_2', imageUrl: img('390.png'), picardiaOnly: false,
      headline: 'Your body wants to move this morning.', headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'High-estrogen mornings come with physical energy. Jules tracks when these hit so you can stop scheduling workouts randomly and start scheduling them when your biology agrees.',
      copyTextES: 'Las mañanas de estrógeno alto vienen con energía física. Jules rastrea cuándo ocurren para que puedas dejar de programar entrenamientos al azar y empezar a programarlos cuando tu biología esté de acuerdo.' },
    { id: 'f_cognitive_morning_1', imageUrl: img('735.png'), picardiaOnly: false,
      headline: 'Your brain is floating with ideas.', headlineES: 'Tu cerebro está flotando con ideas.',
      copyText: 'Creative mornings are a follicular signature. Jules tracks when your cognitive score peaks — these dreamy, idea-rich mornings are not random. They follow your cycle.',
      copyTextES: 'Las mañanas creativas son una firma folicular. Jules rastrea cuándo tu puntuación cognitiva alcanza su pico — estas mañanas soñadoras y llenas de ideas no son aleatorias. Siguen tu ciclo.' },
    { id: 'f_morning_coffee_chaos', imageUrl: img('132.png'), picardiaOnly: false,
      headline: 'Before the coffee. No comment.', headlineES: 'Antes del café. Sin comentarios.',
      copyText: 'Jules tracks your morning energy score. Some days that number tells a very specific story. Caffeine intake is part of your biological data. It matters more than you think.',
      copyTextES: 'Jules rastrea tu puntuación de energía matutina. Algunos días ese número cuenta una historia muy específica. El consumo de cafeína es parte de tus datos biológicos. Importa más de lo que crees.' },
  ],
  female_afternoon: [
    { id: 'f_bio_midday_1', imageUrl: img('270.png'), picardiaOnly: false,
      headline: 'She owns the room.', headlineES: 'Ella domina el ambiente.',
      copyText: 'Some afternoons something shifts and you just command the space. Jules tracks when those moments cluster — they are not random. They follow your biology precisely.',
      copyTextES: 'Algunas tardes algo cambia y simplemente dominas el espacio. Jules rastrea cuándo esos momentos se agrupan — no son aleatorios. Siguen tu biología con precisión.' },
    { id: 'f_social_midday_1', imageUrl: img('708.png'), picardiaOnly: false,
      headline: 'Your best friend energy is real.', headlineES: 'Tu energía de mejor amiga es real.',
      copyText: 'Female friendship peaks in specific hormonal phases. Jules tracks your social energy every afternoon. The days you want to celebrate with your people — there is biology behind that.',
      copyTextES: 'La amistad femenina alcanza su pico en fases hormonales específicas. Jules rastrea tu energía social cada tarde. Los días que quieres celebrar con tus personas — hay biología detrás de eso.' },
    { id: 'f_hydration_midday_1', imageUrl: img('470.png'), picardiaOnly: false,
      headline: 'Are you drinking enough water?', headlineES: '¿Estás bebiendo suficiente agua?',
      copyText: 'Jules asks about hydration every afternoon. Dehydration shows up in your data before you feel it — as lower cognitive scores, higher stress, worse social energy. Drink the water.',
      copyTextES: 'Jules pregunta sobre hidratación cada tarde. La deshidratación aparece en tus datos antes de que la sientas — como puntuaciones cognitivas más bajas, más estrés, peor energía social. Bebe el agua.' },
    { id: 'f_burnout_midday_1', imageUrl: img('462.png'), picardiaOnly: false,
      headline: 'Running on empty.', headlineES: 'Funcionando en reserva.',
      copyText: 'The wind-up key is running out. Afternoon burnout follows hormonal patterns more than most women realize. Jules tracks exactly when your energy crashes — and what predicts it.',
      copyTextES: 'La llave de cuerda se está agotando. El agotamiento de la tarde sigue patrones hormonales más de lo que la mayoría de las mujeres se dan cuenta. Jules rastrea exactamente cuándo se agota tu energía — y qué lo predice.' },
  ],
  female_night: [
    { id: 'f_life_evening_1', imageUrl: img('722.png'), picardiaOnly: false,
      headline: 'Connection is a biological signal.', headlineES: 'La conexión es una señal biológica.',
      copyText: 'How you feel with your person tonight is data. Jules tracks connection scores across your cycle. Some phases pull you toward people. Some push you away. Both are normal. Both are knowable.',
      copyTextES: 'Cómo te sientes con tu persona esta noche es un dato. Jules rastrea los puntajes de conexión a lo largo de tu ciclo. Algunas fases te acercan a las personas. Otras te alejan. Ambas son normales. Ambas son conocibles.' },
    { id: 'f_withdraw_evening_1', imageUrl: img('450.png'), picardiaOnly: false,
      headline: 'Tonight you need to disappear.', headlineES: 'Esta noche necesitas desaparecer.',
      copyText: 'Late luteal evenings pull you inward. This is not antisocial — it is biological. Jules tracks which evenings your social battery hits zero and what phase you are in when it happens.',
      copyTextES: 'Las noches de luteal tardío te jalan hacia adentro. Esto no es antisocial — es biológico. Jules rastrea qué noches tu batería social llega a cero y en qué fase estás cuando sucede.' },
    { id: 'f_anxiety_evening_1', imageUrl: img('260.png'), picardiaOnly: false,
      headline: 'The anxiety has a phase.', headlineES: 'La ansiedad tiene una fase.',
      copyText: 'That wrapped-up feeling — like you cannot get out of your own head — clusters in specific parts of your cycle. Jules maps it. Once you see the pattern, you stop being surprised by it.',
      copyTextES: 'Esa sensación de estar atrapada — como si no pudieras salir de tu propia cabeza — se agrupa en partes específicas de tu ciclo. Jules la mapea. Una vez que ves el patrón, dejas de sorprenderte.' },
    { id: 'f_sexual_evening_picardia', imageUrl: img('420.png'), picardiaOnly: true,
      headline: 'Tonight you are electric.', headlineES: 'Esta noche estás eléctrica.',
      copyText: 'Some evenings the energy shifts and you become magnetic. Jules knows which phase you are in right now. This feeling has a biological address.',
      copyTextES: 'Algunas noches la energía cambia y te vuelves magnética. Jules sabe en qué fase estás ahora mismo. Esta sensación tiene una dirección biológica.' },
    { id: 'f_low_night_1', imageUrl: img('150.png'), picardiaOnly: false,
      headline: 'The storm inside is real.', headlineES: 'La tormenta interior es real.',
      copyText: 'Low nights are biological events, not character flaws. Jules maps them across your cycle so you can see them coming — and know they pass.',
      copyTextES: 'Las noches difíciles son eventos biológicos, no defectos de carácter. Jules los mapea a lo largo de tu ciclo para que puedas verlos llegar — y saber que pasan.' },
    { id: 'f_done_night_1', imageUrl: img('738.png'), picardiaOnly: false,
      headline: 'Hard pass. Done. Goodnight.', headlineES: 'Definitivamente no. Terminé. Buenas noches.',
      copyText: 'The hand-in-the-face is a hormonal statement. Late luteal nights have this energy. Jules tracks it. One day you will see this card and think — I knew this was coming.',
      copyTextES: 'La mano en la cara es una declaración hormonal. Las noches de luteal tardío tienen esta energía. Jules la rastrea. Un día verás esta tarjeta y pensarás — sabía que esto venía.' },
  ],
  male_morning: [
    { id: 'm_bio_morning_1', imageUrl: img('161.png'), picardiaOnly: false,
      headline: 'The testosterone window is open.', headlineES: 'La ventana de testosterona está abierta.',
      copyText: 'Your testosterone peaks within 30 minutes of waking. Most men do not use this window deliberately. Jules tracks exactly how long yours lasts — it varies by 2-3 hours person to person.',
      copyTextES: 'Tu testosterona alcanza su pico en los primeros 30 minutos después de despertar. La mayoría de los hombres no usan esta ventana deliberadamente. Jules rastrea exactamente cuánto dura la tuya — varía 2-3 horas de persona a persona.' },
    { id: 'm_physical_morning_1', imageUrl: img('391.png'), picardiaOnly: false,
      headline: 'Your body wants to move this morning.', headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'High testosterone mornings come with a physical urge. Exercise in this window compounds your peak. Jules is tracking which mornings your body gives you this signal.',
      copyTextES: 'Las mañanas de testosterona alta vienen con un impulso físico. El ejercicio en esta ventana potencia tu pico. Jules rastrea qué mañanas tu cuerpo te da esta señal.' },
    { id: 'm_coffee_morning_1', imageUrl: img('132.png'), picardiaOnly: false,
      headline: 'Before the coffee. No comment.', headlineES: 'Antes del café. Sin comentarios.',
      copyText: 'Jules tracks your morning energy score. Some days that number tells a very specific story. Caffeine intake is part of your biological data. It matters more than you think.',
      copyTextES: 'Jules rastrea tu puntuación de energía matutina. Algunos días ese número cuenta una historia muy específica. El consumo de cafeína es parte de tus datos biológicos. Importa más de lo que crees.' },
  ],
  male_afternoon: [
    { id: 'm_social_midday_1', imageUrl: img('708.png'), picardiaOnly: false,
      headline: 'Your social energy right now is data.', headlineES: 'Tu energía social ahora mismo es un dato.',
      copyText: 'Male social energy follows testosterone rhythms across the day. Jules tracks yours every afternoon. The pattern will show you when connection is effortless — and when to conserve.',
      copyTextES: 'La energía social masculina sigue los ritmos de testosterona durante el día. Jules rastrea la tuya cada tarde. El patrón te mostrará cuándo la conexión es sin esfuerzo — y cuándo conservarla.' },
    { id: 'm_stress_midday_1', imageUrl: img('490.png'), picardiaOnly: false,
      headline: 'The afternoon slump is biological.', headlineES: 'El bajón de la tarde es biológico.',
      copyText: 'Cortisol drops in the early afternoon for most men. Jules tracks your stress and energy together. The pattern will tell you whether to push through or protect this window.',
      copyTextES: 'El cortisol baja en la tarde temprana para la mayoría de los hombres. Jules rastrea tu estrés y energía juntos. El patrón te dirá si empujar o proteger esta ventana.' },
  ],
  male_night: [
    { id: 'm_recovery_night_1', imageUrl: img('724.png'), picardiaOnly: false,
      headline: 'Recovery is a performance variable.', headlineES: 'La recuperación es una variable de rendimiento.',
      copyText: "Sleep quality tonight directly shapes tomorrow's testosterone baseline. Jules tracks your night recovery scores. The data will show you which habits protect the window.",
      copyTextES: 'La calidad del sueño esta noche moldea directamente la línea base de testosterona de mañana. Jules rastrea tus puntuaciones de recuperación nocturna. Los datos te mostrarán qué hábitos protegen la ventana.' },
    { id: 'm_wind_down_night_1', imageUrl: img('480.png'), picardiaOnly: false,
      headline: 'The day is done.', headlineES: 'El día terminó.',
      copyText: "Night cortisol levels tell Jules something about how your day actually went. The number you give tonight shapes tomorrow's forecast. Be honest with her.",
      copyTextES: 'Los niveles de cortisol nocturno le dicen algo a Jules sobre cómo fue realmente tu día. El número que des esta noche moldea el pronóstico de mañana. Sé honesto con ella.' },
  ],
  nonbinary_morning: [
    { id: 'nb_morning_1', imageUrl: img('160.png'), picardiaOnly: false,
      headline: 'Today could be one of those days.', headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'Some mornings you wake up and the world just opens. Butterflies, elevation, possibility. Jules is tracking exactly which mornings feel like this — and why.',
      copyTextES: 'Algunas mañanas despiertas y el mundo simplemente se abre. Mariposas, elevación, posibilidad. Jules rastrea exactamente qué mañanas se sienten así — y por qué.' },
  ],
  nonbinary_afternoon: [
    { id: 'nb_afternoon_1', imageUrl: img('270.png'), picardiaOnly: false,
      headline: 'Something shifted this afternoon.', headlineES: 'Algo cambió esta tarde.',
      copyText: 'Some afternoons something shifts and you just command the space. Jules tracks when those moments cluster — they are not random. They follow your biology precisely.',
      copyTextES: 'Algunas tardes algo cambia y simplemente dominas el espacio. Jules rastrea cuándo esos momentos se agrupan — no son aleatorios. Siguen tu biología con precisión.' },
  ],
  nonbinary_night: [
    { id: 'nb_night_1', imageUrl: img('150.png'), picardiaOnly: false,
      headline: 'The storm inside is real.', headlineES: 'La tormenta interior es real.',
      copyText: 'Low nights are biological events, not character flaws. Jules maps them across your pattern so you can see them coming — and know they pass.',
      copyTextES: 'Las noches difíciles son eventos biológicos, no defectos de carácter. Jules los mapea a lo largo de tu patrón para que puedas verlos llegar — y saber que pasan.' },
  ],
};

// Peri/andro fall back to base pools
DISCOVERY_CARDS.female_peri_morning   = DISCOVERY_CARDS.female_morning;
DISCOVERY_CARDS.female_peri_afternoon = DISCOVERY_CARDS.female_afternoon;
DISCOVERY_CARDS.female_peri_night     = DISCOVERY_CARDS.female_night;
DISCOVERY_CARDS.male_andro_morning    = DISCOVERY_CARDS.male_morning;
DISCOVERY_CARDS.male_andro_afternoon  = DISCOVERY_CARDS.male_afternoon;
DISCOVERY_CARDS.male_andro_night      = DISCOVERY_CARDS.male_night;

function getCardForUser(profile, lang) {
  const daysOfData   = getDaysOfData(profile);
  const slot         = getCurrentTimeSlot();
  const gender       = profile.genero ?? 'nonbinary';
  const picardiaMode = profile.picardia_mode ?? false;
  const age          = profile.fecha_nacimiento ? getAge(profile.fecha_nacimiento) : 0;
  const isES         = (lang ?? profile.idioma ?? 'EN') === 'ES';

  const today     = new Date();
  const dateIndex = today.getFullYear() * 1000 +
    Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

  if (MILESTONE_DAYS[daysOfData] && slot === 'morning') {
    const card = MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
    return {
      cardId:   card.id,
      headline: isES ? card.headlineES : card.headline,
      copyText: isES ? card.copyTextES : card.copyText,
      imageUrl: card.imageUrl,
    };
  }

  let genderKey;
  if      (gender === 'female' && age >= 40) genderKey = 'female_peri';
  else if (gender === 'male'   && age >= 40) genderKey = 'male_andro';
  else                                        genderKey = gender;

  const key      = `${genderKey}_${slot}`;
  let allCards   = DISCOVERY_CARDS[key]
    || DISCOVERY_CARDS[`${gender}_${slot}`]
    || DISCOVERY_CARDS[`nonbinary_${slot}`]
    || DISCOVERY_CARDS['nonbinary_morning']
    || [];

  const filtered = picardiaMode ? allCards : allCards.filter(c => !c.picardiaOnly);
  const pool     = filtered.length > 0 ? filtered : allCards;
  const card     = pool[dateIndex % pool.length];

  return {
    cardId:   card.id,
    headline: isES ? card.headlineES : card.headline,
    copyText: isES ? card.copyTextES : card.copyText,
    imageUrl: card.imageUrl,
  };
}

function getBannerPreview(copyText) {
  const match = copyText.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : copyText.slice(0, 80);
}

module.exports = { getCardForUser, getBannerPreview };
