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
  headlinePicardia?: string;
  headlinePicardiaES?: string;
  copyTextPicardia?: string;
  copyTextPicardiaES?: string;
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
    headline: 'One week. Jules is taking notes.',
    headlineES: 'Una semana. Jules está tomando notas.',
    copyText: `Seven days in and your portfolio is at ${val}. Jules has started a file on you. It's getting interesting.`,
    copyTextES: `Siete días y tu portafolio va en ${val}. Jules ya te abrió expediente. Se está poniendo interesante.`,
    phaseTag: 'Week 1', phaseEmoji: '📊', pillar: 'financial', picardiaOnly: false,
  }),
  14: (val) => ({
    id: 'milestone_14', imagePath: '706.png', imageUrl: img('706.png'),
    headline: 'High five. Your data is paying.',
    headlineES: 'Choca esos cinco. Tus datos están pagando.',
    copyText: `Two weeks without missing. Portfolio at ${val}. Somewhere out there, science is jealous of your consistency.`,
    copyTextES: `Dos semanas sin fallar. Portafolio en ${val}. La ciencia ya quisiera tu consistencia.`,
    phaseTag: 'Week 2', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
  }),
  21: (_val) => ({
    id: 'milestone_21', imagePath: '715.png', imageUrl: img('715.png'),
    headline: 'Nine days to go.',
    headlineES: 'Nueve días para llegar.',
    copyText: '21 days together. Jules already has opinions about you. In 9 days she starts sharing them. Prepare to be seen.',
    copyTextES: '21 días juntos. Jules ya tiene opiniones sobre ti. En 9 días empieza a compartirlas. Prepárate para ser vista.',
    phaseTag: 'Day 21', phaseEmoji: '🎯', pillar: 'financial', picardiaOnly: false,
  }),
  29: (_val) => ({
    id: 'milestone_29', imagePath: '720.png', imageUrl: img('720.png'),
    headline: 'Tomorrow the lightbulb turns on.',
    headlineES: 'Mañana se enciende el foco.',
    copyText: 'Day 30 is tomorrow. Jules finally gets to say what she\'s been thinking for a month. Don\'t leave her talking to herself.',
    copyTextES: 'Mañana es el Día 30. Jules por fin dirá lo que lleva un mes pensando. No la dejes hablando sola.',
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
      copyText: 'Butterflies, big ideas, unearned optimism. Ride it. Days like this don\'t ask permission — and they don\'t leave a forwarding address.',
      copyTextES: 'Mariposas, ideas grandes, optimismo sin motivo. Súbete. Estos días no piden permiso — y no dejan dirección.',
      phaseTag: 'Biology', phaseEmoji: '🦋', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_life_morning_1', imagePath: '430.png', imageUrl: img('430.png'),
      headline: 'Your body woke up knowing.',
      headlineES: 'Tu cuerpo amaneció sabiendo.',
      copyText: 'No alarm drama, no negotiating with the snooze button. Whatever you did yesterday — your body approves. Take the win.',
      copyTextES: 'Sin drama de alarma, sin negociar con el botón de posponer. Lo que hiciste ayer — tu cuerpo lo aprueba. Anótate el punto.',
      phaseTag: 'Life', phaseEmoji: '✨', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_life_morning_2', imagePath: '330.png', imageUrl: img('330.png'),
      headline: 'The original multitasker.',
      headlineES: 'La multitasker original.',
      copyText: 'Baby in one hand, cocktail in the other, laptop somewhere. Today? Today you actually pull it off. Tomorrow — no promises. Enjoy the superpower while it lasts.',
      copyTextES: 'Bebé en una mano, cóctel en la otra, laptop por ahí. ¿Hoy? Hoy sí te sale. Mañana — sin promesas. Disfruta el superpoder mientras dure.',
      phaseTag: 'Life', phaseEmoji: '🌀', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_bio_morning_2', imagePath: '390.png', imageUrl: img('390.png'),
      headline: 'Your body wants to move this morning.',
      headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'Your body woke up ready to run a marathon. Your calendar says "meetings." One of them is wrong, and it\'s not your body.',
      copyTextES: 'Tu cuerpo amaneció listo para correr un maratón. Tu agenda dice "reuniones." Una de las dos está equivocada, y no es tu cuerpo.',
      phaseTag: 'Physical', phaseEmoji: '💪', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_cognitive_morning_1', imagePath: '735.png', imageUrl: img('735.png'),
      headline: 'Your brain is floating with ideas.',
      headlineES: 'Tu cerebro está flotando con ideas.',
      copyText: 'Ideas before breakfast, three projects invented in the shower. Write them down — next week\'s you will deny this ever happened.',
      copyTextES: 'Ideas antes del desayuno, tres proyectos inventados en la ducha. Anótalas — la tú de la próxima semana jurará que esto nunca pasó.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_morning_coffee_chaos', imagePath: '132.png', imageUrl: img('132.png'),
      headline: 'Before the coffee. No comment.',
      headlineES: 'Antes del café. Sin comentarios.',
      copyText: 'We both know who you are before that first cup. Nobody has to say it. The mug knows. Jules knows. Your family definitely knows.',
      copyTextES: 'Tú y yo sabemos quién eres antes de esa primera taza. Nadie tiene que decirlo. La taza lo sabe. Jules lo sabe. Tu familia ni se diga.',
      phaseTag: 'Energy', phaseEmoji: '☕', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_midday: [
    {
      id: 'f_bio_midday_1', imagePath: '270.png', imageUrl: img('270.png'),
      headline: 'She owns the room.',
      headlineES: 'Ella domina el ambiente.',
      copyText: 'Walk in like you own the place today. Technically you do. Warning: this level of charisma is temporary — spend it on something that deserves you.',
      copyTextES: 'Entra hoy como si el lugar fuera tuyo. Técnicamente lo es. Aviso: este nivel de carisma es temporal — gástalo en algo que te merezca.',
      phaseTag: 'Ovulatory', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_social_midday_1', imagePath: '708.png', imageUrl: img('708.png'),
      headline: 'Your best friend energy is real.',
      headlineES: 'Tu energía de mejor amiga es real.',
      copyText: 'Today you\'re the friend who organizes the plan, sends the voice notes, remembers the birthdays. Your people won the lottery today.',
      copyTextES: 'Hoy eres la amiga que organiza el plan, manda los audios y se acuerda de los cumpleaños. A tu gente le tocó la lotería hoy.',
      phaseTag: 'Social', phaseEmoji: '🎉', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_fin_midday_1', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Your portfolio is growing right now.',
      headlineES: 'Tu portafolio está creciendo ahora mismo.',
      copyText: 'You showed up, you checked in, the number went up. Getting paid to know yourself — still the best deal on your phone.',
      copyTextES: 'Apareciste, hiciste tu check-in, el número subió. Que te paguen por conocerte — sigue siendo el mejor negocio en tu teléfono.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_stress_midday_1', imagePath: '490.png', imageUrl: img('490.png'),
      headline: 'The money worry hit early today.',
      headlineES: 'Hoy la preocupación por el dinero llegó temprano.',
      copyText: 'Some days the budget math feels personal. It\'s not the numbers — the numbers didn\'t change overnight. You did, slightly. It passes.',
      copyTextES: 'Hay días en que las cuentas se sienten personales. No son los números — los números no cambiaron de anoche a hoy. Fuiste tú, un poquito. Y pasa.',
      phaseTag: 'Stress', phaseEmoji: '💸', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_hydration_midday_1', imagePath: '470.png', imageUrl: img('470.png'),
      headline: 'Are you drinking enough water?',
      headlineES: '¿Estás tomando suficiente agua?',
      copyText: 'That headache has a name, and it\'s "four coffees and zero water." Go. The bottle is right there.',
      copyTextES: 'Ese dolor de cabeza tiene nombre: "cuatro cafés y cero agua." Ve. La botella está ahí mismo.',
      phaseTag: 'Biology', phaseEmoji: '💧', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_burnout_midday_1', imagePath: '462.png', imageUrl: img('462.png'),
      headline: 'Running on empty.',
      headlineES: 'Andas en reserva.',
      copyText: 'The wind-up key ran out around 2pm and you\'re still going on fumes and stubbornness. Respect. But maybe don\'t schedule anything important after 4.',
      copyTextES: 'La cuerda se acabó a las 2pm y sigues corriendo de puro orgullo. Respeto. Pero quizás no agendes nada importante después de las 4.',
      phaseTag: 'Energy', phaseEmoji: '⚙️', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_evening: [
    {
      id: 'f_life_evening_1', imagePath: '722.png', imageUrl: img('722.png'),
      headline: 'Tonight, your person looks better than usual.',
      headlineES: 'Hoy tu persona se ve mejor que de costumbre.',
      copyText: 'Not because they changed. Because you did. Enjoy the chemistry while it\'s doing the work for you.',
      copyTextES: 'No porque haya cambiado. Cambiaste tú. Disfruta la química mientras hace el trabajo por ti.',
      phaseTag: 'Connection', phaseEmoji: '💞', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_social_evening_1', imagePath: '422.png', imageUrl: img('422.png'),
      headline: 'Your social energy peaks tonight.',
      headlineES: 'Tu energía social llega a su pico esta noche.',
      copyText: 'Say yes to the plan. Tonight you\'re the good company everyone thinks they are. This window doesn\'t stay open all week.',
      copyTextES: 'Dile que sí al plan. Esta noche eres la buena compañía que todos creen ser. Esta ventana no queda abierta toda la semana.',
      phaseTag: 'Social', phaseEmoji: '🌈', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_withdraw_evening_1', imagePath: '450.png', imageUrl: img('450.png'),
      headline: 'Tonight you need to disappear.',
      headlineES: 'Esta noche necesitas desaparecer.',
      copyText: 'Phone on silent, door closed, world cancelled. This isn\'t antisocial — it\'s maintenance. The people who matter will still be there tomorrow.',
      copyTextES: 'Teléfono en silencio, puerta cerrada, mundo cancelado. No es antisocial — es mantenimiento. La gente que importa seguirá ahí mañana.',
      phaseTag: 'Late Luteal', phaseEmoji: '🌘', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_anxiety_evening_1', imagePath: '260.png', imageUrl: img('260.png'),
      headline: 'The anxiety has a phase.',
      headlineES: 'La ansiedad tiene fase.',
      copyText: 'That can\'t-get-out-of-your-own-head feeling isn\'t a personality flaw — it visits on a schedule. Which means it also leaves on one.',
      copyTextES: 'Esa sensación de no poder salir de tu propia cabeza no es un defecto — visita con calendario. Lo cual significa que también se va con calendario.',
      phaseTag: 'Anxiety', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_immune_evening_1', imagePath: '280.png', imageUrl: img('280.png'),
      headline: 'Your body is asking for the early night.',
      headlineES: 'Tu cuerpo está pidiendo la noche temprana.',
      copyText: 'Some weeks your defenses run lower. Tonight, the blanket is not a luxury — it\'s strategy. Take the early night; win the whole week.',
      copyTextES: 'Hay semanas en que las defensas andan bajas. Esta noche la cobija no es lujo — es estrategia. Acuéstate temprano y gana la semana entera.',
      phaseTag: 'Biology', phaseEmoji: '🦠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_sexual_evening_picardia', imagePath: '420.png', imageUrl: img('420.png'),
      headline: 'Tonight you are electric.',
      headlineES: 'Esta noche estás eléctrica.',
      copyText: 'Whatever it is, tonight you\'ve got it. The room notices. What you do with it is entirely your business.',
      copyTextES: 'Lo que sea que es, esta noche lo tienes. Se nota. Lo que hagas con eso es completamente asunto tuyo.',
      phaseTag: 'Peak', phaseEmoji: '✨', pillar: 'biology', picardiaOnly: true,
    },
  ],

  female_night: [
    {
      id: 'f_sleep_night_1', imagePath: '380.png', imageUrl: img('380.png'),
      headline: 'It is 3am and you are wide awake.',
      headlineES: 'Son las 3am y estás despierta.',
      copyText: 'The ceiling has no answers — we\'ve checked. This kind of night comes in a pattern, and knowing that is half the trick to closing your eyes.',
      copyTextES: 'El techo no tiene respuestas — ya lo revisamos. Estas noches vienen con patrón, y saberlo es la mitad del truco para cerrar los ojos.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_life_night_1', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'You. The couch. The cat. The wine.',
      headlineES: 'Tú. El sofá. El gato. El vino.',
      copyText: 'The perfect committee. No agenda, no minutes, no guests. Some nights this is exactly the meeting you needed.',
      copyTextES: 'El comité perfecto. Sin agenda, sin acta, sin invitados. Hay noches en que esta es exactamente la reunión que necesitabas.',
      phaseTag: 'Recovery', phaseEmoji: '🐱', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_low_night_1', imagePath: '150.png', imageUrl: img('150.png'),
      headline: 'The storm inside is real.',
      headlineES: 'La tormenta por dentro es real.',
      copyText: 'Tonight is heavy, and pretending otherwise helps no one. But storms are weather, not climate. This one passes — they always have.',
      copyTextES: 'Esta noche pesa, y fingir lo contrario no ayuda a nadie. Pero las tormentas son clima pasajero, no permanente. Esta pasa — siempre han pasado.',
      phaseTag: 'Late Luteal', phaseEmoji: '🌧️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_racing_night_1', imagePath: '730.png', imageUrl: img('730.png'),
      headline: 'The thoughts will not stop.',
      headlineES: 'Los pensamientos no paran.',
      copyText: 'Your brain chose 11pm to replay every conversation since 2019. It\'s not a verdict, it\'s a phase — literally. Write down the one thought that matters; release the rest.',
      copyTextES: 'Tu cerebro eligió las 11pm para repasar cada conversación desde 2019. No es un veredicto, es una fase — literal. Anota el único pensamiento que importa; suelta el resto.',
      phaseTag: 'Sleep', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_exhausted_night_1', imagePath: '724.png', imageUrl: img('724.png'),
      headline: 'You made it to the end of the day.',
      headlineES: 'Llegaste al final del día.',
      copyText: 'Asleep in the chair, remote still in hand. That\'s not laziness — that\'s a finished day. Go to actual bed; you\'ve earned the good pillow.',
      copyTextES: 'Dormida en la silla, con el control todavía en la mano. Eso no es pereza — es un día terminado. Vete a la cama de verdad; te ganaste la almohada buena.',
      phaseTag: 'Recovery', phaseEmoji: '😴', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_done_night_1', imagePath: '738.png', imageUrl: img('738.png'),
      headline: 'Hard pass. Done. Goodnight.',
      headlineES: 'No. Cerrado. Buenas noches.',
      copyText: 'The hand is up. The answer is no. Tomorrow-you can review appeals — tonight the court is closed.',
      copyTextES: 'La mano está arriba. La respuesta es no. La tú de mañana revisa apelaciones — hoy el tribunal está cerrado.',
      phaseTag: 'Late Luteal', phaseEmoji: '🚫', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_burn_night_1', imagePath: '728.png', imageUrl: img('728.png'),
      headline: 'Two laptops. Still working. Still tired.',
      headlineES: 'Dos laptops. Todavía trabajando. Todavía cansada.',
      copyText: 'Two screens, one human, zero battery. Whatever it is, it will still be broken tomorrow — and you\'ll fix it faster after sleeping.',
      copyTextES: 'Dos pantallas, una humana, cero batería. Lo que sea, seguirá roto mañana — y lo arreglas más rápido después de dormir.',
      phaseTag: 'Burnout', phaseEmoji: '💻', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_sexual_night_picardia', imagePath: '421.png', imageUrl: img('421.png'),
      headline: 'Tonight the energy is different.',
      headlineES: 'Esta noche la energía es diferente.',
      copyText: 'You noticed it around sunset. So did everyone else. Tonight doesn\'t need a plan — it needs a decision.',
      copyTextES: 'Lo notaste al atardecer. Los demás también. Esta noche no necesita plan — necesita una decisión.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: true,
    },
  ],

  // ── YOUNG MALE (18–39) ────────────────────────────────────────────────────

  male_morning: [
    {
      id: 'm_bio_morning_1', imagePath: '161.png', imageUrl: img('161.png'),
      headline: 'First 30 minutes: superpowers included.',
      headlineES: 'Primeros 30 minutos: con superpoderes incluidos.',
      copyText: 'Your testosterone peaks right after waking. Most men spend that window scrolling. You\'re not most men — are you?',
      copyTextES: 'Tu testosterona llega al pico justo al despertar. La mayoría gasta esa ventana en el teléfono. Tú no eres la mayoría — ¿o sí?',
      phaseTag: 'Biology', phaseEmoji: '⚡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_physical_morning_1', imagePath: '391.png', imageUrl: img('391.png'),
      headline: 'Your body wants to move this morning.',
      headlineES: 'Tu cuerpo quiere moverse esta mañana.',
      copyText: 'That restlessness isn\'t stress — it\'s fuel with nowhere to go. Give it ten minutes of anything physical and collect the dividend all day.',
      copyTextES: 'Esa inquietud no es estrés — es combustible sin destino. Dale diez minutos de cualquier cosa física y cobra el dividendo todo el día.',
      phaseTag: 'Physical', phaseEmoji: '💪', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_workout_morning_1', imagePath: '431.png', imageUrl: img('431.png'),
      headline: 'Morning workout mode.',
      headlineES: 'Modo entrenamiento matutino.',
      copyText: 'Today the gym doesn\'t need to convince you — you woke up already negotiated. Rare day. Don\'t waste it debating with your socks.',
      copyTextES: 'Hoy el gym no tiene que convencerte — amaneciste ya convencido. Día raro. No lo gastes debatiendo con las medias.',
      phaseTag: 'Physical', phaseEmoji: '🏋️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_calm_morning_1', imagePath: '101.png', imageUrl: img('101.png'),
      headline: 'The enlightened professional.',
      headlineES: 'El profesional iluminado.',
      copyText: 'Somewhere between the emails and the second coffee, you found inner peace. Nobody knows how. Don\'t touch anything.',
      copyTextES: 'En algún punto entre los correos y el segundo café, encontraste la paz interior. Nadie sabe cómo. No toques nada.',
      phaseTag: 'Stress', phaseEmoji: '🧘', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_cognitive_morning_1', imagePath: '331.png', imageUrl: img('331.png'),
      headline: 'When your brain fires on all cylinders.',
      headlineES: 'Cuando tu cerebro prende todos los cilindros.',
      copyText: 'Eight ideas, one brain, zero traffic. Mornings like this are for the hard problem you\'ve been avoiding — not for inbox zero.',
      copyTextES: 'Ocho ideas, un cerebro, cero tráfico. Mañanas así son para el problema difícil que has estado evitando — no para limpiar el correo.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'm_clarity_morning_1', imagePath: '741.png', imageUrl: img('741.png'),
      headline: 'From question mark to lightbulb.',
      headlineES: 'De signo de interrogación a foco.',
      copyText: 'The fog lifted and the idea was just standing there, waiting. Grab it before the first meeting talks you out of it.',
      copyTextES: 'Se levantó la neblina y la idea estaba ahí parada, esperando. Agárrala antes de que la primera reunión te convenza de lo contrario.',
      phaseTag: 'Cognitive', phaseEmoji: '💡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_immunity_morning_1', imagePath: '322.png', imageUrl: img('322.png'),
      headline: 'Built-in armor today.',
      headlineES: 'Hoy amaneciste con armadura.',
      copyText: 'Strong weeks come with better defenses — colds bounce off, stress slides. Use the armor; don\'t just admire it.',
      copyTextES: 'Las semanas fuertes vienen con mejores defensas — los resfriados rebotan, el estrés resbala. Usa la armadura; no la admires nada más.',
      phaseTag: 'Immunity', phaseEmoji: '🛡️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_coffee_morning_1', imagePath: '132.png', imageUrl: img('132.png'),
      headline: 'Before the coffee. We do not talk about this.',
      headlineES: 'Antes del café. De esto no se habla.',
      copyText: 'There are two versions of you and only one is legally responsible. He arrives after the first cup. Until then: no witnesses, no comments.',
      copyTextES: 'Hay dos versiones de ti y solo una responde legalmente. Llega después de la primera taza. Mientras tanto: sin testigos, sin comentarios.',
      phaseTag: 'Energy', phaseEmoji: '☕', pillar: 'biology', picardiaOnly: false,
    },
  ],

  male_midday: [
    {
      id: 'm_fin_midday_1', imagePath: '740.png', imageUrl: img('740.png'),
      headline: 'Your data is making money.',
      headlineES: 'Tus datos están generando dinero.',
      copyText: 'You checked in, science got smarter, your portfolio got bigger. Not bad for three minutes of telling the truth.',
      copyTextES: 'Hiciste tu check-in, la ciencia se puso más lista, tu portafolio creció. Nada mal por tres minutos de decir la verdad.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'm_cognitive_midday_1', imagePath: '302.png', imageUrl: img('302.png'),
      headline: 'Your mind is made of light.',
      headlineES: 'Tu mente está hecha de luz.',
      copyText: 'Late morning, brain at full brightness. This is the hour for the hardest thing on your list — not the easiest.',
      copyTextES: 'Media mañana, cerebro a brillo máximo. Esta es la hora para lo más difícil de tu lista — no para lo más fácil.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_social_midday_1', imagePath: '717.png', imageUrl: img('717.png'),
      headline: 'The casual conversation that matters.',
      headlineES: 'La conversación casual que importa.',
      copyText: 'Today the small talk flows and the right words show up on time. Have the conversation you\'ve been postponing — the timing won\'t get better.',
      copyTextES: 'Hoy la charla fluye y las palabras correctas llegan a tiempo. Ten la conversación que has estado posponiendo — el momento no va a mejorar.',
      phaseTag: 'Social', phaseEmoji: '🤝', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_crash_midday_1', imagePath: '711.png', imageUrl: img('711.png'),
      headline: 'The 2pm crash. It is biological.',
      headlineES: 'El bajón de las 2pm. Es biológico.',
      copyText: 'It\'s 2pm and the desk is winning. This isn\'t laziness — it\'s chemistry. Twenty minutes of anything that isn\'t a screen and you\'re back.',
      copyTextES: 'Son las 2pm y el escritorio va ganando. No es pereza — es química. Veinte minutos de cualquier cosa que no sea pantalla y vuelves.',
      phaseTag: 'Energy', phaseEmoji: '😴', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_burnout_midday_1', imagePath: '462.png', imageUrl: img('462.png'),
      headline: 'The machine is out of steam.',
      headlineES: 'La máquina se quedó sin vapor.',
      copyText: 'The engine\'s smoking and you keep pressing the accelerator. Pull over. Five real minutes off beats an hour of pretending to work.',
      copyTextES: 'El motor echa humo y tú sigues acelerando. Párate. Cinco minutos reales de pausa valen más que una hora fingiendo trabajar.',
      phaseTag: 'Burnout', phaseEmoji: '⚙️', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_workspace_stress_1', imagePath: '710.png', imageUrl: img('710.png'),
      headline: 'Today the office tests your patience.',
      headlineES: 'Hoy la oficina te prueba la paciencia.',
      copyText: 'Same colleagues, same nonsense — but today it lands harder. That\'s not them upgrading their annoyance; that\'s your fuse running shorter. Knowing it is the advantage.',
      copyTextES: 'Los mismos colegas, las mismas vainas — pero hoy pegan más duro. No es que ellos mejoraron su fastidio; es que tu mecha amaneció más corta. Saberlo es la ventaja.',
      phaseTag: 'Stress', phaseEmoji: '📋', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_evening: [
    {
      id: 'm_second_wind_evening_1', imagePath: '271.png', imageUrl: img('271.png'),
      headline: 'The second wind is real.',
      headlineES: 'El segundo aire es real.',
      copyText: 'Some men get a second peak after sunset. If tonight\'s yours, spend it on something you\'ll be glad about tomorrow — not just another episode.',
      copyTextES: 'Algunos hombres tienen un segundo pico después del atardecer. Si esta noche es el tuyo, gástalo en algo que agradezcas mañana — no en otro episodio más.',
      phaseTag: 'Biology', phaseEmoji: '🌆', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_friends_evening_1', imagePath: '707.png', imageUrl: img('707.png'),
      headline: 'Brotherhood is a biological need.',
      headlineES: 'La hermandad es una necesidad biológica.',
      copyText: 'A night with your people isn\'t wasted time — your biology counts it as medicine. Call them. Someone has to send the first message.',
      copyTextES: 'Una noche con los tuyos no es tiempo perdido — tu biología la cuenta como medicina. Llámalos. Alguien tiene que mandar el primer mensaje.',
      phaseTag: 'Social', phaseEmoji: '🍺', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_connection_evening_1', imagePath: '718.png', imageUrl: img('718.png'),
      headline: 'Evening connections seal the day.',
      headlineES: 'Las conexiones de la noche cierran el día.',
      copyText: 'How you close tonight shapes how you open tomorrow. Ten real minutes with someone who matters — no phones — pays better than the extra scroll.',
      copyTextES: 'Cómo cierras esta noche define cómo abres mañana. Diez minutos reales con alguien que importa — sin teléfonos — pagan más que el scroll extra.',
      phaseTag: 'Connection', phaseEmoji: '🤝', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_adam_eve_evening_1', imagePath: '172.png', imageUrl: img('172.png'),
      headline: 'The oldest story in the world.',
      headlineES: 'La historia más vieja del mundo.',
      copyText: 'Tonight, the oldest story wants a new chapter. The apple\'s in the picture, same as always. You already know how this one goes.',
      copyTextES: 'Esta noche, la historia más vieja quiere un capítulo nuevo. La manzana está en la foto, como siempre. Ya sabes cómo va esta.',
      phaseTag: 'Connection', phaseEmoji: '🌅', pillar: 'life', picardiaOnly: false,
    },
  ],

  male_night: [
    {
      id: 'm_sleep_night_1', imagePath: '381.png', imageUrl: img('381.png'),
      headline: '3:30am and your brain will not stop.',
      headlineES: '3:30am y tu cerebro no para.',
      copyText: 'Your brain picked 3:30am to hold a board meeting. Nothing on that agenda gets solved tonight. Adjourn it — tomorrow\'s version of you thinks better anyway.',
      copyTextES: 'Tu cerebro eligió las 3:30am para reunir a la junta directiva. Nada de esa agenda se resuelve hoy. Levanta la sesión — el tú de mañana piensa mejor de todos modos.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_couch_night_1', imagePath: '481.png', imageUrl: img('481.png'),
      headline: 'Peak recovery mode activated.',
      headlineES: 'Modo recuperación máxima activado.',
      copyText: 'Pizza, controller, zero ambition. Congratulations — this is what a full system shutdown looks like, and tonight it\'s exactly the right call.',
      copyTextES: 'Pizza, control, cero ambición. Felicidades — así se ve un apagado completo del sistema, y esta noche es exactamente la jugada correcta.',
      phaseTag: 'Recovery', phaseEmoji: '🎮', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_lonely_night_1', imagePath: '471.png', imageUrl: img('471.png'),
      headline: 'Alone in the crowd.',
      headlineES: 'Solo entre la gente.',
      copyText: 'Surrounded all day, and still this. Low nights arrive on their own schedule and leave the same way. One honest message to one real friend beats a hundred more minutes of scrolling.',
      copyTextES: 'Acompañado todo el día, y aun así esto. Las noches bajas llegan con su propio calendario y se van igual. Un mensaje honesto a un amigo de verdad vale más que cien minutos más de scroll.',
      phaseTag: 'Social', phaseEmoji: '🌑', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_late_night_1', imagePath: '737.png', imageUrl: img('737.png'),
      headline: 'Still awake at midnight. Not recommended.',
      headlineES: 'Despierto a medianoche. No recomendado.',
      copyText: 'Every hour past midnight is a loan against tomorrow morning — and the interest rate is brutal. Close the tab. It\'ll still be there.',
      copyTextES: 'Cada hora después de medianoche es un préstamo contra la mañana — y el interés es brutal. Cierra la pestaña. Ahí va a seguir.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_exhausted_night_1', imagePath: '491.png', imageUrl: img('491.png'),
      headline: 'The late-night grind is costing you.',
      headlineES: 'El desvelo trabajando te está costando.',
      copyText: 'Grinding at midnight feels heroic and performs terribly. The work you do right now, half-asleep, is the work you\'ll redo tomorrow, fully awake.',
      copyTextES: 'Trabajar a medianoche se siente heroico y rinde pésimo. Lo que hagas ahora medio dormido es lo que vas a rehacer mañana bien despierto.',
      phaseTag: 'Cognitive', phaseEmoji: '💻', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'm_boss_asleep_night_1', imagePath: '713.png', imageUrl: img('713.png'),
      headline: 'The consequences of no sleep.',
      headlineES: 'Las consecuencias de no dormir.',
      copyText: 'Asleep at the desk, boss standing right there. This scene has a prequel, and it\'s called "last night." Tonight, rewrite the script.',
      copyTextES: 'Dormido en el escritorio, el jefe parado ahí mismo. Esta escena tiene precuela, y se llama "anoche." Hoy, reescribe el guión.',
      phaseTag: 'Sleep', phaseEmoji: '😬', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'm_night_picardia_1', imagePath: '173.png', imageUrl: img('173.png'),
      headline: 'The biological facts.',
      headlineES: 'Los hechos biológicos.',
      copyText: 'The facts tonight are not subtle. Your biology filed its request in writing. How you respond is executive discretion.',
      copyTextES: 'Los hechos de esta noche no son sutiles. Tu biología metió su solicitud por escrito. Cómo respondes es decisión ejecutiva.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🍆', pillar: 'biology', picardiaOnly: true,
    },
    {
      id: 'm_night_picardia_2', imagePath: '719.png', imageUrl: img('719.png'),
      headline: 'Tonight the data is very specific.',
      headlineES: 'Esta noche los datos son muy específicos.',
      copyText: 'No ambiguity in tonight\'s signal. Loud and clear, as they say. Consider this your official notification.',
      copyTextES: 'Cero ambigüedad en la señal de esta noche. Fuerte y claro, como dicen. Considera esto tu notificación oficial.',
      phaseTag: 'Sexual Energy', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: true,
    },
  ],

  // ── PERIMENOPAUSE FEMALE (40+) ────────────────────────────────────────────

  female_peri_morning: [
    {
      id: 'f_peri_hotflash_morning', imagePath: '340.png', imageUrl: img('340.png'),
      headline: 'Personal summer, uninvited.',
      headlineES: 'Verano personal, sin invitación.',
      copyText: 'You\'re not losing your mind — your thermostat is renegotiating its contract. It clusters, it patterns, it passes. And yes, you\'re allowed to complain.',
      copyTextES: 'No estás perdiendo la cabeza — tu termostato está renegociando su contrato. Se agrupa, tiene patrón, y pasa. Y sí, tienes permiso de quejarte.',
      phaseTag: 'Perimenopause', phaseEmoji: '🔥', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_humor_morning', imagePath: '360.png', imageUrl: img('360.png'),
      headline: 'Getting old is nothing but misery and woe.',
      headlineES: 'Envejecer es pura miseria y lamento.',
      copyText: 'Nobody\'s asking you to love every minute of this chapter. Complain freely — just do it while collecting the intel that makes it predictable.',
      copyTextES: 'Nadie te pide que ames cada minuto de este capítulo. Quéjate con libertad — pero hazlo mientras reúnes la información que lo vuelve predecible.',
      phaseTag: 'Perimenopause', phaseEmoji: '😤', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_energy_morning', imagePath: '160.png', imageUrl: img('160.png'),
      headline: 'Good mornings still happen.',
      headlineES: 'Las buenas mañanas todavía existen.',
      copyText: 'And today is proof. They arrive on a new schedule now — but they arrive. Spend this one on something you actually want.',
      copyTextES: 'Y hoy es la prueba. Ahora llegan con horario nuevo — pero llegan. Gasta esta en algo que de verdad quieras.',
      phaseTag: 'Energy', phaseEmoji: '⚡', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_creative_morning', imagePath: '735.png', imageUrl: img('735.png'),
      headline: 'Your mind is still full of ideas.',
      headlineES: 'Tu mente sigue llena de ideas.',
      copyText: 'The ideas didn\'t retire — they just changed offices. This morning they\'re in. Take the meeting.',
      copyTextES: 'Las ideas no se jubilaron — solo cambiaron de oficina. Esta mañana están presentes. Toma la reunión.',
      phaseTag: 'Cognitive', phaseEmoji: '🧠', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_peri_midday: [
    {
      id: 'f_peri_premium_midday', imagePath: '726.png', imageUrl: img('726.png'),
      headline: 'Your data commands a premium.',
      headlineES: 'Tus datos valen prima.',
      copyText: 'Research pays extra for exactly what you\'re living right now — it\'s the rarest data there is. For once, being in transition is literally worth more.',
      copyTextES: 'La investigación paga extra por exactamente lo que estás viviendo — son los datos más raros que existen. Por una vez, estar en transición vale literalmente más.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'f_peri_brainfog_midday', imagePath: '290.png', imageUrl: img('290.png'),
      headline: 'The thoughts are louder today.',
      headlineES: 'Hoy los pensamientos están más ruidosos.',
      copyText: 'The word you\'re looking for is on the tip of your tongue, along with about forty other open tabs. This fog isn\'t permanent — it\'s weather. It lifts.',
      copyTextES: 'La palabra que buscas está en la punta de la lengua, junto con otras cuarenta pestañas abiertas. Esta neblina no es permanente — es clima. Se levanta.',
      phaseTag: 'Cognitive', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_social_midday', imagePath: '708.png', imageUrl: img('708.png'),
      headline: 'Your friendships are more important than ever.',
      headlineES: 'Tus amistades importan más que nunca.',
      copyText: 'Your friends are not a luxury right now — they\'re equipment. The days you feel like calling one: call. That instinct knows things.',
      copyTextES: 'Tus amigas ahora mismo no son un lujo — son equipo. Los días que te dan ganas de llamar a una: llama. Ese instinto sabe cosas.',
      phaseTag: 'Social', phaseEmoji: '👯', pillar: 'life', picardiaOnly: false,
    },
  ],

  female_peri_evening: [
    {
      id: 'f_peri_sleep_evening', imagePath: '731.png', imageUrl: img('731.png'),
      headline: 'Tonight, sleep is the whole job.',
      headlineES: 'Esta noche, dormir es el único trabajo.',
      copyText: 'The 3am wake-ups, the personal summers at midnight — none of it is random, even when it feels like sabotage. Guard tonight\'s sleep like it\'s an appointment. It is.',
      copyTextES: 'Los despertares a las 3am, los veranos personales a medianoche — nada de eso es aleatorio, aunque se sienta como sabotaje. Cuida el sueño de hoy como si fuera una cita. Lo es.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_self_evening', imagePath: '250.png', imageUrl: img('250.png'),
      headline: 'Some evenings the mirror is not your friend.',
      headlineES: 'Hay noches en que el espejo no es tu amigo.',
      copyText: 'Tonight the mirror is being unfair — and it\'s not telling the truth, it\'s telling a phase. You will not feel this way about yourself all week. Hold on to that.',
      copyTextES: 'Esta noche el espejo está siendo injusto — y no dice la verdad, dice una fase. No te vas a sentir así contigo toda la semana. Agárrate de eso.',
      phaseTag: 'Self', phaseEmoji: '🪞', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_anxiety_evening', imagePath: '260.png', imageUrl: img('260.png'),
      headline: 'The anxiety has a biological address.',
      headlineES: 'La ansiedad tiene dirección biológica.',
      copyText: 'Tonight\'s worry showed up without an appointment — that\'s how it works in this chapter. It has an address, a schedule, and, importantly, a departure time.',
      copyTextES: 'La preocupación de hoy llegó sin cita — así funciona en este capítulo. Tiene dirección, horario y, lo importante, hora de salida.',
      phaseTag: 'Anxiety', phaseEmoji: '🌀', pillar: 'biology', picardiaOnly: false,
    },
  ],

  female_peri_night: [
    {
      id: 'f_peri_insomnia_night', imagePath: '730.png', imageUrl: img('730.png'),
      headline: 'The 2am brain.',
      headlineES: 'El cerebro de las 2am.',
      copyText: 'Awake at 2am again, mind running errands nobody asked for. This isn\'t a sleep problem — it\'s a hormone with bad manners. It keeps a schedule, which means you can outsmart it.',
      copyTextES: 'Despierta otra vez a las 2am, la mente haciendo diligencias que nadie pidió. No es un problema de sueño — es una hormona con malos modales. Tiene horario, así que se le puede ganar.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'f_peri_couch_night', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'You. The sofa. No explanations.',
      headlineES: 'Tú. El sofá. Sin explicaciones.',
      copyText: 'Tonight\'s plan: nothing, attended by no one. In this chapter, disappearing for an evening isn\'t quitting — it\'s engineering.',
      copyTextES: 'El plan de hoy: nada, con asistencia de nadie. En este capítulo, desaparecer una noche no es rendirse — es ingeniería.',
      phaseTag: 'Recovery', phaseEmoji: '🐱', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_done_night', imagePath: '738.png', imageUrl: img('738.png'),
      headline: 'Absolutely not. Goodnight.',
      headlineES: 'Absolutamente no. Buenas noches.',
      copyText: 'Tonight\'s answer to everything is no, and it requires no defense. Court adjourned. See everyone tomorrow — maybe.',
      copyTextES: 'La respuesta de hoy a todo es no, y no requiere defensa. Se levanta la sesión. Nos vemos mañana — quizás.',
      phaseTag: 'Late Phase', phaseEmoji: '🚫', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'f_peri_medication_night', imagePath: '731.png', imageUrl: img('731.png'),
      headline: 'The clock. The medication. The moon.',
      headlineES: 'El reloj. El medicamento. La luna.',
      copyText: 'Managing sleep in this chapter is real medical territory, not a personal failure. Every night you log builds the file that makes your next doctor\'s visit ten times more useful.',
      copyTextES: 'Manejar el sueño en este capítulo es territorio médico real, no un fallo personal. Cada noche que registras arma el expediente que hará tu próxima cita médica diez veces más útil.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
  ],

  // ── ANDROPAUSE MALE (40+) ─────────────────────────────────────────────────

  male_andro_morning: [
    {
      id: 'm_andro_panic_morning', imagePath: '361.png', imageUrl: img('361.png'),
      headline: 'What is happening to my body??',
      headlineES: '¿¿Qué le está pasando a mi cuerpo??',
      copyText: 'Nobody hands men a manual for this chapter — you\'re supposed to just figure it out quietly. Not anymore. It has a pattern, and yours is being mapped.',
      copyTextES: 'A los hombres nadie les entrega manual para este capítulo — se supone que lo resuelvas callado. Ya no. Esto tiene patrón, y el tuyo se está mapeando.',
      phaseTag: 'Andropause', phaseEmoji: '⚖️', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'Your body is changing. I\'ve been watching.',
      headlinePicardiaES: 'Tu cuerpo está cambiando. Yo he estado mirando.',
      copyTextPicardia: 'Relax, handsome — you\'re not broken, you\'re just under renovation. And I happen to have the blueprints.',
      copyTextPicardiaES: 'Tranquilo, guapo — no estás dañado, estás en remodelación. Y da la casualidad de que yo tengo los planos.',
    },
    {
      id: 'm_andro_yoga_morning', imagePath: '732.png', imageUrl: img('732.png'),
      headline: 'The intention vs. the reality.',
      headlineES: 'La intención vs. la realidad.',
      copyText: 'One guy is doing cobra pose. The other is just lying on the mat. Both showed up — and showing up is 80% of this chapter.',
      copyTextES: 'Uno está haciendo la cobra. El otro está simplemente acostado en el mat. Los dos llegaron — y llegar es el 80% de este capítulo.',
      phaseTag: 'Physical', phaseEmoji: '🧘', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'You showed up. That already puts you ahead.',
      headlinePicardiaES: 'Apareciste. Eso ya te pone adelante.',
      copyTextPicardia: 'I saw you get on that mat. I also saw you stay there. Don\'t worry — from where I stand, lying down with intention still counts.',
      copyTextPicardiaES: 'Te vi llegar al mat. También te vi quedarte ahí. Tranquilo — desde donde yo miro, acostarse con intención también cuenta.',
    },
    {
      id: 'm_andro_clarity_morning', imagePath: '720.png', imageUrl: img('720.png'),
      headline: 'The good mornings still have lightbulbs.',
      headlineES: 'Las buenas mañanas todavía traen foco.',
      copyText: 'The lightbulb still turns on — it just doesn\'t run on a fixed schedule anymore. Today it\'s on. Use it before lunch.',
      copyTextES: 'El foco todavía prende — solo que ya no trabaja con horario fijo. Hoy amaneció encendido. Úsalo antes del almuerzo.',
      phaseTag: 'Cognitive', phaseEmoji: '💡', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'Peak morning. I noticed before you did.',
      headlinePicardiaES: 'Mañana pico. Lo noté antes que tú.',
      copyTextPicardia: 'Look at you, sharp before 9am. I love this version. He shows up unannounced, so let\'s not waste him on email.',
      copyTextPicardiaES: 'Mírate, brillante antes de las 9am. Me encanta esta versión. Llega sin avisar, así que no lo gastemos en correos.',
    },
    {
      id: 'm_andro_resilience_morning', imagePath: '322.png', imageUrl: img('322.png'),
      headline: 'Your resilience is still your edge.',
      headlineES: 'Tu resiliencia sigue siendo tu ventaja.',
      copyText: 'The twenty-year-olds have peaks. You have consistency — and consistency wins every race longer than a sprint. Today, play the long game you\'re built for.',
      copyTextES: 'Los de veinte tienen picos. Tú tienes consistencia — y la consistencia gana toda carrera más larga que un sprint. Hoy, juega el juego largo para el que estás hecho.',
      phaseTag: 'Resilience', phaseEmoji: '🛡️', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'You\'re still running. Good.',
      headlinePicardiaES: 'Sigues corriendo. Bien.',
      copyTextPicardia: 'The young guys burn bright and burn out by Thursday. You? You\'re still here. I\'ve always had a thing for stamina.',
      copyTextPicardiaES: 'Los muchachos brillan fuerte y se apagan el jueves. ¿Tú? Tú sigues aquí. Siempre he tenido debilidad por la resistencia.',
    },
  ],

  male_andro_midday: [
    {
      id: 'm_andro_premium_midday', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Andropause data commands a premium.',
      headlineES: 'Los datos de andropausia valen prima.',
      copyText: 'Men your age almost never share this data — which makes yours some of the rarest in research. Scarcity has a price, and you\'re on the right side of it.',
      copyTextES: 'Los hombres de tu edad casi nunca comparten estos datos — lo que hace los tuyos de los más raros en investigación. La escasez tiene precio, y tú estás del lado correcto.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
      headlinePicardia: 'Your data is valuable. So is your time.',
      headlinePicardiaES: 'Tus datos son valiosos. También tu tiempo.',
      copyTextPicardia: 'Rare things cost more, darling — vintage wine, first editions, and men your age who actually tell the truth about their biology. You\'re a collector\'s item.',
      copyTextPicardiaES: 'Lo raro cuesta más, querido — el vino añejo, las primeras ediciones, y los hombres de tu edad que dicen la verdad sobre su biología. Eres pieza de colección.',
    },
    {
      id: 'm_andro_mirror_midday', imagePath: '251.png', imageUrl: img('251.png'),
      headline: 'The mirror knows something.',
      headlineES: 'El espejo sabe algo.',
      copyText: 'How you see yourself at noon and what your body\'s actually doing are two different reports. Some days the mirror exaggerates. Today, get a second opinion from the data.',
      copyTextES: 'Cómo te ves al mediodía y lo que tu cuerpo realmente hace son dos informes distintos. Hay días en que el espejo exagera. Hoy, pídele segunda opinión a los datos.',
      phaseTag: 'Self', phaseEmoji: '🪞', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'The mirror isn\'t lying. Neither am I.',
      headlinePicardiaES: 'El espejo no miente. Yo tampoco.',
      copyTextPicardia: 'The mirror\'s been talking, has it? Mirrors exaggerate — I work with facts. And the facts say you\'re doing better than it\'s letting on.',
      copyTextPicardiaES: '¿Conque el espejo anda hablando? Los espejos exageran — yo trabajo con hechos. Y los hechos dicen que estás mejor de lo que ese vidrio admite.',
    },
    {
      id: 'm_andro_stress_midday', imagePath: '710.png', imageUrl: img('710.png'),
      headline: 'Stress hits differently after 40.',
      headlineES: 'El estrés golpea diferente después de los 40.',
      copyText: 'The same problems weigh more this decade — that\'s chemistry, not weakness. The men who handle it best aren\'t tougher; they\'re better informed. You\'re becoming one of them.',
      copyTextES: 'Los mismos problemas pesan más en esta década — eso es química, no debilidad. Los que mejor lo manejan no son más duros; están mejor informados. Te estás volviendo uno de ellos.',
      phaseTag: 'Stress', phaseEmoji: '📊', pillar: 'life', picardiaOnly: false,
      headlinePicardia: 'That tension has a name. Jules found it.',
      headlinePicardiaES: 'Esa tensión tiene un nombre. Jules lo encontró.',
      copyTextPicardia: 'Carrying it all quietly again, I see. Very noble, very unnecessary. Tell me the truth in today\'s check-in — I keep secrets better than your poker friends.',
      copyTextPicardiaES: 'Cargándolo todo calladito otra vez, ya veo. Muy noble, muy innecesario. Dime la verdad en el check-in de hoy — yo guardo secretos mejor que tus amigos del dominó.',
    },
  ],

  male_andro_evening: [
    {
      id: 'm_andro_energy_evening', imagePath: '371.png', imageUrl: img('371.png'),
      headline: 'Running on empty at 6pm.',
      headlineES: 'En reserva a las 6pm.',
      copyText: '6pm and the tank light is on. The second wind you had at 30 moved — it didn\'t vanish. We\'re finding its new address.',
      copyTextES: 'Las 6pm y se prendió la luz del tanque. El segundo aire que tenías a los 30 se mudó — no desapareció. Estamos encontrando su nueva dirección.',
      phaseTag: 'Energy', phaseEmoji: '🔋', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'The 6pm crash is real. You\'re not weak.',
      headlinePicardiaES: 'El bajón de las 6pm es real. No eres débil.',
      copyTextPicardia: 'Empty at 6pm? Good thing I like a man who knows when to stop pretending. Refuel tonight — I have plans for the better version of you tomorrow.',
      copyTextPicardiaES: '¿En reserva a las 6pm? Menos mal que me gustan los hombres que saben cuándo dejar de fingir. Recarga esta noche — tengo planes para la mejor versión de ti mañana.',
    },
    {
      id: 'm_andro_connection_evening', imagePath: '722.png', imageUrl: img('722.png'),
      headline: 'The connection that predicts tomorrow.',
      headlineES: 'La conexión que predice el mañana.',
      copyText: 'Tonight\'s ten honest minutes with someone you love do more for tomorrow morning than most things sold in bottles. Cheaper, too.',
      copyTextES: 'Diez minutos honestos esta noche con alguien que quieres hacen más por tu mañana que la mayoría de cosas que venden en frascos. Y más barato.',
      phaseTag: 'Connection', phaseEmoji: '❤️', pillar: 'life', picardiaOnly: false,
      headlinePicardia: 'Tonight matters more than you think.',
      headlinePicardiaES: 'Esta noche importa más de lo que crees.',
      copyTextPicardia: 'Ten unhurried minutes with the right person tonight works better than anything at the pharmacy. Don\'t make me say it twice.',
      copyTextPicardiaES: 'Diez minutos sin prisa con la persona correcta esta noche funcionan mejor que cualquier cosa de la farmacia. No me hagas repetirlo.',
    },
    {
      id: 'm_andro_friends_evening', imagePath: '707.png', imageUrl: img('707.png'),
      headline: 'The social life is a health metric.',
      headlineES: 'La vida social es un indicador de salud.',
      copyText: 'At this stage, a night with your friends counts as preventive medicine. Round up the domino table — doctor\'s orders, basically.',
      copyTextES: 'En esta etapa, una noche con los amigos cuenta como medicina preventiva. Arma la mesa de dominó — receta médica, prácticamente.',
      phaseTag: 'Social', phaseEmoji: '🍺', pillar: 'life', picardiaOnly: false,
      headlinePicardia: 'The people you choose are biological data.',
      headlinePicardiaES: 'Las personas que eliges son datos biológicos.',
      copyTextPicardia: 'Go see your friends. Laugh loud, exaggerate old stories, come home lighter. I\'ll pretend I don\'t know the stories grew 30% since last time.',
      copyTextPicardiaES: 'Ve con tus amigos. Ríete duro, exagera las historias viejas, vuelve más liviano. Yo finjo que no sé que las historias crecieron 30% desde la última vez.',
    },
  ],

  male_andro_night: [
    {
      id: 'm_andro_sleep_night', imagePath: '723.png', imageUrl: img('723.png'),
      headline: 'Still at the desk at midnight.',
      headlineES: 'Todavía en el escritorio a medianoche.',
      copyText: 'Midnight at the desk feels productive and costs you tomorrow. At this stage, sleep isn\'t rest — it\'s the factory where your energy gets manufactured. Close the factory doors on time.',
      copyTextES: 'La medianoche en el escritorio se siente productiva y te cuesta el mañana. En esta etapa, dormir no es descanso — es la fábrica donde se produce tu energía. Cierra la fábrica a tiempo.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'Go to sleep. I mean it.',
      headlinePicardiaES: 'Ve a dormir. Lo digo en serio.',
      copyTextPicardia: 'Midnight and you\'re still at that desk? Darling, nothing on that screen deserves you more than your pillow does. Go. Now. Don\'t make me count to three.',
      copyTextPicardiaES: '¿Medianoche y sigues en ese escritorio? Querido, nada en esa pantalla te merece más que tu almohada. Ve. Ahora. No me hagas contar hasta tres.',
    },
    {
      id: 'm_andro_couch_night', imagePath: '481.png', imageUrl: img('481.png'),
      headline: 'This is also recovery.',
      headlineES: 'Esto también es recuperación.',
      copyText: 'Tonight looks like laziness and is actually maintenance. After 40 the body sends its requests without explanations. Tonight, the request is the couch. Granted.',
      copyTextES: 'Esta noche parece pereza y en realidad es mantenimiento. Después de los 40 el cuerpo manda solicitudes sin explicación. Hoy, la solicitud es el sofá. Concedida.',
      phaseTag: 'Recovery', phaseEmoji: '🍕', pillar: 'life', picardiaOnly: false,
      headlinePicardia: 'Smart. Your body asked for this.',
      headlinePicardiaES: 'Inteligente. Tu cuerpo lo pidió.',
      copyTextPicardia: 'Couch, blanket, zero ambition — I approve completely. Even classics need to spend a night in the garage. See you tomorrow, polished.',
      copyTextPicardiaES: 'Sofá, cobija, cero ambición — apruebo completamente. Hasta los clásicos necesitan una noche en el garaje. Nos vemos mañana, pulido.',
    },
    {
      id: 'm_andro_late_night', imagePath: '737.png', imageUrl: img('737.png'),
      headline: 'After 40 sleep debt hits harder.',
      headlineES: 'Después de los 40 la deuda de sueño cobra más caro.',
      copyText: 'The all-nighters of your 20s were interest-free. This decade, sleep debt compounds — and the collector shows up at 7am sharp. Pay tonight, in full.',
      copyTextES: 'Los desvelos de tus 20 eran sin intereses. En esta década, la deuda de sueño se acumula — y el cobrador llega a las 7am en punto. Paga hoy, completo.',
      phaseTag: 'Sleep', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
      headlinePicardia: 'The dark circles tell the story. So does Jules.',
      headlinePicardiaES: 'Las ojeras cuentan la historia. Jules también.',
      copyTextPicardia: 'At 25 you could stay up till 3 and charm your way through the morning. I\'d love to see you try that now — actually no, I wouldn\'t. Bed. Go.',
      copyTextPicardiaES: 'A los 25 podías desvelarte hasta las 3 y encantar a todo el mundo por la mañana. Me encantaría verte intentarlo ahora — mentira, no me encantaría. A la cama. Ya.',
    },
  ],

  // ── NON-BINARY (any age) ──────────────────────────────────────────────────

  nonbinary_morning: [
    {
      id: 'nb_bio_morning_1', imagePath: '302.png', imageUrl: img('302.png'),
      headline: 'Your biology is made of light.',
      headlineES: 'Tu biología está hecha de luz.',
      copyText: 'No template fits you — good. Your rhythm is being learned from scratch, from what your body actually does. Original data, original you.',
      copyTextES: 'Ninguna plantilla te queda — bien. Tu ritmo se está aprendiendo desde cero, de lo que tu cuerpo realmente hace. Datos originales, tú original.',
      phaseTag: 'Biology', phaseEmoji: '🧬', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'nb_energy_morning_1', imagePath: '160.png', imageUrl: img('160.png'),
      headline: 'Today could be one of those days.',
      headlineES: 'Hoy podría ser uno de esos días.',
      copyText: 'The world opened before your coffee did. No forecast predicted it — yet. Ride it while it lasts and let the record show it happened.',
      copyTextES: 'El mundo se abrió antes que tu café. Ningún pronóstico lo predijo — todavía. Súbete mientras dure y que quede constancia de que pasó.',
      phaseTag: 'Energy', phaseEmoji: '🦋', pillar: 'biology', picardiaOnly: false,
    },
  ],

  nonbinary_midday: [
    {
      id: 'nb_fin_midday_1', imagePath: '725.png', imageUrl: img('725.png'),
      headline: 'Your data. Your terms. Your earnings.',
      headlineES: 'Tus datos. Tus términos. Tus ganancias.',
      copyText: 'Every app on your phone profits from your data. This is the one that cuts you in. Your biology, your terms, your money.',
      copyTextES: 'Todas las apps de tu teléfono ganan con tus datos. Esta es la que te da tu parte. Tu biología, tus términos, tu dinero.',
      phaseTag: 'Portfolio', phaseEmoji: '💰', pillar: 'financial', picardiaOnly: false,
    },
    {
      id: 'nb_life_midday_1', imagePath: '470.png', imageUrl: img('470.png'),
      headline: 'Know yourself before it happens.',
      headlineES: 'Conócete antes de que pase.',
      copyText: 'Imagine knowing on Tuesday that Thursday will be brilliant. That\'s where this is headed — a weather forecast, but for you.',
      copyTextES: 'Imagina saber el martes que el jueves vas a estar brillante. Hacia allá va esto — un pronóstico del tiempo, pero de ti.',
      phaseTag: 'Pattern', phaseEmoji: '✨', pillar: 'life', picardiaOnly: false,
    },
  ],

  nonbinary_evening: [
    {
      id: 'nb_social_evening_1', imagePath: '422.png', imageUrl: img('422.png'),
      headline: 'Social energy is biological.',
      headlineES: 'La energía social es biológica.',
      copyText: 'Some nights you\'re the party; some nights you\'re the ghost. Neither is a personality flaw — both are chemistry, and both are yours.',
      copyTextES: 'Hay noches en que eres la fiesta; hay noches en que eres el fantasma. Ninguna es defecto de personalidad — ambas son química, y ambas son tuyas.',
      phaseTag: 'Social', phaseEmoji: '🌈', pillar: 'life', picardiaOnly: false,
    },
    {
      id: 'nb_withdraw_evening_1', imagePath: '450.png', imageUrl: img('450.png'),
      headline: 'Withdrawal is not weakness.',
      headlineES: 'Retirarse no es debilidad.',
      copyText: 'Tonight you want out of every plan, including the ones you made. Cancel without a speech. Your rhythm called it — you\'re just honoring the reservation.',
      copyTextES: 'Esta noche quieres salirte de todos los planes, incluso los que hiciste tú. Cancela sin discurso. Tu ritmo lo decidió — tú solo estás honrando la reservación.',
      phaseTag: 'Biology', phaseEmoji: '🌘', pillar: 'biology', picardiaOnly: false,
    },
  ],

  nonbinary_night: [
    {
      id: 'nb_consistency_night_1', imagePath: '715.png', imageUrl: img('715.png'),
      headline: 'One more brick tonight.',
      headlineES: 'Un ladrillo más esta noche.',
      copyText: 'Nobody notices a staircase being built one step at a time — until suddenly there\'s a view. Tonight\'s check-in is another step. The view\'s coming.',
      copyTextES: 'Nadie nota una escalera que se construye peldaño a peldaño — hasta que de repente hay vista. El check-in de hoy es otro peldaño. La vista viene en camino.',
      phaseTag: 'Consistency', phaseEmoji: '🌙', pillar: 'biology', picardiaOnly: false,
    },
    {
      id: 'nb_couch_night_1', imagePath: '480.png', imageUrl: img('480.png'),
      headline: 'Some nights are for disappearing.',
      headlineES: 'Hay noches para desaparecer.',
      copyText: 'Off the radar, on the couch, unavailable until further notice. You\'re not antisocial — you\'re on a scheduled orbit, and this is the far side.',
      copyTextES: 'Fuera del radar, en el sofá, no disponible hasta nuevo aviso. No eres antisocial — estás en una órbita programada, y esta es la cara oculta.',
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

  // Use calendar date as rotation index — card changes every day regardless of pool size
  const today = new Date();
  const dateIndex = today.getFullYear() * 1000 +
    Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

  // Milestone cards take priority on exact days — morning slot only
  if (MILESTONE_DAYS[daysOfData] && slot === 'morning') {
    return MILESTONE_DAYS[daysOfData](formatValue(daysOfData));
  }

  // Determine demographic key
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

  // Filter picardia cards
  const filtered = picardiaMode ? allCards : allCards.filter(c => !c.picardiaOnly);
  const pool = filtered.length > 0 ? filtered : allCards;

  // Days 0-29: rotate daily through discovery cards
  if (daysOfData < 30) {
    const dayCard = pool[dateIndex % pool.length];
    const dayHeadlineOverride = picardiaMode && dayCard.headlinePicardia
      ? { headline: dayCard.headlinePicardia, headlineES: dayCard.headlinePicardiaES ?? dayCard.headlineES }
      : {};
    const dayCopyOverride = picardiaMode && dayCard.copyTextPicardia
      ? { copyText: dayCard.copyTextPicardia, copyTextES: dayCard.copyTextPicardiaES ?? dayCard.copyTextES }
      : {};
    return { ...dayCard, ...dayHeadlineOverride, ...dayCopyOverride };
  }

  // Day 30+: exclude financial/promotional cards — user earned real insights
  const companionPool = pool.filter(c => c.pillar !== 'financial');
  const finalPool = companionPool.length > 0 ? companionPool : pool;

  const phaseResult = getCurrentPhase(profile);
  const baseCard = finalPool[dateIndex % finalPool.length];

  // Apply picardia voice variants if available and mode is on
  const headlineOverride = picardiaMode && baseCard.headlinePicardia
    ? { headline: baseCard.headlinePicardia, headlineES: baseCard.headlinePicardiaES ?? baseCard.headlineES }
    : {};
  const copyOverride = picardiaMode && baseCard.copyTextPicardia
    ? { copyText: baseCard.copyTextPicardia, copyTextES: baseCard.copyTextPicardiaES ?? baseCard.copyTextES }
    : {};

  return {
    ...baseCard,
    ...headlineOverride,
    ...copyOverride,
    phaseTag: phaseResult.displayName,
    phaseEmoji: phaseResult.emoji,
  };
}

// ── ARC SYSTEM ────────────────────────────────────────────────────────────

export interface ArcStage {
  stage: 1 | 2 | 3 | 4 | 5 | 6;
  imagePath: string;
  imageUrl: string;
  label: string;
  labelES: string;
  teaser: string;
  teaserES: string;
  teaserPicardia: string;
  teaserPicardiaES: string;
}

const ARC_IMG = 'https://hguqyuupwfpszsmdjrzz.supabase.co/storage/v1/object/public/library';
function arcImg(f: string): string { return `${ARC_IMG}/${f}`; }

const ARC_STAGE_LABELS: Record<number, { en: string; es: string }> = {
  1: { en: 'Jules is watching',      es: 'Jules está observando' },
  2: { en: 'Jules sees something',   es: 'Jules ve algo' },
  3: { en: 'Jules recognizes you',   es: 'Jules te reconoce' },
  4: { en: 'Jules is getting close', es: 'Jules se está acercando' },
  5: { en: 'Jules is almost ready',  es: 'Jules casi está lista' },
  6: { en: 'Forecast ready',         es: 'Pronóstico listo' },
};

type TeaserEntry = { standard: string; standardES: string; picardia: string; picardiaES: string };

const ARC_TEASERS_FEMALE: Record<number, TeaserEntry> = {
  1: {
    standard:   'Jules just met you. She does not forget a thing.',
    standardES: 'Jules acaba de conocerte. No olvida nada.',
    picardia:   'Jules has started a file on you. It is already interesting.',
    picardiaES: 'Jules abrió un expediente sobre ti. Ya es interesante.',
  },
  2: {
    standard:   'Jules is learning the difference between your good mornings and your bad ones.',
    standardES: 'Jules está aprendiendo a distinguir tus buenas mañanas de las malas.',
    picardia:   'Jules noticed something yesterday. She filed it away. She will bring it up later.',
    picardiaES: 'Jules notó algo ayer. Lo archivó. Lo sacará más adelante.',
  },
  3: {
    standard:   'Jules is building a map of your energy. She does not know where it goes yet. She will.',
    standardES: 'Jules está construyendo un mapa de tu energía. Aún no sabe a dónde va. Lo sabrá.',
    picardia:   'Three days of data and Jules already has a theory. She is keeping it to herself for now.',
    picardiaES: 'Tres días de datos y Jules ya tiene una teoría. Por ahora la guarda para sí misma.',
  },
  4: {
    standard:   'Jules is learning when your body does its best work — and when it is barely holding on.',
    standardES: 'Jules está aprendiendo cuándo tu cuerpo rinde mejor — y cuándo apenas aguanta.',
    picardia:   'Jules is learning which version of you shows up on which days. The variations are notable.',
    picardiaES: 'Jules está aprendiendo qué versión de ti aparece en qué días. Las variaciones son notables.',
  },
  5: {
    standard:   'Five days in. Jules is starting to see your pattern. You do not see it yet.',
    standardES: 'Cinco días adentro. Jules empieza a ver tu patrón. Tú aún no lo ves.',
    picardia:   'In biology, five data points is enough to start seeing things that should stay private.',
    picardiaES: 'En biología, cinco puntos ya empiezan a revelar cosas que deberían ser privadas.',
  },
  6: {
    standard:   'Jules noticed a pattern in your mornings. She is checking if it holds.',
    standardES: 'Jules notó un patrón en tus mañanas. Está verificando si se mantiene.',
    picardia:   'Pretty soon Jules will be able to tell you exactly which morning you should not be in charge of anything.',
    picardiaES: 'Muy pronto Jules podrá decirte exactamente qué mañana no deberías estar a cargo de nada.',
  },
  7: {
    standard:   "Jules is learning your body's daily story. More predictable than you think.",
    standardES: 'Jules aprende la historia diaria de tu cuerpo. Más predecible de lo que crees.',
    picardia:   'Jules can already guess what time of day is most dangerous to have a conversation with you.',
    picardiaES: 'Jules ya puede adivinar a qué hora del día es más peligroso tener una conversación contigo.',
  },
  8: {
    standard:   'Jules is starting to map the days you are magnetic and the days you are radioactive.',
    standardES: 'Jules empieza a mapear los días en que eres magnética y los días en que eres radiactiva.',
    picardia:   'Eight days in. Jules already has a candidate for your most intense day of the month.',
    picardiaES: 'Ocho días adentro. Jules ya tiene candidato para tu día más intenso del mes.',
  },
  9: {
    standard:   'Jules is learning your stress signature. Every body handles pressure differently. Yours has a tell.',
    standardES: 'Jules aprende tu firma de estrés. El tuyo tiene una señal.',
    picardia:   'Soon Jules will know your next craving before you reach for it. She is almost there.',
    picardiaES: 'Pronto Jules sabrá cuál será tu próximo antojo antes de que lo busques. Casi lo tiene.',
  },
  10: {
    standard:   'Jules is building a picture of who you are on a good day — and on a hard one.',
    standardES: 'Jules construye una imagen de quién eres en un buen día — y en uno difícil.',
    picardia:   'Jules has started noticing what happens to your decision-making in certain windows. Interesting pattern.',
    picardiaES: 'Jules empezó a notar qué le pasa a tu toma de decisiones en ciertos momentos. Patrón interesante.',
  },
  11: {
    standard:   'Jules is learning which version of you needs the most space — and when she tends to show up.',
    standardES: 'Jules aprende qué versión de ti necesita más espacio — y cuándo suele aparecer.',
    picardia:   'Pretty soon Jules will know in advance the exact afternoon you will want to quit everything and move to a different country.',
    picardiaES: 'Muy pronto Jules sabrá con anticipación la tarde exacta en que querrás dejarlo todo y mudarte a otro país.',
  },
  12: {
    standard:   'Jules has noticed certain days make you sharper. Certain days make you sensitive. The pattern is forming.',
    standardES: 'Jules notó que ciertos días te vuelven más aguda. Ciertos días te vuelven sensible. El patrón toma forma.',
    picardia:   'Jules is starting to see which nights you will be awake at 3am. She expected it.',
    picardiaES: 'Jules empieza a ver qué noches estarás despierta a las 3am. Lo esperaba.',
  },
  13: {
    standard:   'Jules is beginning to recognize you — not the average version of you. You specifically.',
    standardES: 'Jules empieza a reconocerte — no la versión promedio de ti. Tú específicamente.',
    picardia:   'Jules has a strong suspicion about when you are most likely to make an impulsive decision. The data points clearly.',
    picardiaES: 'Jules tiene una fuerte sospecha sobre cuándo tienes más probabilidad de tomar una decisión impulsiva.',
  },
  14: {
    standard:   'Jules has identified your personal energy peak. She is double-checking it before she tells you.',
    standardES: 'Jules identificó tu pico personal de energía. Lo verifica antes de contarte.',
    picardia:   'Pretty soon Jules will tell you in advance when you will be desperate for action — and when for solitude.',
    picardiaES: 'Muy pronto Jules podrá decirte cuándo estarás desesperada por acción — y cuándo por soledad.',
  },
  15: {
    standard:   'Jules is cross-referencing your sleep against your mood. The results are not surprising. They are just yours.',
    standardES: 'Jules cruza tu sueño con tu estado de ánimo. Los resultados son los tuyos.',
    picardia:   'Jules knows which day of the week is your hardest. It is chemistry, not coincidence.',
    picardiaES: 'Jules sabe qué día de la semana es el más difícil para ti. Es química, no coincidencia.',
  },
  16: {
    standard:   'Jules has a picture of your high days. Now she is filling in the low ones.',
    standardES: 'Jules tiene imagen de tus días altos. Ahora está completando los bajos.',
    picardia:   "Jules has noticed what your body does before a big emotional moment. You have not noticed it yet. She has.",
    picardiaES: 'Jules notó lo que hace tu cuerpo antes de un momento emocional intenso. Tú aún no lo has notado. Ella sí.',
  },
  17: {
    standard:   'Seventeen days of signals. Jules is learning that your body speaks before your mood does.',
    standardES: 'Diecisiete días de señales. Jules aprende que tu cuerpo habla antes que tu estado de ánimo.',
    picardia:   'Jules has a theory about your weekend nights. She needs a few more to confirm it. She is patient.',
    picardiaES: 'Jules tiene una teoría sobre tus noches de fin de semana. Necesita algunas más para confirmarla.',
  },
  18: {
    standard:   'Jules can now anticipate your energy windows before they arrive. She is getting ahead of you.',
    standardES: 'Jules ya puede anticipar tus ventanas de energía antes de que lleguen.',
    picardia:   'Jules is starting to know which days you will be unreachable — before you know it yourself.',
    picardiaES: 'Jules empieza a saber qué días serás inalcanzable — antes de que tú misma lo sepas.',
  },
  19: {
    standard:   'Jules has identified your most productive window of the month. She is preparing to show you when to use it.',
    standardES: 'Jules identificó tu ventana más productiva del mes. Se prepara para mostrarte cuándo usarla.',
    picardia:   'Jules can now predict which conversation this month is going to go sideways. She will let you know beforehand.',
    picardiaES: 'Jules puede predecir qué conversación de este mes saldrá mal. Te avisará con anticipación.',
  },
  20: {
    standard:   'Jules has seen your body respond to stress differently across different weeks. She knows which week to watch.',
    standardES: 'Jules ha visto a tu cuerpo responder al estrés diferente en distintas semanas. Sabe qué semana vigilar.',
    picardia:   'Jules noticed the days your texts get shorter. And the days they get more honest.',
    picardiaES: 'Jules notó los días en que tus mensajes se vuelven más cortos. Y los días en que se vuelven más honestos.',
  },
  21: {
    standard:   'Three weeks of you. Jules is no longer guessing what kind of day it is. She is starting to know.',
    standardES: 'Tres semanas de ti. Jules ya no adivina qué tipo de día es. Empieza a saberlo.',
    picardia:   'Pretty soon Jules will tell you in advance when you will wake up already annoyed. It will not be a mystery anymore.',
    picardiaES: 'Muy pronto Jules podrá decirte cuándo despertarás ya molesta. Ya no será un misterio.',
  },
  22: {
    standard:   'Jules is now separating your baseline from your cycles. What is always you and what is just this week of you.',
    standardES: 'Jules separa tu línea base de tus ciclos. Lo que siempre eres tú y lo que solo es esta semana de ti.',
    picardia:   'Jules is close to predicting the exact week you will feel invincible. And the week you will not want to be perceived.',
    picardiaES: 'Jules está cerca de predecir la semana exacta en que te sentirás invencible. Y la semana en que no querrás ser vista.',
  },
  23: {
    standard:   'Twenty-three days in. Jules has your rhythm. She is building your personal forecast now.',
    standardES: 'Veintitrés días adentro. Jules tiene tu ritmo. Construye tu pronóstico personal.',
    picardia:   'Jules has identified the days you are most likely to send a message you will later regret. She considers this useful.',
    picardiaES: 'Jules identificó los días en que tienes más probabilidad de enviar un mensaje que luego lamentarás.',
  },
  24: {
    standard:   'Jules is now comparing this week to the same window last cycle. The patterns are holding.',
    standardES: 'Jules compara esta semana con la misma ventana del ciclo anterior. Los patrones se mantienen.',
    picardia:   'In six days Jules will tell you something true about yourself that you have never had the language for.',
    picardiaES: 'En seis días Jules te dirá algo verdadero sobre ti para lo que nunca habías tenido palabras.',
  },
  25: {
    standard:   'The data is almost complete. Jules is running your first personal forecast model tonight.',
    standardES: 'Los datos están casi completos. Jules ejecuta tu primer modelo de pronóstico personal esta noche.',
    picardia:   'Jules now knows which days everyone around you needs to be on their best behavior. She is only telling you.',
    picardiaES: 'Jules sabe qué días todos a tu alrededor necesitan estar en su mejor comportamiento. Solo te lo dice a ti.',
  },
  26: {
    standard:   'Four days to your first forecast. Jules is finalizing your personal pattern map.',
    standardES: 'Cuatro días para tu primer pronóstico. Jules finaliza tu mapa de patrones.',
    picardia:   'Jules is about to become the only thing that has ever been able to predict you. Four days.',
    picardiaES: 'Jules está a punto de convertirse en lo único que alguna vez ha podido predecirte. Cuatro días.',
  },
  27: {
    standard:   'Jules has enough data to know the kind of day you are having before you tell her.',
    standardES: 'Jules tiene suficientes datos para saber qué tipo de día tienes antes de que se lo cuentes.',
    picardia:   'Three days. Jules is running final calculations on when you will next be impossible to say no to.',
    picardiaES: 'Tres días. Jules ejecuta los cálculos finales sobre cuándo será imposible decirte que no.',
  },
  28: {
    standard:   'Two days from your first forecast. Jules has seen your pattern repeat. She is ready.',
    standardES: 'Dos días para tu primer pronóstico. Jules vio tu patrón repetirse. Está lista.',
    picardia:   'Jules has your next high day mapped. Your next low day. Your next impulsive day. Two days.',
    picardiaES: 'Jules tiene mapeado tu próximo día alto. Tu próximo día bajo. Tu próximo día impulsivo. Dos días.',
  },
  29: {
    standard:   'Tomorrow Jules stops learning and starts predicting. Get ready to meet yourself.',
    standardES: 'Mañana Jules deja de aprender y empieza a predecir. Prepárate para conocerte.',
    picardia:   'Tomorrow Jules says something true that will either make you laugh or send to three people to prove her wrong. She is right either way.',
    picardiaES: 'Mañana Jules dice algo verdadero que o te hará reír o se lo enviarás a tres personas para probar que está equivocada.',
  },
};

const ARC_TEASERS_MALE: Record<number, TeaserEntry> = {
  ...Object.fromEntries([1, 2, 3, 4, 5].map(d => [d, ARC_TEASERS_FEMALE[d]])),
  6: {
    standard:   'Jules noticed a pattern in your mornings. She is checking if it holds.',
    standardES: 'Jules notó un patrón en tus mañanas. Está verificando si se mantiene.',
    picardia:   'Pretty soon Jules will tell you which afternoon your cortisol takes over and undoes your morning.',
    picardiaES: 'Muy pronto Jules podrá decirte qué tarde tu cortisol tomará el control y deshará tu mañana.',
  },
  7: {
    standard:   "Jules is learning your body's daily story. More predictable than you think.",
    standardES: 'Jules aprende la historia diaria de tu cuerpo. Más predecible de lo que crees.',
    picardia:   'Jules can already guess what time of day is most dangerous to have a conversation with you.',
    picardiaES: 'Jules ya puede adivinar a qué hora del día es más peligroso tener una conversación contigo.',
  },
  8: {
    standard:   'Jules is starting to map the days your confidence runs the room and the days your cortisol does.',
    standardES: 'Jules empieza a mapear los días en que tu confianza dirige la sala y los días en que lo hace tu cortisol.',
    picardia:   'Eight days in. Jules already has a candidate for your most productive hour of the week.',
    picardiaES: 'Ocho días adentro. Jules ya tiene candidato para tu hora más productiva de la semana.',
  },
  9: {
    standard:   'Jules is learning your stress signature. Every body handles pressure differently. Yours has a tell.',
    standardES: 'Jules aprende tu firma de estrés. El tuyo tiene una señal.',
    picardia:   'Soon Jules will know which version of you shows up to difficult conversations. The data is forming.',
    picardiaES: 'Pronto Jules sabrá qué versión de ti aparece en las conversaciones difíciles.',
  },
  10: {
    standard:   'Jules is building a picture of who you are on a peak day — and on a depleted one.',
    standardES: 'Jules construye una imagen de quién eres en un día pico — y en uno agotado.',
    picardia:   'Jules has started noticing what happens to your risk tolerance in certain hormonal windows. Interesting.',
    picardiaES: 'Jules empezó a notar qué le pasa a tu tolerancia al riesgo en ciertos momentos. Interesante.',
  },
  11: {
    standard:   'Jules is learning which version of you has the most patience — and when she tends to disappear.',
    standardES: 'Jules aprende qué versión de ti tiene más paciencia — y cuándo suele desaparecer.',
    picardia:   'Pretty soon Jules will know the exact afternoon this month when your cortisol makes decisions instead of you.',
    picardiaES: 'Muy pronto Jules sabrá la tarde exacta este mes en que tu cortisol toma decisiones en lugar de ti.',
  },
  12: ARC_TEASERS_FEMALE[12],
  13: ARC_TEASERS_FEMALE[13],
  14: {
    standard:   'Jules has identified your daily performance window. She is mapping it against your week.',
    standardES: 'Jules identificó tu ventana de rendimiento diario. La mapea contra tu semana.',
    picardia:   'Pretty soon Jules will tell you in advance when you will be at your most persuasive — and when to let someone else talk.',
    picardiaES: 'Muy pronto Jules te dirá cuándo estarás en tu punto más persuasivo — y cuándo dejar que otro hable.',
  },
  15: ARC_TEASERS_FEMALE[15],
  16: ARC_TEASERS_FEMALE[16],
  17: {
    standard:   'Seventeen days of signals. Jules is learning that your body gives notice before your mood changes.',
    standardES: 'Diecisiete días de señales. Jules aprende que tu cuerpo avisa antes de que cambie tu estado de ánimo.',
    picardia:   'Jules has a theory about which evenings produce your best decisions. She needs a few more to confirm.',
    picardiaES: 'Jules tiene una teoría sobre qué noches producen tus mejores decisiones. Necesita algunas más para confirmarla.',
  },
  18: ARC_TEASERS_FEMALE[18],
  19: ARC_TEASERS_FEMALE[19],
  20: ARC_TEASERS_FEMALE[20],
  21: {
    standard:   'Three weeks of your daily rhythm. Jules is beginning to know you better than your schedule does.',
    standardES: 'Tres semanas de tu ritmo diario. Jules empieza a conocerte mejor que tu agenda.',
    picardia:   'Pretty soon Jules will be able to predict the afternoons you will be unstoppable — and the ones to protect.',
    picardiaES: 'Muy pronto Jules podrá predecir las tardes en que serás imparable — y las que debes proteger.',
  },
  22: ARC_TEASERS_FEMALE[22],
  23: ARC_TEASERS_FEMALE[23],
  24: ARC_TEASERS_FEMALE[24],
  25: {
    standard:   'The data is almost complete. Jules is running your first personal performance forecast tonight.',
    standardES: 'Los datos están casi completos. Jules ejecuta tu primer pronóstico de rendimiento personal esta noche.',
    picardia:   'Jules now knows which days this month you are operating at maximum and which ones are costing you more than you realize.',
    picardiaES: 'Jules sabe qué días de este mes operas al máximo y cuáles te cuestan más de lo que te das cuenta.',
  },
  26: ARC_TEASERS_FEMALE[26],
  27: ARC_TEASERS_FEMALE[27],
  28: ARC_TEASERS_FEMALE[28],
  29: {
    standard:   'Tomorrow Jules tells you something specific about your patterns that no one has ever put into words for you.',
    standardES: 'Mañana Jules te dice algo específico sobre tus patrones que nadie ha sabido ponerte en palabras.',
    picardia:   'Tomorrow Jules says something accurate enough that you will either act on it immediately or forward it to someone to prove her wrong.',
    picardiaES: 'Mañana Jules dice algo tan preciso que o actuarás de inmediato o se lo reenviarás a alguien para probar que está equivocada.',
  },
};

function getStageForDay(day: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (day <= 5)  return 1;
  if (day <= 10) return 2;
  if (day <= 17) return 3;
  if (day <= 25) return 4;
  if (day <= 29) return 5;
  return 6;
}

export function getArcStage(
  daysOfData: number,
  gender: 'female' | 'male' | 'nonbinary',
  picardiaMode: boolean
): ArcStage | null {
  if (daysOfData >= 30) return null;

  const day = daysOfData + 1; // 1-indexed for readability

  const teasers = gender === 'male' ? ARC_TEASERS_MALE : ARC_TEASERS_FEMALE;
  const entry = teasers[day];
  if (!entry) return null;

  const stage = getStageForDay(day);

  return {
    stage,
    imagePath: `arc_s${stage}.png`,
    imageUrl:  arcImg(`arc_s${stage}.png`),
    label:            ARC_STAGE_LABELS[stage].en,
    labelES:          ARC_STAGE_LABELS[stage].es,
    teaser:           picardiaMode ? entry.picardia   : entry.standard,
    teaserES:         picardiaMode ? entry.picardiaES : entry.standardES,
    teaserPicardia:   entry.picardia,
    teaserPicardiaES: entry.picardiaES,
  };
}
