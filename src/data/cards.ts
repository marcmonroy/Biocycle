export interface CardContent {
  headline: string;
  copy: string;
  science: string;
  share: string;
}

export interface CardData {
  id: string;
  gender: "female" | "male" | "both";
  phase: string;
  trigger: {
    cycleDay?: [number, number];
    hours?: [number, number];
    dayOfWeek?: number[];
    cortisol?: string;
  };
  gradient: string;
  accentColor: string;
  darkBg: string;
  badge: { en: string; es: string };
  scene: string;
  image?: string;
  visual: { en: string; es: string };
  clean: { en: CardContent; es: CardContent };
  picardia: { en: CardContent; es: CardContent };
  shareability: number;
  bannerFeeling?: { en: string; es: string };
}

export const CARDS: CardData[] = [
  {
    id: "female_ovulatory_peak",
    gender: "female",
    phase: "ovulatory",
    trigger: { cycleDay: [14, 16] },
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    accentColor: "#f59e0b",
    darkBg: "#1a0800",
    badge: { en: "⚡ PEAK POWER", es: "⚡ PODER MÁXIMO" },
    scene: "👩‍💼🕶️🌹🃏",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_01_ovulatory_peak.jpg",
    visual: {
      en: "Woman at poker table, business suit, rose between teeth, everyone else nervous",
      es: "Mujer en mesa de póker, traje de negocios, rosa entre los dientes, todos los demás nerviosos",
    },
    clean: {
      en: {
        headline: "She has entered the room.",
        copy: "Your testosterone and estrogen just threw a joint party in your brain. You are magnetic, fearless, and slightly dangerous.\n\nSchedule the negotiation. Take the meeting. Ask for the raise.\n\nBiology is doing the heavy lifting today.",
        science: "LH surge triggered ovulation. Estrogen at 100%, testosterone at 85%. Verbal fluency, confidence, and social magnetism are all at biological peak. This window lasts 48–72 hours.",
        share: "BioCycle says: she has entered the room. 🌹 Ovulatory peak — at maximum biological power.",
      },
      es: {
        headline: "Ella ha entrado al edificio.",
        copy: "Tu testosterona y tu estrógeno acaban de organizar una fiesta juntos en tu cerebro.\n\nEres magnética. Eres peligrosa. Eres imparable.\n\nAgenda la negociación. Pide el aumento. La biología está haciendo el trabajo sucio hoy.",
        science: "Pico de LH — ovulación activada. Estrógeno al 100%, testosterona al 85%. Fluidez verbal, confianza y magnetismo social en su máximo biológico. Esta ventana dura 48–72 horas.",
        share: "BioCycle avisa: ella ha entrado al edificio. 🌹 Pico ovulatorio — peligro biológico en circulación.",
      },
    },
    picardia: {
      en: {
        headline: "Warning: you are currently a biological hazard.",
        copy: "Estrogen at 100%. Testosterone at 85%. Libido has entered the chat.\n\nYour body is sending signals you did not consciously authorize. You will find people more attractive today. They will find you more attractive today.\n\nThis is not your imagination — it is your hormones doing exactly what evolution designed them to do.\n\nYou have approximately 48 hours of this.\n\nUse your powers wisely. Or don't. BioCycle doesn't judge.",
        science: "LH surge triggers ovulation. Peak estrogen and testosterone simultaneously elevate libido, confidence, and physical attractiveness cues. Studies show both men and women are rated as more attractive by others during ovulatory phase. Your body knows what it wants.",
        share: "BioCycle warned me: biological hazard in effect. 🌹 Ovulatory peak — my hormones are doing things I didn't authorize.",
      },
      es: {
        headline: "Advertencia: peligro biológico en circulación.",
        copy: "Estrógeno al 100%. Testosterona al 85%. La libido acaba de llegar sin avisar y sin vergüenza.\n\nTu cuerpo está mandando señales que tú no autorizaste conscientemente. Hoy vas a encontrar a las personas más atractivas de lo normal. Ellas te van a encontrar a ti más atractiva.\n\nEsto no es tu imaginación — son tus hormonas haciendo exactamente lo que la evolución diseñó.\n\nTienes aproximadamente 48 horas de esto.\n\nUsa tus poderes con sabiduría. O no. BioCycle no juzga.",
        science: "El pico de LH desencadena la ovulación. El estrógeno y la testosterona máximos elevan simultáneamente la libido, la confianza y las señales de atractivo físico. Estudios muestran que ambos géneros son calificados como más atractivos durante la fase ovulatoria.",
        share: "BioCycle me avisó: peligro biológico activado. 🌹 Pico ovulatorio — mis hormonas están haciendo cosas que no autoricé.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} is in full power mode today \u{1F339}", es: "{name} esta en modo poder total hoy \u{1F339}" },
  },
  {
    id: "female_luteal_pms",
    gender: "female",
    phase: "luteal",
    trigger: { cycleDay: [22, 28] },
    gradient: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
    accentColor: "#a78bfa",
    darkBg: "#0d0520",
    badge: { en: "⚠️ HANDLE WITH CARE", es: "⚠️ MANEJAR CON CUIDADO" },
    scene: "👸🍫🍟👑🚩",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_02_luteal_pms.jpg",
    visual: {
      en: "Woman on snack throne, crown tilted, exhausted queen energy, tiny white flag in background",
      es: "Mujer en trono de snacks, corona torcida, energía de reina exhausta, banderita blanca al fondo",
    },
    clean: {
      en: {
        headline: "Approach with snacks or do not approach at all.",
        copy: "Cortisol is high. Serotonin is low. You are not being dramatic — your brain chemistry is genuinely different today.\n\nHonor it. Cancel what can be cancelled. Eat the chocolate.\n\nIt is not a weakness. It is science.",
        science: "Late luteal phase. Progesterone dominates. Serotonin drops 30%. Cortisol reactivity increases. Emotional sensitivity is neurological, not personal. If this is severe and recurring, speak to a doctor about PMDD.",
        share: "BioCycle warned everyone: approach with snacks or do not approach at all. 👑 Luteal phase science.",
      },
      es: {
        headline: "El sistema no está caído. Está en mantenimiento de emergencia.",
        copy: "El cortisol está por las nubes. La serotonina se fue de vacaciones sin avisar.\n\nNo estás exagerando. Tu química cerebral es literalmente diferente hoy.\n\nCancela lo que puedas. Come el chocolate. El mundo puede esperar.",
        science: "Fase lútea tardía. La progesterona domina. La serotonina baja 30%. La reactividad al cortisol aumenta. La sensibilidad emocional es neurológica, no personal.",
        share: "BioCycle lo explica: sistema en mantenimiento de emergencia. 👑 Fase lútea — la ciencia lo confirma.",
      },
    },
    picardia: {
      en: {
        headline: "Intimacy is available. Prerequisites apply.",
        copy: "Here is the thing about this phase and desire: it is complicated.\n\nSome days the luteal phase makes you want absolutely nothing to do with anyone. Other days it makes you want comfort and closeness so intensely it surprises you.\n\nBoth are valid. Both are hormonal. Neither requires explanation.\n\nIf you want connection today: ask for exactly what you want. You are too hormonally honest right now to tolerate anything less.\n\nIf you want to be left alone: the snack throne is always available.",
        science: "Late luteal phase creates complex libido fluctuation. Progesterone can suppress sexual desire while simultaneously increasing need for physical comfort. Many women report heightened emotional need for intimacy without necessarily wanting sex. This is neurologically distinct from other phases.",
        share: "BioCycle explains why I'm simultaneously 'don't touch me' and 'hold me forever.' 👑 Luteal phase hormones are complicated.",
      },
      es: {
        headline: "La intimidad está disponible. Aplican requisitos previos.",
        copy: "La cosa con esta fase y el deseo es que es complicado.\n\nAlgunos días no quieres saber nada de nadie. Otros días quieres cercanía con una intensidad que te sorprende a ti misma.\n\nAmbos son válidos. Ambos son hormonales. Ninguno necesita explicación.\n\nSi hoy quieres conexión: pide exactamente lo que quieres. Estás demasiado hormonalmente honesta para tolerar nada menos.\n\nSi quieres que te dejen en paz: el trono de snacks siempre está disponible.",
        science: "La fase lútea tardía crea una fluctuación compleja de la libido. La progesterona puede suprimir el deseo sexual mientras simultáneamente aumenta la necesidad de confort físico.",
        share: "BioCycle explica por qué soy simultáneamente 'no me toques' y 'abrázame para siempre.' 👑 Hormonas lúteas: complicado.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} is in full queen mode today \u{1F451}", es: "{name} esta en modo reina total hoy \u{1F451}" },
  },
  {
    id: "female_follicular_rise",
    gender: "female",
    phase: "follicular",
    trigger: { cycleDay: [6, 13] },
    gradient: "linear-gradient(135deg, #059669 0%, #0891b2 100%)",
    accentColor: "#34d399",
    darkBg: "#021a12",
    badge: { en: "🌱 RISING", es: "🌱 SUBIENDO" },
    scene: "🏍️💨🌅",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_03_follicular_rise.jpg",
    visual: {
      en: "Woman on motorcycle at dawn, hair flying, empty road, expression of pure freedom",
      es: "Mujer en moto al amanecer, cabello al viento, carretera vacía, expresión de libertad pura",
    },
    clean: {
      en: {
        headline: "The fog has lifted. You have arrived.",
        copy: "Estrogen is climbing. Dopamine is rising. The version of you that starts things, says yes, and walks into rooms like she owns them — she's back.\n\nStart the project. Make the call. Begin.",
        science: "Follicular phase estrogen rise stimulates dopamine and serotonin production. Left and right brain hemispheres communicate optimally. This is the biological window for learning, risk-taking, and creative output.",
        share: "BioCycle: the fog has lifted. I have arrived. 🏍️ Follicular phase — dopamine rising.",
      },
      es: {
        headline: "La protagonista ha despertado.",
        copy: "El estrógeno está subiendo. La dopamina está subiendo. Tú estás subiendo.\n\nEsa versión tuya que empieza proyectos, que dice que sí, que aparece — está de vuelta.\n\nEmpieza. Llama. Aparece.",
        science: "La subida de estrógeno en fase folicular estimula producción de dopamina y serotonina. Los hemisferios cerebrales se comunican de manera óptima. Ventana biológica para aprender, crear y arriesgarse.",
        share: "BioCycle: la protagonista ha despertado. 🏍️ Fase folicular — dopamina subiendo, vamos.",
      },
    },
    picardia: {
      en: {
        headline: "Your body just remembered what it likes.",
        copy: "Rising estrogen does something interesting to desire: it makes it specific.\n\nThis is not the urgent wanting of ovulation. This is the beginning of wanting — the kind that starts as a thought, becomes a feeling, then becomes a decision.\n\nYou may find yourself thinking about someone with unusual clarity.\n\nOr thinking about yourself with unusual appreciation.\n\nBoth are the follicular phase doing exactly what it does.\n\nFollow the thread. See where it goes.",
        science: "Rising estrogen in the follicular phase increases dopamine sensitivity and sexual receptivity. This is the biological beginning of the desire arc that peaks at ovulation. Libido is building — not yet at peak but becoming increasingly specific and intentional.",
        share: "BioCycle: my body just remembered what it likes. 🏍️ Follicular phase — desire getting specific.",
      },
      es: {
        headline: "Tu cuerpo acaba de recordar lo que le gusta.",
        copy: "El estrógeno en subida hace algo interesante con el deseo: lo vuelve específico.\n\nNo es el querer urgente de la ovulación. Es el comienzo del querer — el que empieza como un pensamiento, se convierte en un sentimiento, y luego en una decisión.\n\nPuedes encontrarte pensando en alguien con una claridad inusual.\n\nO pensando en ti misma con una apreciación inusual.\n\nSigue el hilo. A ver dónde lleva.",
        science: "El estrógeno en subida en la fase folicular aumenta la sensibilidad a la dopamina y la receptividad sexual. Es el comienzo biológico del arco del deseo que alcanza su pico en la ovulación.",
        share: "BioCycle: mi cuerpo acaba de recordar lo que le gusta. 🏍️ Fase folicular — el deseo se está volviendo específico.",
      },
    },
    shareability: 4,
    bannerFeeling: { en: "{name} is unstoppable today \u{1F3CD}\u{FE0F}", es: "{name} es imparable hoy \u{1F3CD}\u{FE0F}" },
  },
  {
    id: "female_menstrual",
    gender: "female",
    phase: "menstrual",
    trigger: { cycleDay: [1, 5] },
    gradient: "linear-gradient(135deg, #be123c 0%, #9f1239 100%)",
    accentColor: "#fb7185",
    darkBg: "#1a0510",
    badge: { en: "🌑 RENEWING", es: "🌑 RENOVANDO" },
    scene: "🌙☁️🌸",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_04_menstrual_rest.jpg",
    visual: {
      en: "Woman on cloud blanket, red moons floating, no phone, pure being",
      es: "Mujer en cobija-nube, lunas rojas flotando, sin teléfono, siendo pura",
    },
    clean: {
      en: {
        headline: "She is unavailable. She is becoming.",
        copy: "Estrogen and progesterone are at their lowest. Your body is doing extraordinary work right now and asking for nothing except rest.\n\nThe world will still be there in four days.\n\nYou do not have to perform today.",
        science: "Day 1–5. Uterine lining sheds. Estrogen and progesterone at annual low. Right hemisphere dominance increases intuition and pattern recognition. Many artists report their deepest insights during menstruation.",
        share: "She is unavailable. She is becoming. 🌙 BioCycle: rest is not laziness, it's biology.",
      },
      es: {
        headline: "No está disponible. Está en proceso de transformación. Por favor no interrumpir.",
        copy: "El estrógeno y la progesterona están en su punto más bajo del año. Tu cuerpo está haciendo trabajo extraordinario y solo pide una cosa: que lo dejes.\n\nEl mundo seguirá existiendo en cuatro días.\n\nDescansa sin disculparte.",
        science: "Días 1–5. El endometrio se renueva. Estrógeno y progesterona en mínimo anual. Predominio del hemisferio derecho — intuición y reconocimiento de patrones aumentan.",
        share: "BioCycle confirma: no está disponible. Está en transformación. 🌙 La ciencia del descanso sin culpa.",
      },
    },
    picardia: {
      en: {
        headline: "Desire is resting. It will be back. Stronger.",
        copy: "Low estrogen and progesterone means libido is quieter right now — and that is completely normal.\n\nThis is not a problem to solve. This is the beginning of a cycle that will peak in ten days with energy and desire you have forgotten exist.\n\nThe wanting always comes back.\n\nFor now: rest. Your body is building the foundation.\n\nSome women experience heightened sensitivity during menstruation that makes intimacy surprisingly good on certain days. Your body knows. Ask it.",
        science: "Menstrual phase libido varies widely. Low estrogen typically reduces desire but increased blood flow and pelvic sensitivity can paradoxically heighten physical pleasure for some women. Individual variation is enormous. Self-observation is the only reliable guide.",
        share: "BioCycle: desire is resting. It will be back stronger. 🌙 Building the foundation for everything that follows.",
      },
      es: {
        headline: "El deseo está descansando. Vuelve. Más fuerte.",
        copy: "El estrógeno y la progesterona bajos significan que la libido está más silenciosa ahora mismo — y eso es completamente normal.\n\nEsto no es un problema. Es el comienzo de un ciclo que va a llegar a su pico en diez días con deseo que has olvidado que existe.\n\nEl querer regresa. Siempre regresa.\n\nAlgunas mujeres experimentan una sensibilidad heightened durante la menstruación que hace la intimidad sorprendentemente buena ciertos días. Tu cuerpo sabe. Pregúntale.",
        science: "La libido en la fase menstrual varía enormemente. El estrógeno bajo típicamente reduce el deseo pero el aumento de flujo sanguíneo pélvico puede paradójicamente heighten el placer físico en algunas mujeres.",
        share: "BioCycle: el deseo está descansando. Vuelve más fuerte. 🌙 Construyendo los cimientos de todo lo que viene.",
      },
    },
    shareability: 4,
    bannerFeeling: { en: "{name} is becoming today \u{1F319}", es: "{name} se esta transformando hoy \u{1F319}" },
  },
  {
    id: "female_luteal_impulse",
    gender: "female",
    phase: "luteal",
    trigger: { cycleDay: [19, 23] },
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    accentColor: "#38bdf8",
    darkBg: "#020d1a",
    badge: { en: "💳 DANGER ZONE", es: "💳 ZONA DE PELIGRO" },
    scene: "🪞🛍️😳",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_05_shopping_impulse.jpg",
    visual: {
      en: "Woman outside shop, reflection holds 17 bags, real hands hold zero, BioCycle logo reads: We warned you",
      es: "Mujer frente a tienda, reflejo con 17 bolsas, manos reales vacías, logo BioCycle: Te lo dijimos",
    },
    clean: {
      en: {
        headline: "Step away from the checkout.",
        copy: "Testosterone just dropped. Dopamine is chasing compensation. Your brain is about to convince you that you need those boots, that gadget, that thing you will return in eleven days.\n\nWait 48 hours. BioCycle sees you.",
        science: "Late luteal testosterone decline triggers dopamine-seeking behavior. Impulsive purchasing increases measurably during this window. The urge is real. The need is not.",
        share: "BioCycle caught me at the checkout. 🛍️ Testosterone drop = dopamine chase.",
      },
      es: {
        headline: "Para. Respira. Cierra la app. Nosotros vimos todo.",
        copy: "La testosterona acaba de bajar. La dopamina está buscando compensación con urgencia.\n\nTu cerebro cree genuinamente que necesitas esas botas, ese gadget, esa cosa que vas a devolver en doce días.\n\nEspera 48 horas. BioCycle te vio.",
        science: "La bajada de testosterona en fase lútea tardía activa comportamiento de búsqueda de dopamina. Las compras impulsivas aumentan de forma medible en esta ventana.",
        share: "BioCycle me atrapó con 17 cosas en el carrito. 🛍️ Testosterona baja = dopamina busca compensación.",
      },
    },
    picardia: {
      en: {
        headline: "Step away from the checkout. And the phone.",
        copy: "Testosterone just dropped. Dopamine wants it back and does not care how it gets it.\n\nThis is why you are simultaneously considering buying seventeen things you don't need AND texting someone whose name your future self knows better than to type.\n\nBoth urges are the same hormone looking for the same fix.\n\nThe shopping can wait 48 hours.\n\nThe text can wait 48 hours.\n\nBioCycle sees you. Close both apps.",
        science: "Late luteal testosterone decline activates dopamine-seeking behavior across multiple reward pathways simultaneously — financial, social, and sexual. Impulsive purchases, risky social decisions, and intensified attraction to unavailable partners all increase measurably in this window.",
        share: "BioCycle stopped me from shopping AND texting someone I shouldn't. 🛍️📱 Same hormone, same bad idea.",
      },
      es: {
        headline: "Aléjate del carrito. Y del teléfono.",
        copy: "La testosterona acaba de bajar. La dopamina la quiere de vuelta y no le importa cómo conseguirla.\n\nPor eso estás considerando simultáneamente comprar diecisiete cosas que no necesitas Y escribirle a alguien cuyo nombre tu yo del futuro sabe que no debería teclear.\n\nAmbos impulsos son la misma hormona buscando el mismo alivio.\n\nLas compras pueden esperar 48 horas.\n\nEl mensaje puede esperar 48 horas.\n\nBioCycle te vio. Cierra las dos apps.",
        science: "La bajada de testosterona lútea activa comportamiento de búsqueda de dopamina en múltiples vías de recompensa simultáneamente — financiera, social y sexual.",
        share: "BioCycle me paró de comprar Y de escribirle a alguien que no debía. 🛍️📱 Misma hormona, misma mala idea.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} step away from the checkout today \u{1F6CD}\u{FE0F}", es: "{name} alejate del carrito hoy \u{1F6CD}\u{FE0F}" },
  },
  {
    id: "male_morning_peak",
    gender: "male",
    phase: "morning_peak",
    trigger: { hours: [5, 10] },
    gradient: "linear-gradient(135deg, #f97316 0%, #eab308 100%)",
    accentColor: "#f97316",
    darkBg: "#1a0800",
    badge: { en: "⚡ MORNING PEAK", es: "⚡ PICO MATUTINO" },
    scene: "🐓⛰️🌅",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_06_morning_testosterone.jpg",
    visual: {
      en: "Rooster on mountain at sunrise, tiny sunglasses, everyone below still asleep",
      es: "Gallo en montaña al amanecer, lentes de sol pequeños, todos abajo todavía dormidos",
    },
    clean: {
      en: {
        headline: "He does not know why he is like this before 9am. Biology does.",
        copy: "Testosterone is 30% higher than it will be by 6pm. Your brain is sharp, your body is ready.\n\nDo the hard thing now. It will never be easier than this morning.",
        science: "Male testosterone peaks between 05:30–10:00h. This window produces peak cognitive performance, physical strength, and decision confidence. The same task at 4pm requires measurably more effort.",
        share: "BioCycle: he does not know why he's like this before 9am. Biology does. 🐓",
      },
      es: {
        headline: "No sabe por qué amanece así de seguro. La biología sí sabe.",
        copy: "La testosterona está un 30% más alta que a las 6pm. Tu cerebro está afilado, tu cuerpo está listo.\n\nHaz lo difícil ahora. Esta versión tuya tiene fecha de vencimiento: mediodía.",
        science: "La testosterona masculina alcanza su pico entre las 05:30 y las 10:00h. Esta ventana produce rendimiento cognitivo, fuerza física y confianza en decisiones en su máximo diario.",
        share: "BioCycle explica por qué amanezco así de seguro. 🐓 Testosterona matutina — es biología, no ego.",
      },
    },
    picardia: {
      en: {
        headline: "Good morning. That's testosterone. You have options.",
        copy: "Morning testosterone peak is responsible for two things simultaneously: your best cognitive performance of the day and something else you have definitely already noticed.\n\nBoth are the same hormone. Both are at their daily maximum right now.\n\nThe science says: use the cognitive window for demanding work.\n\nThe biology says: you have approximately 90 minutes before the peak begins to decline.\n\nBioCycle says: you are an adult and capable of deciding which window to use first.\n\nEither way — good morning.",
        science: "Morning testosterone drives both cognitive sharpness and libido simultaneously. Peak testosterone at 7–9am correlates with highest reported sexual desire of the day in men. The cognitive and physical peak are the same biological event.",
        share: "BioCycle's morning notification: that's testosterone. You have options. ☀️ Peak cognitive AND peak libido simultaneously.",
      },
      es: {
        headline: "Buenos días. Eso es testosterona. Tienes opciones.",
        copy: "El pico matutino de testosterona es responsable de dos cosas simultáneamente: tu mejor rendimiento cognitivo del día y algo más que definitivamente ya notaste.\n\nAmbas son la misma hormona. Ambas están en su máximo diario ahora mismo.\n\nLa ciencia dice: usa la ventana cognitiva para el trabajo exigente.\n\nLa biología dice: tienes aproximadamente 90 minutos antes de que el pico empiece a bajar.\n\nBioCycle dice: eres adulto y puedes decidir qué ventana usar primero.\n\nDe cualquier manera — buenos días.",
        science: "La testosterona matutina impulsa simultáneamente la agudeza cognitiva y la libido. El pico de testosterona a las 7–9am correlaciona con el mayor deseo sexual reportado del día en hombres.",
        share: "Notificación matutina de BioCycle: eso es testosterona. Tienes opciones. ☀️ Pico cognitivo Y pico de libido simultáneamente.",
      },
    },
    shareability: 4,
    bannerFeeling: { en: "{name} owns the morning today \u{1F413}", es: "{name} es dueno de la manana hoy \u{1F413}" },
  },
  {
    id: "male_tuesday_peak",
    gender: "male",
    phase: "weekly_peak",
    trigger: { dayOfWeek: [2, 3] },
    gradient: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)",
    accentColor: "#818cf8",
    darkBg: "#080520",
    badge: { en: "📅 TUESDAY MAGIC", es: "📅 MAGIA DEL MARTES" },
    scene: "🧑‍💼✨🙇",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_07_tuesday_peak.jpg",
    visual: {
      en: "Man in ordinary office, golden glow, small creatures bowing. Caption: It is Tuesday.",
      es: "Hombre en oficina ordinaria, aura dorada, todos mirándolo. Cartel: Es martes.",
    },
    clean: {
      en: {
        headline: "Nobody knows why Tuesdays feel different. You do now.",
        copy: "Weekly testosterone rhythm peaks Tuesday through Wednesday. You are statistically more confident, more persuasive, and more physically capable.\n\nUse it or lose it — by Friday the window closes.",
        science: "Male testosterone follows a weekly rhythm. Tuesday–Wednesday represents the weekly peak. Schedule important meetings, difficult conversations, and demanding workouts accordingly.",
        share: "BioCycle reveals the secret of Tuesdays. ✨ Weekly testosterone rhythm — not coincidence, biology.",
      },
      es: {
        headline: "Nadie entiende por qué los martes se siente diferente. Ahora tú sí.",
        copy: "El ritmo semanal de testosterona alcanza su pico los martes y miércoles. Eres estadísticamente más convincente y más difícil de ignorar.\n\nEl viernes esta ventana se cierra. Úsala.",
        science: "La testosterona masculina sigue un ritmo semanal observado en investigaciones atléticas y conductuales. El martes y el miércoles representan el pico semanal.",
        share: "BioCycle revela el secreto de los martes. ✨ Ritmo semanal de testosterona — no es coincidencia, es biología.",
      },
    },
    picardia: {
      en: {
        headline: "It's Tuesday. Your partner noticed before you did.",
        copy: "Weekly testosterone peak does something beyond confidence: it makes you more physically magnetic.\n\nElevated testosterone increases attractiveness signals — posture, voice depth, eye contact, presence. Your Tuesday self is genuinely different from your Sunday self.\n\nYour partner has already picked up on this biologically even if neither of you can name it.\n\nUse Tuesday for the negotiation. The gym. The conversation you have been avoiding.\n\nAnd if the evening goes well — that is also Tuesday's gift.",
        science: "Weekly testosterone rhythm peaks Tuesday–Wednesday. Elevated testosterone increases physical attractiveness cues including vocal frequency, posture, and pheromone expression. Partners show measurable hormonal synchronization responses to each other's cycle peaks.",
        share: "BioCycle: it's Tuesday and my partner noticed before I did. ✨ Weekly testosterone affects more than just confidence.",
      },
      es: {
        headline: "Es martes. Tu pareja lo notó antes que tú.",
        copy: "El pico semanal de testosterona hace algo más allá de la confianza: te hace más magnético físicamente.\n\nLa testosterona elevada aumenta señales de atractivo — postura, profundidad de voz, contacto visual, presencia. Tu yo del martes es genuinamente diferente a tu yo del domingo.\n\nTu pareja ya captó esto biológicamente aunque ninguno pueda nombrarlo.\n\nUsa el martes para la negociación. El gimnasio. La conversación difícil.\n\nY si la noche va bien — ese también es el regalo del martes.",
        science: "El pico semanal de testosterona aumenta señales de atractivo físico incluyendo frecuencia vocal, postura y expresión de feromonas. Las parejas muestran sincronización hormonal medible.",
        share: "BioCycle: es martes y mi pareja lo notó antes que yo. ✨ La testosterona semanal afecta más que la confianza.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} is magnetic today \u{2728}", es: "{name} es magnetico hoy \u{2728}" },
  },
  {
    id: "male_afternoon_dip",
    gender: "male",
    phase: "midday_dip",
    trigger: { hours: [13, 15] },
    gradient: "linear-gradient(135deg, #0891b2 0%, #0e7490 100%)",
    accentColor: "#22d3ee",
    darkBg: "#020d14",
    badge: { en: "😴 BIOLOGICALLY CORRECT", es: "😴 BIOLÓGICAMENTE CORRECTO" },
    scene: "🧑‍💼😴☕",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_08_afternoon_dip.jpg",
    visual: {
      en: "Man in suit asleep upright at desk, coffee in hand, colleagues work normally. Sign: Technical siesta.",
      es: "Hombre en traje dormido recto en escritorio, café en mano, colegas trabajan normal. Cartel: Siesta técnica.",
    },
    clean: {
      en: {
        headline: "He is not lazy. He is Mediterranean.",
        copy: "Cortisol just hit its daily valley. Your ancestors built entire cultures around sleeping at this exact hour.\n\nYou are not underperforming. You are fighting ten thousand years of biology with a fluorescent light and a deadline.",
        science: "Post-lunch cortisol trough is universal across all human populations. Cognitive performance and decision quality decline measurably between 1–3pm. A 20-minute nap improves afternoon performance by up to 34%.",
        share: "BioCycle absolves me: not lazy, my cortisol read the manual. 😴 Post-lunch dip is universal human biology.",
      },
      es: {
        headline: "No es flojo. Es que su cortisol leyó el manual.",
        copy: "El cortisol acaba de llegar a su valle diario. Tus ancestros construyeron culturas enteras alrededor de dormir exactamente en esta hora.\n\nNo estás rindiendo menos. Estás peleando contra diez mil años de biología con una pantalla y un deadline.",
        science: "El bajón de cortisol post-almuerzo es universal en todas las poblaciones humanas. El rendimiento cognitivo y la calidad de decisiones disminuyen entre la 1 y las 3pm. Una siesta de 20 minutos mejora el rendimiento de la tarde hasta un 34%.",
        share: "BioCycle me absuelve: no soy flojo, mi cortisol leyó el manual. 😴 El bajón post-almuerzo es biología universal.",
      },
    },
    picardia: {
      en: {
        headline: "His cortisol crashed. His dreams did not.",
        copy: "Post-lunch cortisol trough drops cognitive performance, decision quality, and motivation.\n\nWhat does not drop: the creative, wandering, slightly warm quality of thought that happens when the executive brain finally relaxes its grip.\n\nIf you have a private space and twenty minutes: both the nap and what you dream about have merit.\n\nBioCycle recommends the nap. What happens in the dream bubble is your business.",
        science: "Post-lunch cortisol trough correlates with reduced prefrontal cortex activity and increased default mode network activation — the brain state associated with creativity, daydreaming, and associative thinking. Some researchers suggest this window is optimal for non-linear creative problems.",
        share: "BioCycle: his cortisol crashed. His dreams did not. 😴 The afternoon dip is also a creative window.",
      },
      es: {
        headline: "Su cortisol se cayó. Sus sueños no.",
        copy: "El bajón de cortisol post-almuerzo baja el rendimiento cognitivo, la calidad de decisiones y la motivación.\n\nLo que no baja: la calidad creativa y ligeramente cálida del pensamiento que ocurre cuando el cerebro ejecutivo finalmente relaja su control.\n\nSi tienes un espacio privado y veinte minutos: tanto la siesta como lo que sueñas tienen mérito.\n\nBioCycle recomienda la siesta. Lo que pasa en la burbuja de sueño es asunto tuyo.",
        science: "El bajón de cortisol post-almuerzo correlaciona con reducción de actividad del córtex prefrontal y aumento de la red de modo predeterminado — el estado cerebral asociado con creatividad y pensamiento asociativo.",
        share: "BioCycle: su cortisol se cayó. Sus sueños no. 😴 El bajón de la tarde también es una ventana creativa.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} is biologically correct today \u{1F634}", es: "{name} es biologicamente correcto hoy \u{1F634}" },
  },
  {
    id: "male_evening_rest",
    gender: "male",
    phase: "evening_wind",
    trigger: { hours: [20, 24] },
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    accentColor: "#94a3b8",
    darkBg: "#050a14",
    badge: { en: "🌙 RECOVERY MODE", es: "🌙 MODO RECUPERACIÓN" },
    scene: "🛋️📺🐕",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_09_evening_rest.jpg",
    visual: {
      en: "Man on couch, dog on lap, TV on, phone face down, stars outside. Text: peak has passed.",
      es: "Hombre en sofá, perro encima, TV prendida, teléfono boca abajo, estrellas afuera. Texto: el pico ya pasó.",
    },
    clean: {
      en: {
        headline: "The lion rests.",
        copy: "Testosterone is at its daily low. Melatonin is rising. This is not failure — this is biology completing its daily cycle.\n\nThe most productive thing you can do right now is protect your sleep.\n\nTomorrow's peak depends on tonight's rest.",
        science: "Evening testosterone is 30–40% lower than morning peak. Poor sleep reduces next-day testosterone by up to 15% per night. One week of poor sleep can reduce testosterone to levels seen in men 10 years older.",
        share: "BioCycle confirms: the lion rests. 🦁 Protecting sleep IS the performance strategy.",
      },
      es: {
        headline: "El león descansa. Mañana vuelve a rugir.",
        copy: "La testosterona está en su punto más bajo del día. La melatonina está subiendo. Esto no es derrota — es el ciclo completándose.\n\nLo más productivo que puedes hacer ahora mismo es proteger tu sueño.\n\nEl pico de mañana depende del descanso de esta noche.",
        science: "La testosterona nocturna es 30–40% menor que el pico matutino. Un sueño deficiente reduce la testosterona del día siguiente hasta 15% por noche. Una semana de mal sueño puede reducir la testosterona a niveles de un hombre 10 años mayor.",
        share: "BioCycle lo confirma: el león descansa. 🦁 Proteger el sueño ES la estrategia de rendimiento.",
      },
    },
    picardia: {
      en: {
        headline: "He noticed. He's just on a schedule.",
        copy: "Evening testosterone is 30–40% lower than morning peak. This is why the same stimulus that would have produced immediate enthusiastic interest at 8am produces a warmer, slower, more romantic response at 9pm.\n\nThis is not less desire. It is different desire.\n\nEvening hormones create conditions for intimacy that does not rush — for closeness that is about connection more than performance.\n\nThe morning is for the rooster energy.\n\nThe evening is for something quieter and often better.",
        science: "Evening testosterone decline reduces performance-oriented sexual drive while melatonin and oxytocin begin rising. This combination actually favors bonding-oriented intimacy. Many couples report deeper connection in evenings precisely because the urgency of morning testosterone has passed.",
        share: "BioCycle explains everything: he noticed, he's just on a biological schedule. 🦁 Evening hormones favor connection over performance.",
      },
      es: {
        headline: "Lo notó. Solo está en su horario biológico.",
        copy: "La testosterona nocturna es 30–40% menor que el pico matutino. Por eso el mismo estímulo que a las 8am habría producido una respuesta inmediata y entusiasta produce a las 9pm una respuesta más cálida, más lenta, más romántica.\n\nEsto no es menos deseo. Es deseo diferente.\n\nLas hormonas nocturnas crean condiciones para la intimidad que no tiene prisa.\n\nLa mañana es para la energía del gallo.\n\nLa noche es para algo más silencioso y frecuentemente mejor.",
        science: "La bajada de testosterona nocturna reduce el impulso sexual orientado al rendimiento mientras la melatonina y la oxitocina comienzan a subir. Esta combinación favorece la intimidad orientada al vínculo.",
        share: "BioCycle explica todo: lo notó, solo está en su horario biológico. 🦁 Las hormonas nocturnas favorecen la conexión sobre el rendimiento.",
      },
    },
    shareability: 4,
    bannerFeeling: { en: "{name} is recharging today \u{1F981}", es: "{name} se esta recargando hoy \u{1F981}" },
  },
  {
    id: "both_cortisol_spike",
    gender: "both",
    phase: "stress",
    trigger: { cortisol: "high" },
    gradient: "linear-gradient(135deg, #dc2626 0%, #7c3aed 100%)",
    accentColor: "#f87171",
    darkBg: "#1a0505",
    badge: { en: "🌪️ RIDE THE STORM", es: "🌪️ CABALGA LA TORMENTA" },
    scene: "🧘🌪️☕",
    image: "https://raw.githubusercontent.com/marcmonroy/Biocycle/main/card_10_cortisol_tornado.jpg",
    visual: {
      en: "Person calm in tornado eye, tea in hand. Flying furniture, chaos. Expression: mildly inconvenienced.",
      es: "Persona serena en ojo del tornado, café en mano. Muebles volando, caos. Expresión: levemente molesta.",
    },
    clean: {
      en: {
        headline: "Your cortisol is loud today. You are louder.",
        copy: "Your biology detected a threat — real or imagined — and sent cortisol to handle it.\n\nThat is not weakness. That is your body doing its job.\n\nThe question is whether the threat is real. Most days, it is not.\n\n4 counts in. 8 out. Cortisol drops in 90 seconds.",
        science: "Cortisol elevation triggers fight-or-flight. Sustained cortisol suppresses immune function and impairs prefrontal cortex activity. Slow exhale breathing (4 in, 8 out) reduces cortisol within 90 seconds.",
        share: "BioCycle: your cortisol is loud today. You are louder. 🌪️ The storm is biology. The calm is a choice.",
      },
      es: {
        headline: "Tu cortisol está hablando muy alto hoy. Tú hablas más alto.",
        copy: "Tu biología detectó una amenaza — real o imaginaria — y mandó cortisol a resolverla.\n\nEso no es debilidad. Es tu cuerpo haciendo su trabajo.\n\nLa pregunta es si la amenaza es real. La mayoría de los días no lo es.\n\n4 tiempos adentro. 8 afuera. El cortisol baja en 90 segundos.",
        science: "La elevación de cortisol activa la respuesta de lucha o huida. El cortisol sostenido suprime la función inmune y reduce la actividad del córtex prefrontal. La respiración con exhalación prolongada reduce el cortisol en 90 segundos.",
        share: "BioCycle: tu cortisol está hablando muy alto. Tú hablas más alto. 🌪️ La tormenta es biología. La calma es una decisión.",
      },
    },
    picardia: {
      en: {
        headline: "Stress and desire are using the same chemical. This explains so much.",
        copy: "Here is something nobody tells you: cortisol and adrenaline — the stress hormones — activate the same neural pathways as attraction and excitement.\n\nThis is why you find people more attractive when stressed. Why arguments sometimes end in unexpected places. Why danger feels like chemistry.\n\nToday, with cortisol elevated, you may feel more attracted to people than usual, more sensitive to touch, more aware of bodies in rooms.\n\nThat is real. And worth knowing before you make any decisions.\n\n4 counts in. 8 out. Give your nervous system a chance to tell the difference.",
        science: "Cortisol and adrenaline activate the sympathetic nervous system identically to early-stage attraction. Misattribution of arousal — a well-documented psychological phenomenon — causes people to interpret stress-induced physiological arousal as romantic or sexual interest.",
        share: "BioCycle just explained why stress and attraction feel the same. 🌪️ Cortisol and desire: same chemical, different story.",
      },
      es: {
        headline: "El estrés y el deseo usan el mismo químico. Esto explica tanto.",
        copy: "Hay algo que nadie te dice: el cortisol y la adrenalina activan los mismos caminos neuronales que la atracción y la excitación.\n\nPor eso encuentras a las personas más atractivas cuando estás estresado. Por eso las discusiones a veces terminan en lugares inesperados. Por eso el peligro se siente como química.\n\nHoy, con el cortisol elevado, puedes sentirte más atraído a personas de lo usual, más sensible al tacto.\n\nEso es real. Y vale saber antes de tomar decisiones.\n\n4 tiempos adentro. 8 afuera. Dale a tu sistema nervioso la oportunidad de distinguir la diferencia.",
        science: "El cortisol y la adrenalina activan el sistema nervioso simpático de manera idéntica a la atracción en etapa temprana. La atribución errónea de la excitación — fenómeno psicológico bien documentado — causa que las personas interpreten la excitación fisiológica inducida por estrés como interés romántico o sexual.",
        share: "BioCycle explica por qué el estrés y la atracción se sienten igual. 🌪️ Cortisol y deseo: mismo químico, diferente historia.",
      },
    },
    shareability: 5,
    bannerFeeling: { en: "{name} is riding the storm today \u{1F32A}\u{FE0F}", es: "{name} esta cabalgando la tormenta hoy \u{1F32A}\u{FE0F}" },
  },
];
